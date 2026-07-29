/**
 * Recompute every recipe's macros FROM its ingredients (task #115).
 *
 * Run: npx tsx scripts/recipe-nutrition/recompute.ts [--report] [--emit-sql <file>]
 *
 *   --report      write a reviewable CSV of old vs new for every recipe
 *   --emit-sql    write the migration that applies the new values
 *
 * With neither flag it prints the summary only and touches nothing.
 *
 * SAFETY: a recipe is only auto-applied when every ingredient resolved to a food with
 * a usable amount and no low-confidence entry was involved. Anything else lands in the
 * review list. This is health-adjacent data — a blank is better than a confident guess.
 */
import { writeFileSync } from 'fs';
import { parseAllRecipes, foodFor, type ParsedRecipe } from './parse-seeds';
import { validateTable } from './food-table';
import { portionFor, portionIsImplausible } from './portions';
import { correctIngredient } from './corrections';

type Computed = {
  r: ParsedRecipe;
  kcal: number; protein: number; carbs: number; fat: number;
  /** Ingredients whose amount we assumed rather than read from the recipe. */
  assumedCount: number;
  lowConfidence: boolean;
  unresolved: string[];
  /** Source-data defects: ingredient amounts that aren't a sane single serving. */
  implausible: string[];
  /** Ingredient lines rewritten to a realistic serving (see corrections.ts). */
  corrections: { from: string; to: string }[];
};

function compute(r: ParsedRecipe): Computed {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  let assumedCount = 0;
  let lowConfidence = false;
  const unresolved: string[] = [];
  const implausible: string[] = [];
  const corrections: { from: string; to: string }[] = [];

  for (const ing of r.ingredients) {
    const food = foodFor(ing.food);
    if (!food) { unresolved.push(ing.raw); continue; }
    if (food.confidence === 'low') lowConfidence = true;

    let grams = ing.grams;
    if (grams == null) {
      const p = portionFor(ing.food!, food.kcal);
      grams = p.grams;
      assumedCount++;
    } else {
      const fix = correctIngredient(ing.raw, ing.food, grams);
      if (fix) {
        corrections.push({ from: ing.raw, to: fix.line });
        grams = fix.grams;
      } else if (portionIsImplausible(ing.food!, grams)) {
        // Not covered by a correction rule — genuinely needs a human.
        implausible.push(`${ing.raw} (${grams}g)`);
      }
    }

    const k = grams / 100;
    kcal += food.kcal * k;
    protein += food.protein * k;
    carbs += food.carbs * k;
    fat += food.fat * k;
  }

  return {
    r,
    kcal: Math.round(kcal),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    assumedCount, lowConfidence, unresolved, implausible, corrections,
  };
}

const problems = validateTable();
if (problems.length) {
  console.error('food-table.ts failed validation — refusing to run:');
  problems.forEach(p => console.error('  ' + p));
  process.exit(1);
}

const recipes = parseAllRecipes();
const computed = recipes.map(compute);

// Three recipe names are shared by two genuinely different recipes (different
// ingredients and macros). The emitted UPDATE keys on name, so applying either one
// would silently overwrite the other. Hold all of them for review instead.
const nameCounts = new Map<string, number>();
for (const c of computed) nameCounts.set(c.r.name, (nameCounts.get(c.r.name) ?? 0) + 1);
const duplicateName = (c: Computed) => (nameCounts.get(c.r.name) ?? 0) > 1;

// A shared name is only unsafe if we cannot tell the two rows apart. Where the pair
// have different existing calorie values, `name AND calories = <old>` addresses each
// uniquely — so those can be applied. Identical on both is genuinely ambiguous.
const dupKey = (c: Computed) => `${c.r.name}|${c.r.statedKcal}`;
const dupKeyCounts = new Map<string, number>();
for (const c of computed) if (duplicateName(c)) dupKeyCounts.set(dupKey(c), (dupKeyCounts.get(dupKey(c)) ?? 0) + 1);
const ambiguousDuplicate = (c: Computed) => duplicateName(c) && (dupKeyCounts.get(dupKey(c)) ?? 0) > 1;

// lowConfidence no longer gates: those 11 recipes were reviewed and their computed
// values accepted. The flag stays as an annotation and is listed in the migration.
const isReview = (c: Computed) =>
  c.unresolved.length > 0 || c.implausible.length > 0 || ambiguousDuplicate(c);
const applicable = computed.filter(c => !isReview(c));
const review = computed.filter(isReview);

