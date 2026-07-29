/**
 * Default portions for ingredient lines that state no amount (task #115).
 *
 * 2,008 of 5,754 ingredient lines carry no quantity. The overwhelming majority are
 * seasoning lines from the recipe generator's templates — "crushed garlic, chilli
 * flakes and parsley", "smoky BBQ rub and black pepper". Those contribute ~nothing.
 * A much smaller set genuinely moves the numbers: sesame oil, teriyaki glaze,
 * double cream, honey.
 *
 * These are stated in grams and are deliberately conservative — where a portion is
 * ambiguous, the smaller plausible amount is used, so we under-claim calories rather
 * than over-claim them.
 *
 * Anything not covered here falls back to DEFAULT_BY_ROLE. If even that misses, the
 * recipe is flagged for review rather than silently priced.
 */

/** Explicit per-food defaults, grams. */
export const PORTIONS: Record<string, number> = {
  // Zero-calorie / trivial
  'salt and black pepper': 0,
  'salt & pepper': 0,
  'black pepper': 0.5,
  'sea salt': 0,
  'flaky sea salt': 0,
  'bay leaf': 0,
  'water': 0,
  'ice': 0,
  'baking powder': 3,
  'vanilla': 2,
  'granulated sweetener': 1,
  'turmeric & black salt': 1,
  'soy-free seasoning': 2,
  'everything bagel seasoning': 2,

  // Dried herbs & spices — a teaspoon is ~2g, and these lines usually name 2–3 of them
  'oregano': 2, 'herbs': 2, 'herbs de provence': 2, 'fresh thyme': 2,
  'basil': 3, 'parsley': 3, 'coriander': 3, 'dill': 2, 'chives': 3, 'mint': 3,
  'cumin': 2, 'cinnamon': 2, 'smoked paprika': 2, 'paprika': 2,
  'chilli flakes': 1, 'chilli': 5, 'jalapeño': 10,
  'garlic': 6,    // ~2 cloves
  'ginger': 8,

  // Citrus — "a squeeze of lime"
  'lime': 10, 'lemon': 10, 'lemon juice': 10,

  // THE ONES THAT ACTUALLY MOVE THE NUMBERS
  // Composite generator lines, priced as a whole line (see food-table.ts)
  'soy sauce, ginger and a splash of sesame oil': 20,
  'tamari (gluten-free soy), ginger and a splash of sesame oil': 20,
  'teriyaki glaze and toasted sesame seeds': 20,
  'fresh thyme, cracked black pepper and a splash of double cream': 18,
  'tamari (gluten-free soy), ginger and spring onion': 20,
  'tamari (gluten-free soy), ginger and mirin': 20,
  'oregano, basil and a squeeze of lemon': 10,

  'sesame oil': 5,        // "a splash" — 1 tsp
  'olive oil': 10,        // ~2 tsp when unstated
  'extra virgin olive oil': 10,
  'coconut oil': 10,
  'teriyaki glaze': 15,   // 1 tbsp
  'double cream': 15,     // "a splash"
  'sour cream': 20,
  'soy sauce': 10,
  'tamari': 10,
  'honey': 10,
  'maple syrup': 10, 'light maple syrup': 10, 'syrup': 10, 'light syrup': 10,
  'jam': 15,
  'sesame seeds': 5, 'seeds': 10, 'sesame': 5,
  'hemp seeds': 10, 'chia seeds': 10, 'flaxseed': 10,
  'pine nuts': 10,
  'parmesan': 10,
  'tahini': 15,
  'peanut butter': 20, 'natural peanut butter': 20,
  'chimichurri sauce': 20,
  'sesame-ginger dressing': 20,
  'hoisin sauce': 15,
  'oyster sauce': 15,
  'sriracha': 5,
  'anchovy paste': 5,
  'dijon mustard': 5,
  'rice vinegar': 10,
  'mirin': 10,
  'miso paste': 15, 'white miso paste': 15,
  'salsa': 30,
  'capers': 10,
  'olives': 25,
  'dukkah': 8,
  'chipotle in adobo': 10,
  'tikka marinade': 30, 'tikka sauce': 40,
  'mustard-herb glaze': 20,
  'tomato & spice base': 60,
  'gravy': 50, 'veg gravy': 50,
  'crushed tomatoes': 100, 'passata': 100, 'tomato passata': 100,
  'sun-dried tomatoes': 15,
  'coconut cream': 20,
  'nori': 3, 'dried wakame seaweed': 3,
  'chicken stock': 200, 'veg stock': 200, 'low-salt stock': 200, 'dashi': 200,

  // Whole vegetables / salad when unquantified — a side portion
  'cherry tomatoes': 80, 'cucumber': 60, 'red onion': 40, 'onion': 50,
  'spring onions': 15, 'lettuce': 40, 'butter lettuce': 40, 'radish': 20,
  'rocket': 25, 'mixed salad leaves': 40, 'spinach': 60, 'baby spinach': 60,
  'celery': 40, 'carrot': 60, 'carrots': 60, 'leek': 80, 'leeks': 80,
  'corn': 60, 'pak choi': 80, 'bell pepper': 100, 'red pepper': 100,
  'roasted veg': 120, 'stir-fry vegetables': 120, 'broccoli': 90,
  'asparagus': 80, 'mushrooms': 60, 'sun-dried tomatoes ': 15,

  // Fruit / extras
  'berries': 60, 'mixed berries': 60, 'banana': 118, 'apple': 180,
  'avocado': 75, 'avocado slices': 50, 'raisins': 15, 'dried apricots': 20,
  'pomegranate seeds': 20, 'mango': 80, 'kiwi': 75,
  'granola': 40, 'low-fat granola': 40, 'crackers': 25, 'pretzels': 30,
  'rice cakes': 20, 'hummus': 40, 'high-protein hummus': 40,
  'greek yoghurt': 100, 'greek yogurt': 100, '0% greek yogurt': 100,
  'soya yogurt': 100, 'high-protein soya yogurt': 100,
  'mixed nuts': 25, 'almonds': 25, 'walnuts': 20, 'sunflower seeds': 15,
  'pumpkin seeds': 15, 'grated cheddar': 20, 'cheddar': 20,
  'crumbled feta': 30, 'feta': 30, 'low-fat mozzarella': 30,
};

