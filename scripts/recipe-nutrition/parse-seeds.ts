/**
 * Parses the seeded recipes out of the SQL migrations (task #115).
 *
 * The seed files use two different ingredient INSERT forms — an earlier
 * `unnest(ARRAY[...])` style and a later `VALUES ((SELECT id ...), 'item', n)` style.
 * Both must be handled; missing the second silently drops ~300 recipes' ingredients.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { FOODS, type Food } from './food-table';

export const MIG_DIR = '/Users/vanessa/hitt-app/supabase/migrations';

export type ParsedIngredient = {
  raw: string;
  /** Normalised food name, or null when nothing in FOODS matched. */
  food: string | null;
  /** Explicit grams parsed from the line, or null when the line carries no amount. */
  grams: number | null;
};

export type ParsedRecipe = {
  file: string;
  name: string;
  statedKcal: number | null;
  statedProtein: number | null;
  statedCarbs: number | null;
  statedFat: number | null;
  ingredients: ParsedIngredient[];
};

const UNIT_ML_TO_G: Record<string, number> = {
  tbsp: 15, tsp: 5, cup: 240, cups: 240, ml: 1, l: 1000,
};

/** Typical edible weight of one countable item, grams. */
const UNIT_WEIGHT: Record<string, number> = {
  'sweet potato': 130, 'white potato': 170, 'banana': 118, 'avocado': 150,
  'eggs': 50, 'egg': 50, 'whole eggs': 50, 'onion': 110, 'red onion': 110,
  'courgette': 200, 'zucchini': 200, 'carrot': 60, 'carrots': 60,
  'lemon': 60, 'lime': 45, 'mango': 200, 'garlic': 3,
};

/** "1 handful almonds" and friends. */
const VAGUE_MEASURES: Record<string, number> = {
  handful: 30, handfuls: 30, pinch: 0.5, pinches: 0.5, sprig: 1, sprigs: 1,
  slice: 30, slices: 30, clove: 3, cloves: 3, scoop: 30, scoops: 30,
  can: 240, cans: 240, tin: 240, tins: 240,
};

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667 };

function leadingNumber(s: string): { n: number | null; rest: string } {
  const t = s.trim();
  const frac = t.match(/^([½¼¾⅓⅔])\s*/);
  if (frac) return { n: FRACTIONS[frac[1]], rest: t.slice(frac[0].length) };
  const mixed = t.match(/^(\d+)\s*\/\s*(\d+)\s*/);
  if (mixed) return { n: parseInt(mixed[1], 10) / parseInt(mixed[2], 10), rest: t.slice(mixed[0].length) };
  const dec = t.match(/^(\d+(?:\.\d+)?)\s*/);
  if (dec) return { n: parseFloat(dec[1]), rest: t.slice(dec[0].length) };
  return { n: null, rest: t };
}

const FOOD_KEYS = Object.keys(FOODS).sort((a, b) => b.length - a.length);

/**
 * Resolve an ingredient line to a food.
 *
 * Order matters, and getting it wrong is expensive:
 *  1. Exact match on the whole line — lets composite template strings
 *     ("soy sauce, ginger and a splash of sesame oil") be priced as one unit.
 *  2. Otherwise the EARLIEST match in the string wins, tie-broken by length.
 *     Longest-anywhere was wrong: "160g tinned tuna in olive oil" matched
 *     "olive oil" (884 kcal/100g) instead of tuna and priced that one line at
 *     1,414 kcal. The head noun comes first; trailing prepositional phrases
 *     ("in olive oil", "in spring water") qualify it.
 * Word boundaries throughout, so "butter beans" never matches "butter".
 */
export function matchFood(text: string): string | null {
  const s = text.toLowerCase().trim();
  if (FOODS[s]) return s;

  let best: { key: string; pos: number } | null = null;
  for (const k of FOOD_KEYS) {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = s.match(new RegExp(`(^|[^a-z])${esc}([^a-z]|$)`));
    if (!m || m.index == null) continue;
    const pos = m.index;
    // FOOD_KEYS is longest-first, so on a positional tie the longer key is
    // already in hand — only replace on a strictly earlier position.
    if (!best || pos < best.pos) best = { key: k, pos };
  }
  return best?.key ?? null;
}

