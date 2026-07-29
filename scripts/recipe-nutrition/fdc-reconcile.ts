/**
 * Reconcile food-table.ts against USDA FoodData Central (task #115).
 *
 * Our per-100 g values are hand-authored from standard composition figures. They
 * validate internally, but internal consistency isn't correctness. This checks them
 * against lab-analysed reference data and reports what to change.
 *
 * SETUP — needs a free API key (instant, no approval):
 *   https://fdc.nal.usda.gov/api-key-signup.html
 * DEMO_KEY allows only 10 requests/hour, which is not enough for 287 foods.
 *
 * Run:
 *   FDC_API_KEY=xxxx npx tsx scripts/recipe-nutrition/fdc-reconcile.ts
 *   FDC_API_KEY=xxxx npx tsx scripts/recipe-nutrition/fdc-reconcile.ts --apply-safe
 *
 *   --apply-safe   rewrite food-table.ts for LOW-RISK corrections only (see below)
 *   --limit N      stop after N lookups (for a cheap smoke test)
 *
 * Responses are cached to fdc-cache.json, so re-runs cost nothing and an interrupted
 * run resumes where it stopped.
 *
 * DATA TYPES: queries are restricted to Foundation and SR Legacy — lab-analysed
 * reference foods. "Branded" is manufacturer-submitted, inconsistent, and would make
 * this check worse than no check at all.
 *
 * COOKED vs RAW is the trap here. Our table deliberately holds COOKED values for
 * grains/pasta/oats (established from the seeded portion sizes). A naive search for
 * "white basmati rice" returns DRY rice and would flag our correct value as a 3x
 * error. Foods where the form matters therefore carry an explicit `fdcQuery`.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { FOODS, type Food } from './food-table';
import { parseAllRecipes } from './parse-seeds';

const API_KEY = process.env.FDC_API_KEY ?? 'DEMO_KEY';
const CACHE_PATH = '/Users/vanessa/hitt-app/scripts/recipe-nutrition/fdc-cache.json';
const BASE = 'https://api.nal.usda.gov/fdc/v1/foods/search';

/**
 * Search terms for foods where the plain key would match the wrong form or the wrong
 * food entirely. Anything not listed is queried by its key.
 */
