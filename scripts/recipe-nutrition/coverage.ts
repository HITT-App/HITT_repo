/**
 * Coverage report — what fraction of ingredient lines can we actually price?
 *
 * Run: npx tsx scripts/recipe-nutrition/coverage.ts
 *
 * Two independent gaps, and they need different fixes:
 *   UNMATCHED — no entry in food-table.ts        → add the food
 *   NO AMOUNT — matched, but the line states none → assign a portion
 */
import { parseAllRecipes } from './parse-seeds';
import { validateTable, FOODS } from './food-table';

const problems = validateTable();
if (problems.length) {
  console.error('food-table.ts failed validation:');
  problems.forEach(p => console.error('  ' + p));
  process.exit(1);
}

const recipes = parseAllRecipes();
const lines = recipes.flatMap(r => r.ingredients);

const unmatched = new Map<string, number>();
const noAmount = new Map<string, number>();
let matched = 0, withGrams = 0;

for (const l of lines) {
  if (!l.food) {
    unmatched.set(l.raw.toLowerCase().trim(), (unmatched.get(l.raw.toLowerCase().trim()) ?? 0) + 1);
    continue;
  }
  matched++;
  if (l.grams != null) withGrams++;
  else noAmount.set(l.food, (noAmount.get(l.food) ?? 0) + 1);
}

console.log(`Recipes parsed:        ${recipes.length}`);
console.log(`Ingredient lines:      ${lines.length}`);
console.log(`Food table entries:    ${Object.keys(FOODS).length}\n`);
console.log(`Matched to a food:     ${matched}  (${((matched / lines.length) * 100).toFixed(1)}%)`);
console.log(`  ...with an amount:   ${withGrams}  (${((withGrams / lines.length) * 100).toFixed(1)}% of all lines)`);
console.log(`  ...no amount stated: ${matched - withGrams}`);
console.log(`Unmatched (no entry):  ${lines.length - matched}  (${(((lines.length - matched) / lines.length) * 100).toFixed(1)}%)\n`);

const fullyPriceable = recipes.filter(r => r.ingredients.every(i => i.food && i.grams != null)).length;
const anyUnmatched = recipes.filter(r => r.ingredients.some(i => !i.food)).length;
console.log(`Recipes fully priceable right now:      ${fullyPriceable}`);
console.log(`Recipes containing an unmatched food:   ${anyUnmatched}`);

console.log('\n── UNMATCHED lines, most frequent first (add these to food-table.ts) ──');
for (const [raw, n] of [...unmatched.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
  console.log(`  ${String(n).padStart(4)}×  ${raw}`);
}
console.log(`  … ${Math.max(0, unmatched.size - 40)} more distinct strings`);

console.log('\n── MATCHED but no amount (assign portions) ──');
for (const [food, n] of [...noAmount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log(`  ${String(n).padStart(4)}×  ${food}`);
}
console.log(`  … ${Math.max(0, noAmount.size - 25)} more`);