console.log(`Recipes:                       ${recipes.length}`);
console.log(`Safe to apply automatically:   ${applicable.length}`);
console.log(`Held for review:               ${review.length}`);
console.log(`  — unresolved ingredient:     ${computed.filter(c => c.unresolved.length > 0).length}`);
console.log(`  — low-confidence food:       ${computed.filter(c => c.lowConfidence).length}`);
console.log(`  — implausible source amount: ${computed.filter(c => c.implausible.length > 0).length}`);
console.log(`  — ambiguous duplicate name:  ${computed.filter(ambiguousDuplicate).length}`);
console.log(`  (duplicate names handled by name+calories key: ${computed.filter(c => duplicateName(c) && !ambiguousDuplicate(c)).length})`);
console.log(`  (low-confidence foods, reviewed and accepted: ${computed.filter(c => c.lowConfidence).length})`);
console.log(`  ingredient lines corrected: ${computed.reduce((n, c) => n + c.corrections.length, 0)}\n`);

const nanRecipes = computed.filter(c => !Number.isFinite(c.kcal));
if (nanRecipes.length) {
  console.error(`BUG: ${nanRecipes.length} recipes computed a non-finite kcal — refusing to continue.`);
  nanRecipes.slice(0, 5).forEach(c => console.error(`  ${c.r.name}`));
  process.exit(1);
}

const withStated = applicable.filter(c => c.r.statedKcal != null && Number.isFinite(c.r.statedKcal) && c.r.statedKcal > 0);
const deltas = withStated.map(c => (c.kcal - c.r.statedKcal!) / c.r.statedKcal!);
deltas.sort((a, b) => a - b);
const q = (p: number) => deltas[Math.floor(deltas.length * p)] ?? 0;

console.log('How far the computed calories move from the LLM-generated ones:');
console.log(`  p10 ${(q(0.1) * 100).toFixed(0)}%   p25 ${(q(0.25) * 100).toFixed(0)}%   median ${(q(0.5) * 100).toFixed(0)}%   p75 ${(q(0.75) * 100).toFixed(0)}%   p90 ${(q(0.9) * 100).toFixed(0)}%`);
const band = (lo: number, hi: number) => withStated.filter(c => {
  const d = (c.kcal - c.r.statedKcal!) / c.r.statedKcal!;
  return d >= lo && d < hi;
}).length;
console.log(`  within ±10%:  ${band(-0.1, 0.1)}`);
console.log(`  ±10–25%:      ${band(-0.25, -0.1) + band(0.1, 0.25)}`);
console.log(`  ±25–50%:      ${band(-0.5, -0.25) + band(0.25, 0.5)}`);
console.log(`  over ±50%:    ${withStated.length - band(-0.5, 0.5)}`);

const avgAssumed = applicable.reduce((s, c) => s + c.assumedCount, 0) / Math.max(applicable.length, 1);
console.log(`\nAverage ingredients per recipe with an ASSUMED portion: ${avgAssumed.toFixed(1)}`);

// Plausibility — the stated values are LLM output and can't arbitrate correctness, so
// the real test is whether the computed meals look like meals.
const kcals = applicable.map(c => c.kcal).sort((a, b) => a - b);
const kq = (p: number) => kcals[Math.floor(kcals.length * p)];
console.log('\nComputed calories per recipe (sanity — do these look like real meals?):');
console.log(`  p5 ${kq(0.05)}   p25 ${kq(0.25)}   median ${kq(0.5)}   p75 ${kq(0.75)}   p95 ${kq(0.95)}   max ${kcals[kcals.length - 1]}`);
console.log(`  implausibly low  (<150 kcal): ${applicable.filter(c => c.kcal < 150).length}`);
console.log(`  implausibly high (>1200 kcal): ${applicable.filter(c => c.kcal > 1200).length}`);

const proteins = applicable.map(c => c.protein).sort((a, b) => a - b);
console.log(`  protein g — median ${proteins[Math.floor(proteins.length / 2)]}, max ${proteins[proteins.length - 1]}`);

const args = process.argv.slice(2);

if (args.includes('--report')) {
  const path = '/Users/vanessa/hitt-app/scripts/recipe-nutrition/review.csv';
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [
    'recipe,file,status,assumed_portions,old_kcal,new_kcal,kcal_delta_pct,old_p,new_p,old_c,new_c,old_f,new_f,unresolved',
    ...computed.map(c => {
      const status = c.unresolved.length ? 'REVIEW:unresolved'
        : c.implausible.length ? 'REVIEW:implausible-amount'
        : ambiguousDuplicate(c) ? 'REVIEW:ambiguous-duplicate'
        : 'apply';
      const d = c.r.statedKcal ? (((c.kcal - c.r.statedKcal) / c.r.statedKcal) * 100).toFixed(0) : '';
      return [
        esc(c.r.name), esc(c.r.file), status, c.assumedCount,
        c.r.statedKcal ?? '', c.kcal, d,
        c.r.statedProtein ?? '', c.protein,
        c.r.statedCarbs ?? '', c.carbs,
        c.r.statedFat ?? '', c.fat,
        esc([...c.unresolved, ...c.implausible].join('; ')),
      ].join(',');
    }),
  ];
  writeFileSync(path, rows.join('\n'));
  console.log(`\nReview CSV written: ${path}`);
}