const FDC_QUERY: Record<string, string> = {
  // Cooked grains/pasta — our values are cooked, so the query must be too.
  'white basmati rice': 'rice white long-grain cooked',
  'brown rice': 'rice brown long-grain cooked',
  'rice': 'rice white long-grain cooked',
  'quinoa': 'quinoa cooked',
  'couscous': 'couscous cooked',
  'bulgur wheat': 'bulgur cooked',
  'wholewheat pasta': 'pasta whole-wheat cooked',
  'soba noodles': 'noodles soba cooked',
  'pearl barley': 'barley pearled cooked',
  'rolled oats': 'oatmeal cooked',
  'oats': 'oatmeal cooked',
  'cooked basmati': 'rice white long-grain cooked',
  // Explicitly dry forms.
  'dry pasta': 'pasta dry unenriched',
  'dry spaghetti': 'spaghetti dry',
  'whole wheat pasta': 'pasta whole-wheat dry',
  'oat flour': 'oat flour partially debranned',
  'gram (chickpea) flour': 'chickpea flour besan',
  // Pulses — ours are canned/cooked.
  'butter beans': 'lima beans canned',
  'black beans': 'black beans cooked boiled',
  'chickpeas': 'chickpeas cooked boiled',
  'lentils': 'lentils cooked boiled',
  'kidney beans': 'kidney beans cooked boiled',
  'white beans': 'white beans cooked boiled',
  'baked beans': 'baked beans canned',
  // Disambiguation.
  'egg whites': 'egg white raw fresh',
  'eggs': 'egg whole raw fresh',
  'egg': 'egg whole raw fresh',
  'whole eggs': 'egg whole raw fresh',
  '0% greek yogurt': 'yogurt greek plain nonfat',
  'greek yogurt': 'yogurt greek plain whole milk',
  'greek yoghurt': 'yogurt greek plain whole milk',
  'firm tofu': 'tofu firm prepared calcium sulfate',
  'silken tofu': 'tofu silken',
  'tofu': 'tofu firm prepared calcium sulfate',
  'grated cheddar': 'cheese cheddar',
  'cheddar': 'cheese cheddar',
  'crumbled feta': 'cheese feta',
  'feta': 'cheese feta',
  'parmesan': 'cheese parmesan hard',
  'halloumi': 'cheese halloumi',
  'low-fat mozzarella': 'cheese mozzarella part skim',
  'cottage cheese': 'cheese cottage lowfat 2%',
  'full-fat cream cheese': 'cheese cream',
  'double cream': 'cream heavy whipping',
  'sour cream': 'cream sour cultured',
  'unsalted butter': 'butter without salt',
  'natural peanut butter': 'peanut butter smooth',
  'peanut butter': 'peanut butter smooth',
  'chicken breast': 'chicken breast boneless skinless raw',
  'chicken thigh': 'chicken thigh boneless skinless raw',
  'chicken thighs': 'chicken thigh boneless skinless raw',
  'turkey breast': 'turkey breast meat only raw',
  'turkey mince': 'ground turkey raw',
  'beef mince': 'ground beef 85% lean raw',
  'sirloin steak': 'beef top sirloin raw',
  'steak': 'beef top sirloin raw',
  'beef ribeye steak': 'beef ribeye raw',
  'lamb leg': 'lamb leg raw',
  'pork tenderloin': 'pork tenderloin raw',
  'pork belly': 'pork belly raw',
  'bacon': 'bacon raw',
  'salmon fillet': 'salmon atlantic farmed raw',
  'cod fillet': 'cod atlantic raw',
  'cod loin': 'cod atlantic raw',
  'haddock fillet': 'haddock raw',
  'smoked haddock': 'haddock smoked',
  'mackerel': 'mackerel atlantic raw',
  'tuna steak': 'tuna yellowfin raw',
  'tinned tuna': 'tuna light canned in water drained',
  'tuna': 'tuna light canned in water drained',
  'tinned tuna in olive oil': 'tuna light canned in oil drained',
  'king prawns': 'shrimp raw',
  'shrimp': 'shrimp raw',
  'sardines': 'sardine atlantic canned in oil drained',
  'sweet potato': 'sweet potato raw unprepared',
  'white potato': 'potato flesh and skin raw',
  'jacket potato': 'potato baked flesh and skin',
  'new potatoes': 'potato flesh and skin raw',
  'baby spinach': 'spinach raw',
  'cherry tomatoes': 'tomatoes red ripe raw',
  'mixed peppers': 'peppers sweet red raw',
  'bell pepper': 'peppers sweet red raw',
  'red pepper': 'peppers sweet red raw',
  'courgette': 'squash zucchini raw',
  'zucchini': 'squash zucchini raw',
  'courgette noodles': 'squash zucchini raw',
  'cauliflower rice': 'cauliflower raw',
  'tenderstem broccoli': 'broccoli raw',
  'broccoli florets': 'broccoli raw',
  'chestnut mushrooms': 'mushrooms crimini raw',
  'mushrooms': 'mushrooms crimini raw',
  'asparagus tips': 'asparagus raw',
  'mixed salad leaves': 'lettuce green leaf raw',
  'wholegrain bread': 'bread whole-wheat commercially prepared',
  'wholemeal bread': 'bread whole-wheat commercially prepared',
  'wholemeal toast': 'bread whole-wheat toasted',
  'rye bread': 'bread rye',
  'sourdough': 'bread french or vienna sourdough',
  'plain bagel': 'bagels plain',
  'wholewheat tortilla wrap': 'tortillas ready-to-bake whole wheat',
  'wholemeal wrap': 'tortillas ready-to-bake whole wheat',
  'corn tortillas': 'tortillas ready-to-bake corn',
  'wholemeal pitta': 'bread pita whole-wheat',
  'olive oil': 'oil olive salad or cooking',
  'extra virgin olive oil': 'oil olive extra virgin',
  'coconut oil': 'oil coconut',
  'sesame oil': 'oil sesame salad or cooking',
  'mixed nuts': 'nuts mixed dry roasted',
  'almonds': 'nuts almonds raw',
  'walnuts': 'nuts walnuts english',
  'pine nuts': 'nuts pine nuts dried',
  'chia seeds': 'seeds chia dried',
  'hemp seeds': 'seeds hemp hulled',
  'sunflower seeds': 'seeds sunflower kernels dried',
  'pumpkin seeds': 'seeds pumpkin kernels dried',
  'sesame seeds': 'seeds sesame whole dried',
  'flaxseed': 'seeds flaxseed',
  'tahini': 'sesame butter tahini',
  'soy sauce': 'soy sauce made from soy and wheat shoyu',
  'tamari': 'soy sauce made from soy tamari',
  'honey': 'honey',
  'maple syrup': 'syrups maple',
  'raisins': 'raisins seedless',
  'dried apricots': 'apricots dried sulfured',
  'edamame': 'edamame frozen prepared',
  'tempeh': 'tempeh',
  'seitan': 'seitan wheat gluten',
  'hummus': 'hummus commercial',
  'granola': 'granola homemade',
  'salsa': 'salsa ready-to-serve',
  'miso paste': 'miso',
  'white miso paste': 'miso',
  'avocado': 'avocados raw california',
  'avocado slices': 'avocados raw california',
  'banana': 'bananas raw',
  'apple': 'apples raw with skin',
  'berries': 'blueberries raw',
  'mixed berries': 'blueberries raw',
  'olives': 'olives ripe canned',
  'capers': 'capers canned',
  'nori': 'seaweed laver raw',
  'dried wakame seaweed': 'seaweed wakame raw',
};

