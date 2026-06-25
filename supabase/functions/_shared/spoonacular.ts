// Spoonacular Food API wrapper.
//
// Used by ai-coach to generate macro-targeted meal plans without relying on
// the LLM to invent meals (which fails ~20% of the time on Gemini).
//
// API key lives in Supabase Edge Function secrets as SPOONACULAR_API_KEY.
// If unset, callers fall back to the LLM path — never throws, returns null.

const BASE = "https://api.spoonacular.com";

export interface SearchFilters {
  // Per-recipe nutrient ranges (Spoonacular treats each recipe as one meal)
  minCalories?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;

  // Diet & exclusions
  diet?: string;                  // 'vegetarian' | 'vegan' | 'paleo' | 'keto' | …
  intolerances?: string;          // comma-separated allergens
  includeIngredients?: string;    // comma-separated ingredients to favour

  // Recipe slot
  type?: string;                  // 'breakfast' | 'main course' | 'side dish' | …

  // Variety
  offset?: number;                // for pagination / variety
  sort?: 'random' | 'popularity' | 'meta-score';

  number?: number;                // how many recipes to return
}

export interface SpoonacularNutrient {
  name: string;
  amount: number;
  unit: string;
}

export interface SpoonacularIngredient {
  amount: number;
  unit: string;
  name: string;
  original?: string;
}

export interface SpoonacularRecipe {
  id: number;
  title: string;
  image?: string;
  imageType?: string;
  readyInMinutes?: number;
  servings?: number;
  summary?: string;
  extendedIngredients?: SpoonacularIngredient[];
  analyzedInstructions?: Array<{ steps: Array<{ number: number; step: string }> }>;
  nutrition?: { nutrients: SpoonacularNutrient[] };
}

export interface SpoonacularSearchResponse {
  results: SpoonacularRecipe[];
  offset: number;
  number: number;
  totalResults: number;
}

function getKey(): string | null {
  return Deno.env.get("SPOONACULAR_API_KEY") ?? null;
}

export function spoonacularConfigured(): boolean {
  return !!getKey();
}

function buildQuery(filters: SearchFilters): string {
  const params = new URLSearchParams();
  params.set("apiKey", getKey()!);
  // Always request nutrition + instructions inline so we don't need a follow-up call
  params.set("addRecipeNutrition", "true");
  params.set("addRecipeInstructions", "true");
  params.set("fillIngredients", "true");

  if (filters.minCalories !== undefined) params.set("minCalories", String(filters.minCalories));
  if (filters.maxCalories !== undefined) params.set("maxCalories", String(filters.maxCalories));
  if (filters.minProtein !== undefined) params.set("minProtein", String(filters.minProtein));
  if (filters.maxProtein !== undefined) params.set("maxProtein", String(filters.maxProtein));
  if (filters.minCarbs !== undefined) params.set("minCarbs", String(filters.minCarbs));
  if (filters.maxCarbs !== undefined) params.set("maxCarbs", String(filters.maxCarbs));
  if (filters.minFat !== undefined) params.set("minFat", String(filters.minFat));
  if (filters.maxFat !== undefined) params.set("maxFat", String(filters.maxFat));

  if (filters.diet) params.set("diet", filters.diet);
  if (filters.intolerances) params.set("intolerances", filters.intolerances);
  if (filters.includeIngredients) params.set("includeIngredients", filters.includeIngredients);

  if (filters.type) params.set("type", filters.type);
  if (filters.offset !== undefined) params.set("offset", String(filters.offset));
  if (filters.sort) params.set("sort", filters.sort);
  params.set("number", String(filters.number ?? 1));

  return params.toString();
}

export async function searchRecipes(filters: SearchFilters): Promise<SpoonacularRecipe[] | null> {
  const key = getKey();
  if (!key) {
    console.warn("[spoonacular] SPOONACULAR_API_KEY not set — caller should fall back");
    return null;
  }

  const url = `${BASE}/recipes/complexSearch?${buildQuery(filters)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      if (res.status === 402) {
        console.error("[spoonacular] quota exceeded (402)");
      } else if (res.status === 401) {
        console.error("[spoonacular] auth failed (401) — check SPOONACULAR_API_KEY");
      } else {
        console.error("[spoonacular] HTTP", res.status, await res.text().catch(() => ""));
      }
      return null;
    }
    const json = await res.json() as SpoonacularSearchResponse;
    return json.results ?? [];
  } catch (err) {
    console.error("[spoonacular] request failed:", (err as Error).message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Map a Spoonacular recipe to the MealInPlan shape the app already uses.
export function recipeToMealInPlan(
  recipe: SpoonacularRecipe,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
) {
  const n = recipe.nutrition?.nutrients ?? [];
  const find = (name: string) => Math.round(n.find(x => x.name === name)?.amount ?? 0);

  const mealEmojis: Record<string, string> = {
    breakfast: '🍳',
    lunch: '🥗',
    dinner: '🍽️',
    snack: '🥪',
  };

  return {
    meal_type: mealType,
    name: recipe.title,
    emoji: mealEmojis[mealType] ?? '🍽️',
    description: (recipe.summary ?? '').replace(/<[^>]+>/g, '').slice(0, 140),
    calories: find('Calories'),
    protein_g: find('Protein'),
    carbs_g: find('Carbohydrates'),
    fat_g: find('Fat'),
    ingredients: (recipe.extendedIngredients ?? []).map(i => ({
      amount: String(i.amount ?? ''),
      unit: i.unit ?? '',
      name: i.name ?? '',
    })),
    instructions: (recipe.analyzedInstructions?.[0]?.steps ?? []).map(s => s.step),
  };
}

// Diet preference list → Spoonacular's diet param (it expects a single string).
// Returns null if none of our prefs map to a Spoonacular diet.
export function dietPrefsToSpoonacular(prefs: string[]): string | null {
  if (!prefs?.length) return null;
  // Spoonacular supports: gluten free, ketogenic, vegetarian, lacto-vegetarian,
  // ovo-vegetarian, vegan, pescetarian, paleo, primal, whole30.
  if (prefs.includes('vegan')) return 'vegan';
  if (prefs.includes('vegetarian')) return 'vegetarian';
  if (prefs.includes('pescatarian')) return 'pescetarian';
  if (prefs.includes('paleo')) return 'paleo';
  if (prefs.includes('keto') || prefs.includes('ketogenic')) return 'ketogenic';
  if (prefs.includes('gluten_free') || prefs.includes('gluten-free')) return 'gluten free';
  return null;
}

// Protein source bucket → Spoonacular-friendly ingredient keyword list.
export function proteinBucketToKeywords(buckets: string[]): string {
  const map: Record<string, string> = {
    lean: 'chicken,turkey',
    red: 'beef,lamb',
    fish: 'salmon,tuna,cod',
    plant: 'tofu,lentils,chickpeas',
  };
  return buckets
    .filter(b => b !== 'any')
    .map(b => map[b] ?? '')
    .filter(Boolean)
    .join(',');
}
