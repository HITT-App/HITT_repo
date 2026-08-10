/**
 * Recompute the owner pack's macros FROM its ingredients, using the same USDA-reconciled
 * food table, portion rules and correction rules as scripts/recipe-nutrition/recompute.ts.
 *
 * Run: npx tsx scripts/recipe-pack/recompute_pack_nutrition.ts <payload.json>
 *
 * It operates on the prepared payload rather than on the seed SQL, because parse-seeds.ts
 * only understands the two older ingredient INSERT forms and the pack's seed uses a bulk
 * VALUES-join. Same maths, same table, different input.
 *
 * TWO THINGS THIS DOES THAT recompute.ts DOESN'T NEED TO:
 *   1. Divides by `servings`. Pack ingredient quantities are whole-batch ("600g Chicken
 *      Breast" across 4 boxes) while every stored macro is per serving.
 *   2. Keeps the owner's supplied figures when the safety gate fails, rather than blanking
 *      them — an unreviewed derived number is worse than the author's own.
 *
 * SAFETY GATE (inherited): a recipe is only rewritten when every ingredient resolved to a
 * known food, none was low-confidence, and no portion was implausible. Everything else is
 * listed for review and left alone.
 */
import { readFileSync, writeFileSync } from 'fs';
import { matchFood, parseGrams, foodFor } from '../recipe-nutrition/parse-seeds';
import { validateTable } from '../recipe-nutrition/food-table';
import { portionFor, portionIsImplausible } from '../recipe-nutrition/portions';
import { correctIngredient } from '../recipe-nutrition/corrections';

type Recipe = {
  external_id: string;
  name: string;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  [k: string]: unknown;
};

const problems = validateTable();
if (problems.length) {
  console.error('food-table.ts failed validation — refusing to run:');
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}

const payloadPath = process.argv[2];
if (!payloadPath) {
  console.error('usage: recompute_pack_nutrition.ts <payload.json>');
  process.exit(1);
}

const payload = JSON.parse(readFileSync(payloadPath, 'utf8')) as {
  recipes: Recipe[];
  ingredients: { external_id: string; item: string; sort_order: number }[];
};

const byRecipe = new Map<string, string[]>();
for (const i of payload.ingredients) {
  if (!byRecipe.has(i.external_id)) byRecipe.set(i.external_id, []);
  byRecipe.get(i.external_id)!.push(i.item);
}

type Outcome = {
  id: string;
  name: string;
  applied: boolean;
  reason: string;
  before: [number, number, number, number];
  after: [number, number, number, number];
  deltaPct: number;
};

const outcomes: Outcome[] = [];

for (const r of payload.recipes) {
  const lines = byRecipe.get(r.external_id) ?? [];
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  let lowConfidence = false;
  const unresolved: string[] = [];
  const implausible: string[] = [];

  for (const raw of lines) {
    const name = matchFood(raw);
    const food = foodFor(name);
    if (!food) { unresolved.push(raw); continue; }
    if (food.confidence === 'low') lowConfidence = true;

    let grams = parseGrams(raw, name);
    if (grams == null) {
      grams = portionFor(name!, food.kcal).grams;
    } else {
      const fix = correctIngredient(raw, name, grams);
      if (fix) grams = fix.grams;
      else if (portionIsImplausible(name!, grams)) implausible.push(`${raw} (${grams}g)`);
    }

    const k = grams / 100;
    kcal += food.kcal * k;
    protein += food.protein * k;
    carbs += food.carbs * k;
    fat += food.fat * k;
  }

  const servings = r.servings && r.servings > 0 ? r.servings : 1;
  const after: [number, number, number, number] = [
    Math.round(kcal / servings),
    Math.round((protein / servings) * 10) / 10,
    Math.round((carbs / servings) * 10) / 10,
    Math.round((fat / servings) * 10) / 10,
  ];
  const before: [number, number, number, number] = [r.calories, r.protein_g, r.carbs_g, r.fat_g];

  let reason = 'ok';
  if (!lines.length) reason = 'no ingredients';
  else if (unresolved.length) reason = `${unresolved.length} unresolved: ${unresolved[0]}`;
  else if (lowConfidence) reason = 'low-confidence food in table';
  else if (implausible.length) reason = `implausible portion: ${implausible[0]}`;
  else if (after[0] <= 0) reason = 'computed 0 kcal';

  const applied = reason === 'ok';
  if (applied) {
    r.calories = after[0];
    r.protein_g = after[1];
    r.carbs_g = after[2];
    r.fat_g = after[3];
  }
  outcomes.push({
    id: r.external_id, name: r.name, applied, reason, before, after,
    deltaPct: before[0] > 0 ? Math.round(((after[0] - before[0]) / before[0]) * 100) : 0,
  });
}

writeFileSync(payloadPath, JSON.stringify(payload, null, 1));

const applied = outcomes.filter((o) => o.applied);
const skipped = outcomes.filter((o) => !o.applied);
const rows = ['id\tname\tapplied\treason\tkcal_before\tkcal_after\tdelta_pct'];
for (const o of outcomes) {
  rows.push([o.id, o.name, o.applied, o.reason, o.before[0], o.after[0], o.deltaPct].join('\t'));
}
writeFileSync(new URL('./nutrition_recompute.tsv', import.meta.url).pathname, rows.join('\n') + '\n');

const big = applied.filter((o) => Math.abs(o.deltaPct) >= 25);
console.log(`recipes ................ ${outcomes.length}`);
console.log(`recomputed from source . ${applied.length}`);
console.log(`left as supplied ....... ${skipped.length}`);
const why = new Map<string, number>();
for (const o of skipped) {
  const k = o.reason.split(':')[0];
  why.set(k, (why.get(k) ?? 0) + 1);
}
console.log('\nwhy skipped:');
[...why.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k.padEnd(34)} ${v}`));
console.log(`\nrecomputed rows moving >=25%: ${big.length}`);
big.slice(0, 15).forEach((o) =>
  console.log(`  ${o.id}  ${o.name.slice(0, 38).padEnd(38)} ${o.before[0]} -> ${o.after[0]} kcal (${o.deltaPct > 0 ? '+' : ''}${o.deltaPct}%)`));
console.log('\nfull diff -> scripts/recipe-pack/nutrition_recompute.tsv');