/**
 * Foods FDC's keyword search cannot match usefully. Excluded from the flagged report
 * so real discrepancies aren't buried — each one was checked by hand first.
 *
 * Three reasons, and the false matches are worth recording because they look alarming:
 *  (a) composite generator lines that aren't a single food at all
 *  (b) UK products whose US analogue genuinely differs (double cream is 48% fat;
 *      USDA "heavy whipping cream" is 36%)
 *  (c) the search returning something unrelated — "lamb leg" → Frog legs,
 *      "bacon" → Abiyuch (a fruit), "quorn pieces" → REESE'S PIECES,
 *      "mint" → AFTER EIGHT Mints, "beef mince" → ground TURKEY.
 */
const FDC_SKIP: Record<string, string> = {
  // (a) composite lines — priced as a whole line, not a single food
  'soy sauce, ginger and a splash of sesame oil': 'composite line',
  'tamari (gluten-free soy), ginger and a splash of sesame oil': 'composite line',
  'teriyaki glaze and toasted sesame seeds': 'composite line',
  'fresh thyme, cracked black pepper and a splash of double cream': 'composite line',
  'tamari (gluten-free soy), ginger and spring onion': 'composite line',
  'tamari (gluten-free soy), ginger and mirin': 'composite line',
  'oregano, basil and a squeeze of lemon': 'composite line',
  // (b) UK product differs from the US analogue
  'double cream': 'UK 48% fat vs USDA heavy whipping 36%',
  'natural peanut butter': 'USDA match was reduced-fat/sweetened commercial',
  'bacon': 'UK smoked back bacon; USDA search returns unrelated',
  'seitan': 'USDA match is dry vital wheat gluten, ours is hydrated',
  'shirataki noodles': 'konjac; USDA returns rice noodles',
  'quorn mince': 'mycoprotein, not in FDC',
  'quorn pieces': 'mycoprotein, not in FDC',
  'quorn fillets': 'mycoprotein, not in FDC',
  'rehydrated soya mince': 'no FDC equivalent',
  'turkey rasher': 'no FDC equivalent',
  'high-protein hummus': 'no FDC equivalent',
  'soya yogurt': 'FDC match is tofu yogurt',
  'tikka sauce': 'no FDC equivalent',
  'tikka marinade': 'no FDC equivalent',
  'mustard-herb glaze': 'no FDC equivalent',
  'tomato & spice base': 'no FDC equivalent',
  'chimichurri sauce': 'no FDC equivalent',
  'sesame-ginger dressing': 'no FDC equivalent',
  'dukkah': 'no FDC equivalent',
  'roasted veg': 'not a single food',
  'stir-fry vegetables': 'not a single food',
  'herbs': 'generic; FDC returns chamomile tea',
  'herbs de provence': 'generic',
  'seeds': 'generic',
  'sesame': 'generic',
  // (c) search returns something unrelated
  'lamb leg': 'FDC returns "Frog legs, raw"',
  'beef mince': 'FDC returns ground TURKEY',
  'mint': 'FDC returns AFTER EIGHT Mints',
  'coriander': 'ours is fresh leaf; FDC returns coriander SEED',
  'lemon': 'FDC returns bottled lemon juice concentrate',
  'carrots': 'FDC returns dehydrated carrot',
  'carrot': 'FDC returns dehydrated carrot',
  'cabbage': 'FDC returns kimchi',
  'spinach': 'FDC returns spinach souffle',
  'sweet potato': 'FDC returns frozen sweet potato puffs',
  'rolled oats': 'FDC returns "Bread, oatmeal"',
  'oats': 'FDC returns "Bread, oatmeal"',
  'noodles': 'FDC returns rice noodles',
  'glass noodles': 'FDC returns rice noodles',
  'diced potato': 'FDC returns babyfood apples',
  'tomato passata': 'FDC returns tomato powder',
  'chicken stock': 'ours is prepared; FDC returns concentrated',
  'veg stock': 'ours is prepared; FDC returns concentrated',
  'low-salt stock': 'FDC returns low-salt crackers',
  'gravy': 'FDC returns dry gravy powder',
  'veg gravy': 'FDC returns dry gravy powder',
  'anchovy paste': 'FDC returns whole raw anchovy',
  'tin tuna in spring water': 'FDC returns bottled water',
  'tuna in spring water': 'FDC returns bottled water',
  'turnip': 'FDC returns frozen turnip greens',
  'light maple syrup': 'FDC returns full-sugar maple syrup',
  'light syrup': 'FDC returns corn syrup',
  'syrup': 'FDC returns fruit syrup',
  'hummus': 'FDC commercial hummus is oil-heavier than UK retail',
  'celeriac mash': 'ours is prepared with liquid; FDC is raw celeriac',
  'courgette': 'FDC returns baby zucchini',
  'courgette noodles': 'FDC returns baby zucchini',
  'teriyaki glaze': 'FDC returns glazed walnuts',
  // Final pass — remaining search failures, each verified by hand.
  'cucumber': 'FDC returned PEELED cucumber (10); with-peel is 15, which is ours',
  'soya milk': 'FDC returns "Crackers, milk"',
  'milk': 'FDC returns "Crackers, milk"',
  'rice vinegar': 'FDC returns balsamic vinegar',
  'dijon mustard': 'FDC returns mustard OIL',
  'high-protein soya yogurt': 'FDC returns babyfood cereal',
  'plain bagel': 'FDC returns bagel CHIPS (a snack)',
  'dill': 'ours is the fresh herb; FDC returns dill PICKLES',
  'smoked haddock': 'ours already carries a smoked-vs-raw note; 29% is the cure',
};