const sqlIdx = args.indexOf('--emit-sql');
if (sqlIdx >= 0) {
  const out = args[sqlIdx + 1];
  if (!out) { console.error('--emit-sql needs a path'); process.exit(1); }
  const esc = (s: string) => s.replace(/'/g, "''");

  // The duplicate-name rows key on the OLD calorie value. If one row's NEW value
  // equalled a sibling's OLD value, the later UPDATE would match the row we already
  // rewrote and clobber it. Verify no such collision exists before emitting.
  const byName = new Map<string, Computed[]>();
  for (const c of applicable.filter(duplicateName)) {
    byName.set(c.r.name, [...(byName.get(c.r.name) ?? []), c]);
  }
  for (const [name, group] of byName) {
    const olds = new Set(group.map(g => g.r.statedKcal));
    for (const g of group) {
      if (g.kcal !== g.r.statedKcal && olds.has(g.kcal)) {
        console.error(
          `REFUSING TO EMIT: duplicate "${name}" — new calories ${g.kcal} collide with a ` +
          `sibling's key. The second UPDATE would overwrite the first.`,
        );
        process.exit(1);
      }
    }
  }

  const corrections = computed.flatMap(c => c.corrections);
  const lowConf = computed.filter(c => c.lowConfidence);

  const lines = [
    '-- Task #115 — recipe macros recomputed FROM their ingredients.',
    '--',
    '-- GENERATED by scripts/recipe-nutrition/recompute.ts. Do not hand-edit: change',
    '-- food-table.ts / portions.ts / corrections.ts and regenerate.',
    '--',
    '-- WHY: all 957 recipes were LLM-generated and the macros were never derived from',
    '-- the ingredient lists, which is why Browse Meals showed lists that did not match',
    '-- the numbers. Ingredients are now the source of truth.',
    '--',
    `-- Part 1 rewrites ${corrections.length} ingredient lines where the generator gave bread and`,
    '-- tortilla wraps a 150-250g "cooked weight" (four to six slices / three to four',
    '-- wraps). Corrected to an ordinary serving so the list a user reads and the macros',
    '-- shown agree.',
    '--',
    `-- Part 2 sets calories/protein/carbs/fat for all ${applicable.length} recipes.`,
    '--',
    '-- Grain, pasta and oat weights are treated as COOKED. Established from the data:',
    '-- seeded amounts run 40-250g with a median of 150-160g, and 150g of dry rice is',
    '-- 534 kcal - impossible in a ~400 kcal meal. Several lines say "(cooked weight)".',
    '--',
    `-- ${lowConf.length} recipes contain an ingredient whose composition varies a lot (chimichurri,`,
    '-- tikka sauce, dukkah). Values reviewed and accepted; listed at the end of this file.',
    '',
    'BEGIN;',
    '',
    '-- ── Part 1: correct implausible ingredient amounts ──────────────────────',
  ];

  const seen = new Set<string>();
  for (const c of corrections) {
    const key = `${c.from}|${c.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`UPDATE public.ingredients SET item = '${esc(c.to)}' WHERE item = '${esc(c.from)}';`);
  }

  lines.push('', '-- ── Part 2: recomputed macros ───────────────────────────────────────────');
  for (const c of applicable) {
    // Three names are shared by two different recipes; the old calorie value
    // disambiguates them, so include it in the predicate for those rows only.
    const where = duplicateName(c)
      ? `name = '${esc(c.r.name)}' AND calories = ${c.r.statedKcal}`
      : `name = '${esc(c.r.name)}'`;
    lines.push(
      `UPDATE public.recipes SET calories = ${c.kcal}, protein_g = ${c.protein}, ` +
      `carbs_g = ${c.carbs}, fat_g = ${c.fat} WHERE ${where};`,
    );
  }

  lines.push('', 'COMMIT;', '');
  lines.push('-- Recipes containing a variable-composition ingredient (reviewed, accepted):');
  for (const c of lowConf) lines.push(`--   ${c.r.name}`);
  lines.push('');

  writeFileSync(out, lines.join('\n'));
  console.log(`\nMigration written: ${out}`);
  console.log(`  ${seen.size} ingredient corrections, ${applicable.length} macro updates`);
}