/** Extract grams from an ingredient line, if it states an amount we can convert. */
export function parseGrams(raw: string, food: string | null): number | null {
  const s = raw.toLowerCase().trim();

  // "200g", "1.5 kg"
  const g = s.match(/(\d+(?:\.\d+)?)\s*(g|kg)\b/);
  if (g) return parseFloat(g[1]) * (g[2] === 'kg' ? 1000 : 1);

  // "2 tbsp", "250ml", "1 cup"
  const vol = s.match(/(\d+(?:\.\d+)?|[½¼¾⅓⅔])\s*(tbsp|tsp|cups?|ml|l)\b/);
  if (vol) {
    const n = FRACTIONS[vol[1]] ?? parseFloat(vol[1]);
    return n * (UNIT_ML_TO_G[vol[2]] ?? 1);
  }

  // "1 handful", "2 slices", "3 cloves"
  const vague = s.match(/(\d+(?:\.\d+)?|[½¼¾⅓⅔])?\s*(handfuls?|pinch(?:es)?|sprigs?|slices?|cloves?|scoops?|cans?|tins?)\b/);
  if (vague) {
    const n = vague[1] ? (FRACTIONS[vague[1]] ?? parseFloat(vague[1])) : 1;
    // `??` binds looser than `*`, so `n * undefined ?? fallback` evaluates to NaN and
    // the fallback never fires. Resolve the weight first, then multiply.
    const weight = VAGUE_MEASURES[vague[2]] ?? VAGUE_MEASURES[vague[2].replace(/(es|s)$/, '')];
    if (weight != null) return n * weight;
  }

  // "1 large sweet potato" / "2 eggs" — countable, needs a known unit weight
  const { n } = leadingNumber(s);
  if (n != null && food && UNIT_WEIGHT[food]) return n * UNIT_WEIGHT[food];

  return null;
}

function extractIngredientStrings(block: string): string[] {
  const items: string[] = [];
  const arr = block.match(/INSERT INTO public\.ingredients[\s\S]*?ARRAY\[([\s\S]*?)\]/i);
  if (arr) {
    for (const q of arr[1].matchAll(/'((?:[^']|'')*)'/g)) items.push(q[1].replace(/''/g, "'"));
    return items;
  }
  const vals = block.match(/INSERT INTO public\.ingredients[\s\S]*?VALUES([\s\S]*?)RETURNING/i);
  if (vals) {
    for (const q of vals[1].matchAll(/,\s*'((?:[^']|'')*)'\s*,\s*\d+\s*\)/g)) {
      items.push(q[1].replace(/''/g, "'"));
    }
  }
  return items;
}

/** Pull name + the four macro numbers out of the recipes INSERT tuple. */
function extractRecipeHeader(block: string) {
  const colsM = block.match(/^\s*\(([^)]*)\)\s*VALUES/);
  const nameM = block.match(/'((?:[^']|'')+)'/);
  if (!nameM) return null;
  const name = nameM[1].replace(/''/g, "'");

  const cols = colsM ? colsM[1].split(',').map(c => c.trim().toLowerCase()) : [];
  const head = block.slice(0, 1500);

  const numsAfterName = head.slice(head.indexOf(nameM[0]) + nameM[0].length);
  const nums = [...numsAfterName.matchAll(/(?:^|[,(\s])(\d+(?:\.\d+)?)\s*(?=[,)])/g)].map(m => parseFloat(m[1]));

  // Column order is stable across every seed file: calories, protein_g, carbs_g, fat_g.
  const idx = {
    cal: cols.indexOf('calories'),
    p: cols.indexOf('protein_g'),
    c: cols.indexOf('carbs_g'),
    f: cols.indexOf('fat_g'),
  };
  if (idx.cal >= 0 && nums.length >= 4) {
    return { name, statedKcal: nums[0], statedProtein: nums[1], statedCarbs: nums[2], statedFat: nums[3] };
  }
  return { name, statedKcal: nums[0] ?? null, statedProtein: nums[1] ?? null, statedCarbs: nums[2] ?? null, statedFat: nums[3] ?? null };
}

export function parseAllRecipes(): ParsedRecipe[] {
  const out: ParsedRecipe[] = [];
  for (const file of readdirSync(MIG_DIR).filter(f => f.endsWith('.sql'))) {
    const sql = readFileSync(join(MIG_DIR, file), 'utf8');
    if (!/INSERT INTO public\.recipes/i.test(sql)) continue;

    for (const block of sql.split(/INSERT INTO public\.recipes/i).slice(1)) {
      const header = extractRecipeHeader(block);
      if (!header) continue;
      const raws = extractIngredientStrings(block);
      if (!raws.length) continue;

      out.push({
        file,
        ...header,
        ingredients: raws.map(raw => {
          const food = matchFood(raw);
          return { raw, food, grams: parseGrams(raw, food) };
        }),
      });
    }
  }
  return out;
}

export function foodFor(name: string | null): Food | null {
  return name ? FOODS[name] ?? null : null;
}