/** Nutrient IDs in FDC. */
const N = { kcal: 1008, protein: 1003, fat: 1204, carbs: 1005 } as const;
// 1204 is "Total lipid (fat)" in some responses; 1004 in others. Accept either.
const FAT_IDS = new Set([1004, 1204]);

type CacheEntry = {
  query: string;
  description: string | null;
  dataType: string | null;
  kcal: number | null; protein: number | null; carbs: number | null; fat: number | null;
};

const cache: Record<string, CacheEntry> = existsSync(CACHE_PATH)
  ? JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
  : {};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function lookup(key: string): Promise<CacheEntry | null> {
  if (cache[key]) return cache[key];

  const query = FDC_QUERY[key] ?? key;
  const url = `${BASE}?query=${encodeURIComponent(query)}` +
    `&dataType=${encodeURIComponent('Foundation,SR Legacy')}&pageSize=1&api_key=${API_KEY}`;

  const res = await fetch(url);
  if (res.status === 429) {
    console.error(`\nRate limit hit after ${Object.keys(cache).length} lookups.`);
    console.error('Progress is cached — re-run the same command to resume.');
    if (API_KEY === 'DEMO_KEY') {
      console.error('DEMO_KEY allows 10 requests/hour. Get a free key (instant):');
      console.error('  https://fdc.nal.usda.gov/api-key-signup.html');
    }
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1));
    process.exit(2);
  }
  if (!res.ok) { console.error(`  ${key}: HTTP ${res.status}`); return null; }

  const json = await res.json() as {
    foods?: Array<{
      description: string; dataType: string;
      foodNutrients: Array<{ nutrientId: number; value: number }>;
    }>;
  };
  const hit = json.foods?.[0];
  if (!hit) {
    const empty: CacheEntry = { query, description: null, dataType: null, kcal: null, protein: null, carbs: null, fat: null };
    cache[key] = empty;
    return empty;
  }

  const get = (id: number) => hit.foodNutrients.find(n => n.nutrientId === id)?.value ?? null;
  const fat = hit.foodNutrients.find(n => FAT_IDS.has(n.nutrientId))?.value ?? null;

  const entry: CacheEntry = {
    query,
    description: hit.description,
    dataType: hit.dataType,
    kcal: get(N.kcal), protein: get(N.protein), carbs: get(N.carbs), fat,
  };
  cache[key] = entry;
  return entry;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  if (API_KEY === 'DEMO_KEY') {
    console.log('⚠  Using DEMO_KEY (10 requests/hour). Results will be partial.');
    console.log('   Free key, instant: https://fdc.nal.usda.gov/api-key-signup.html\n');
  }

  // Weight each food by how many ingredient lines use it, so the report leads with
  // whatever actually moves the numbers rather than an obscure one-off.
  const usage = new Map<string, number>();
  for (const ing of parseAllRecipes().flatMap(r => r.ingredients)) {
    if (ing.food) usage.set(ing.food, (usage.get(ing.food) ?? 0) + 1);
  }

  const skipped = Object.keys(FOODS).filter(k => k in FDC_SKIP);
  const keys = Object.keys(FOODS)
    .filter(k => (FOODS[k].kcal ?? 0) > 0)                 // skip zero-calorie stubs
    .filter(k => !(k in FDC_SKIP))                         // FDC can't match these
    .sort((a, b) => (usage.get(b) ?? 0) - (usage.get(a) ?? 0));

  type Row = { key: string; ours: Food; theirs: CacheEntry; deltaPct: number; uses: number };
  const rows: Row[] = [];
  let fetched = 0;

  for (const key of keys) {
    if (fetched >= limit) break;
    const wasCached = !!cache[key];
    const theirs = await lookup(key);
    if (!wasCached) { fetched++; await sleep(120); }
    if (!theirs || theirs.kcal == null) continue;

    const ours = FOODS[key];
    const deltaPct = ((theirs.kcal - ours.kcal) / Math.max(ours.kcal, 1)) * 100;
    rows.push({ key, ours, theirs, deltaPct, uses: usage.get(key) ?? 0 });
  }

  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1));

  console.log(`Compared ${rows.length} foods (${fetched} new lookups, ${Object.keys(cache).length} cached).\n`);

  const agree = rows.filter(r => Math.abs(r.deltaPct) <= 10);
  const minor = rows.filter(r => Math.abs(r.deltaPct) > 10 && Math.abs(r.deltaPct) <= 25);
  const major = rows.filter(r => Math.abs(r.deltaPct) > 25);
  console.log(`  within ±10%  (agrees):        ${agree.length}`);
  console.log(`  ±10–25%      (minor):         ${minor.length}`);
  console.log(`  over ±25%    (investigate):   ${major.length}`);
  console.log(`  excluded (FDC can't match):   ${skipped.length}  — see FDC_SKIP, each checked by hand\n`);

  if (major.length) {
    console.log('── Over ±25%, ordered by how many ingredient lines are affected ──');
    for (const r of major.sort((a, b) => b.uses - a.uses)) {
      console.log(
        `  ${String(r.uses).padStart(4)} lines  ${r.key.padEnd(28)} ` +
        `ours ${String(r.ours.kcal).padStart(4)}  usda ${String(Math.round(r.theirs.kcal!)).padStart(4)}  ` +
        `(${r.deltaPct > 0 ? '+' : ''}${r.deltaPct.toFixed(0)}%)`,
      );
      console.log(`               matched: "${r.theirs.description}" [${r.theirs.dataType}]`);
    }
  }

  const csv = [
    'food,uses,our_kcal,usda_kcal,delta_pct,our_protein,usda_protein,our_carbs,usda_carbs,our_fat,usda_fat,usda_match,data_type',
    ...rows.sort((a, b) => b.uses - a.uses).map(r => [
      `"${r.key}"`, r.uses, r.ours.kcal, r.theirs.kcal?.toFixed(1) ?? '', r.deltaPct.toFixed(1),
      r.ours.protein, r.theirs.protein?.toFixed(1) ?? '',
      r.ours.carbs, r.theirs.carbs?.toFixed(1) ?? '',
      r.ours.fat, r.theirs.fat?.toFixed(1) ?? '',
      `"${r.theirs.description ?? ''}"`, r.theirs.dataType ?? '',
    ].join(',')),
  ];
  const out = '/Users/vanessa/hitt-app/scripts/recipe-nutrition/fdc-comparison.csv';
  writeFileSync(out, csv.join('\n'));
  console.log(`\nFull comparison written: ${out}`);

  const remaining = keys.length - Object.keys(cache).length;
  if (remaining > 0) console.log(`\n${remaining} foods still to look up — re-run to continue.`);
}

main().catch(err => { console.error(err); process.exit(1); });