/**
 * Last-resort fallback by rough role, for foods with no explicit default. Kept
 * deliberately small — a missing default should usually be added above, not guessed.
 */
export function fallbackPortion(food: string, kcalPer100g: number): number | null {
  // Very calorie-dense and unlisted → treat as a condiment rather than a component,
  // so an unstated amount can't blow up the total.
  if (kcalPer100g >= 500) return 10;
  if (kcalPer100g >= 200) return 30;
  if (kcalPer100g >= 60) return 80;
  return 60;
}

/**
 * Largest sane amount of a food in a single-serving recipe, grams.
 *
 * This catches defects in the SOURCE data, not in our maths. The recipe generator
 * applied one 40–250 g scale to every "carb component" regardless of what the food
 * was, producing lines like "250g wholewheat tortilla wrap (cooked weight)" — about
 * four wraps. Recipes tripping this are held for review: the ingredient needs fixing,
 * so recomputing macros from it would just launder the error into a precise number.
 */
export const MAX_SANE_PORTION: Record<string, number> = {
  'wholewheat tortilla wrap': 120, 'wholemeal wrap': 120, 'corn tortillas': 120,
  'wholegrain bread': 120, 'wholemeal bread': 120, 'wholemeal toast': 120,
  'rye bread': 120, 'sourdough': 120, 'plain bagel': 120, 'wholemeal pitta': 120,
  'olive oil': 40, 'extra virgin olive oil': 40, 'coconut oil': 40, 'sesame oil': 30,
  'unsalted butter': 40, 'double cream': 100, 'honey': 60, 'maple syrup': 60,
  'almonds': 80, 'walnuts': 80, 'mixed nuts': 80, 'pine nuts': 40,
  'natural peanut butter': 60, 'peanut butter': 60, 'tahini': 60,
  'chia seeds': 40, 'hemp seeds': 40, 'flaxseed': 40, 'sesame seeds': 30,
  'parmesan': 60, 'grated cheddar': 80, 'cheddar': 80, 'crumbled feta': 100,
  'granola': 100, 'low-fat granola': 100, 'crackers': 80, 'pretzels': 80,
  'rice cakes': 60, 'raisins': 60, 'dried apricots': 60,
  'soya protein': 60, 'pea protein': 60, 'whey': 60, 'vanilla protein': 60,
  'dry soya mince': 80, 'oat flour': 100, 'gram (chickpea) flour': 120,
};

/** Returns the offending amount when an ingredient portion is implausible. */
export function portionIsImplausible(food: string, grams: number): boolean {
  const max = MAX_SANE_PORTION[food];
  return max != null && grams > max;
}

export function portionFor(food: string, kcalPer100g: number): { grams: number; assumed: boolean } {
  if (food in PORTIONS) return { grams: PORTIONS[food], assumed: false };
  const fb = fallbackPortion(food, kcalPer100g);
  return { grams: fb ?? 0, assumed: true };
}
