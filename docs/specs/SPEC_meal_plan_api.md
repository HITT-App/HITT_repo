# Spec: Spoonacular meal plan integration

**Status:** Proposed
**Owner:** Vanessa (with Jeffrey / Claude implementation)
**Last updated:** 2026-06-24

---

## Problem

Gemini's `recommend_meal_plan` tool path is ~80% reliable. The failure modes are LLM-side:

- Model emits `tool_code\nprint(default_api.recommend_meal_plan(...))` as text instead of a structured tool call
- Safety filter sometimes blocks responses with aggressive macro numbers (e.g. 250g protein)
- Stochastic token sampling occasionally lands on an empty completion

We're patching with retries + an empty-completion guard, but the underlying issue is that we're asking the LLM to do two things at once: **(a) understand the user's intent and macros**, and **(b) invent meals that arithmetically sum to those macros**. (b) is where it slips.

A meal plan API does (b) deterministically. The LLM only handles (a).

---

## Why Spoonacular

| API | Macro-target plan generation | Recipes incl. instructions | Cost (5k/day) | Best for |
|---|---|---|---|---|
| **Spoonacular** | ✅ `/mealplanner/generate` | ✅ Full recipe + steps | **$29/mo** | Generating plans by macros |
| Nutritionix | ❌ Logging-focused | ❌ No recipe DB | $499/mo | Logging branded foods |
| Edamam | Partial (filter recipes) | ✅ Yes | $49/mo+ | Recipe search, not bulk plans |
| USDA FDC | ❌ No recipes | ❌ Ingredient-level only | Free | Whole-food macro lookups |

Spoonacular wins because:
- It accepts a calorie target and *builds a day around it*. We don't have to assemble meals ourselves.
- Each generated meal links to a full recipe with ingredients and step-by-step instructions — exactly the shape of our existing `MealInPlan` type.
- $29/mo unlocks 5,000 points/day = ~830 meal plans/day. Comfortable runway.

---

## API surface (what we'd call)

### 1. `GET /mealplanner/generate`

Generates a full day matching a calorie target and diet/exclusion filters.

```http
GET https://api.spoonacular.com/mealplanner/generate
  ?apiKey=$SPOONACULAR_KEY
  &timeFrame=day
  &targetCalories=2500
  &diet=                       (optional: ketogenic | paleo | vegan | …)
  &exclude=                    (comma-sep ingredients to skip)
```

**Response:**

```json
{
  "meals": [
    { "id": 715415, "imageType": "jpg", "title": "Red Lentil Soup with Chicken and Turnips", "readyInMinutes": 55, "servings": 4 },
    { "id": 716406, "imageType": "jpg", "title": "Asparagus and Pea Soup: Real Convenience Food", "readyInMinutes": 20, "servings": 2 },
    { "id": 644387, "imageType": "jpg", "title": "Garlicky Kale", "readyInMinutes": 45, "servings": 2 }
  ],
  "nutrients": { "calories": 2503.4, "protein": 110.5, "fat": 87.4, "carbohydrates": 312.1 }
}
```

**Cost:** 1 point per generated meal (3–5 points per request).

### 2. `GET /recipes/{id}/information?includeNutrition=true`

The `/mealplanner/generate` response only gives titles. We need full recipe data — ingredients, instructions, per-recipe macros — to populate the existing `MealInPlan` shape.

```http
GET https://api.spoonacular.com/recipes/{id}/information
  ?apiKey=$SPOONACULAR_KEY
  &includeNutrition=true
```

**Response (trimmed):**

```json
{
  "id": 715415,
  "title": "Red Lentil Soup with Chicken and Turnips",
  "extendedIngredients": [
    { "amount": 1.5, "unit": "cups", "name": "red lentils" },
    { "amount": 6, "unit": "cups", "name": "chicken broth" }
  ],
  "analyzedInstructions": [{ "steps": [
    { "number": 1, "step": "Heat oil in a large saucepan…" },
    { "number": 2, "step": "Add lentils and broth…" }
  ]}],
  "nutrition": {
    "nutrients": [
      { "name": "Calories", "amount": 478, "unit": "kcal" },
      { "name": "Protein",  "amount": 32,  "unit": "g" },
      ...
    ]
  }
}
```

**Cost:** 1 point per recipe.

### Macro filtering when targets are tight

`/mealplanner/generate` doesn't have a `targetProtein` param — only `targetCalories`. For protein/macro-specific requests we'd use `/recipes/complexSearch` instead:

```http
GET /recipes/complexSearch
  ?minProtein=70&maxProtein=90    (per recipe)
  &minCalories=600&maxCalories=900
  &number=3                       (3 recipes for the day)
  &addRecipeNutrition=true        (includes macros in response, saves a call)
  &addRecipeInstructions=true
```

This is more flexible — we'd query 3 separate ranges (breakfast / lunch / dinner share of the day's targets) and stitch them together. Worth implementing as the primary path since macro targets are the failure mode we're solving.

---

## Cost projection

Per meal plan request:
- 3× `complexSearch` calls @ 1 pt each = **3 points**
- (No recipe-info follow-ups needed if we use `addRecipeNutrition` + `addRecipeInstructions`)

| Tier | Points/day | Meal plans/day | Cost |
|---|---|---|---|
| Free | 150 | ~50 | $0 |
| Cook | 1,500 | ~500 | $9/mo |
| Sous Chef | 5,000 | ~1,600 | $29/mo |
| Chef | 10,000 | ~3,300 | $79/mo |

**Recommendation:** start on free, upgrade to Cook ($9/mo) when active users exceed ~30/day, Sous Chef when above ~150/day.

---

## Integration architecture

The change is server-side in `supabase/functions/ai-coach/index.ts`. Frontend stays the same — it just receives a `recommend_meal_plan` action like today.

### New flow

```
User: "give me meals for 2500 cal with 250g protein"
        │
        ▼
ai-coach edge function (Gemini)
        │
        ├─ LLM extracts intent + targets via NEW tool: extract_meal_targets
        │    returns { calories: 2500, protein_g: 250, diet: null, exclude: [] }
        │
        ▼
ai-coach calls Spoonacular /recipes/complexSearch × 3
        │  (breakfast 30%, lunch 35%, dinner 35% share of targets)
        │
        ▼
ai-coach maps Spoonacular recipes → MealInPlan[] shape
        │
        ▼
Emits recommend_meal_plan action with real recipes
        │
        ▼
Frontend (JarvisMode) renders meal plan card (no changes)
```

### Key files to change

| File | Change |
|---|---|
| `supabase/functions/ai-coach/index.ts` | Replace direct `recommend_meal_plan` tool with a two-step: `extract_meal_targets` (LLM) → Spoonacular call → action emit |
| `supabase/functions/_shared/spoonacular.ts` (new) | Wrapper around Spoonacular endpoints with error handling, key from env |
| Supabase secret `SPOONACULAR_API_KEY` | Stored in dashboard, accessed via `Deno.env.get` |
| `src/hooks/useAI.types.ts` | No changes — `MealInPlan` shape already matches what we'll emit |
| `tests/run.ts` | New AI-11: assert Spoonacular meal plans hit macro targets within ±5% (much tighter than ±10/±20 we accept from the LLM) |

### Tool schema change

Replace the existing `recommend_meal_plan` tool (which asks the LLM to invent the whole plan) with `extract_meal_targets`:

```typescript
{
  name: "extract_meal_targets",
  description: "Call when the user asks for a meal plan, day of eating, food ideas, or what to eat. Extract their calorie / macro / dietary constraints from the message. The server will use these to fetch real recipes — do NOT invent meal data yourself.",
  parameters: {
    calories: { type: "integer", description: "Daily calorie target. If unspecified, use 2000." },
    protein_g: { type: "integer | null", description: "Daily protein target in grams. null if unspecified." },
    carbs_g:   { type: "integer | null" },
    fat_g:     { type: "integer | null" },
    diet:      { type: "string | null", enum: ["vegan", "vegetarian", "paleo", "keto", "gluten-free", null] },
    exclude:   { type: "array of strings", description: "Ingredients to avoid (allergens, dislikes)." },
    meals_per_day: { type: "integer", description: "3 by default. 4 if user mentions snacks. 5 for bodybuilders." }
  }
}
```

The LLM is now doing what it's *actually* good at (parsing natural language) and not what it's bad at (multi-step arithmetic that sums to constraints).

### Data mapping: Spoonacular → MealInPlan

```typescript
function spoonacularToMealInPlan(
  recipe: SpoonacularRecipe,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): MealInPlan {
  const n = recipe.nutrition.nutrients;
  return {
    meal_type: mealType,
    name: recipe.title,
    emoji: pickEmoji(mealType),
    description: recipe.summary?.slice(0, 120) ?? '',
    calories:    Math.round(n.find(x => x.name === 'Calories')?.amount ?? 0),
    protein_g:   Math.round(n.find(x => x.name === 'Protein')?.amount ?? 0),
    carbs_g:     Math.round(n.find(x => x.name === 'Carbohydrates')?.amount ?? 0),
    fat_g:       Math.round(n.find(x => x.name === 'Fat')?.amount ?? 0),
    ingredients: recipe.extendedIngredients.map(i => ({
      amount: String(i.amount),
      unit:   i.unit,
      name:   i.name,
    })),
    instructions: recipe.analyzedInstructions[0]?.steps.map(s => s.step) ?? [],
  };
}
```

### Fallback strategy

Spoonacular is a third party. If it's down or rate-limited, we don't want users blocked.

1. Try Spoonacular first
2. On 5xx / network error / quota exceeded → fall back to the current LLM-generated path (with retries)
3. If both fail → empty-completion guard message

This means we're never *worse* off than today — only better when Spoonacular is up.

---

## What this removes

- The retry path for `recommend_meal_plan` (no longer needed — Spoonacular doesn't randomly fail)
- The `tool_code` text-leak detection (LLM no longer generates the meal data, so it can't leak that format)
- The empty-completion guard for meal plans specifically (still applies to other intents)
- The `temperature: 0.3` tweak (was a band-aid for tool-call reliability; no longer needed)
- AI-09's 5x retry test → replaced with a stricter single-shot AI-11 (Spoonacular is deterministic)

System prompt also shrinks — no more CRITICAL MEAL PLAN directive needed.

---

## Open questions

1. **Image handling.** Spoonacular returns recipe images on a CDN. Do we display them in the meal plan card? (Currently the card uses an emoji.) Pulling images adds visual polish but means each meal plan loads 3 external images.
2. **Recipe variety / staleness.** Spoonacular returns the same top-ranked recipes on identical queries. Do we add a random offset or `sort=random` to surface variety across days?
3. **Caching.** Should we cache `complexSearch` responses by `(calorieRange, proteinRange, diet)` for a few hours? Reduces cost and improves latency. Risk: users get the same plan twice in a session.
4. **User-supplied recipes.** Long-term, do we let users save favourite Spoonacular recipes? That's a separate `recipes` table in Supabase, not a launch blocker.
5. **Restaurant items.** Spoonacular is recipe-only. If we want to suggest a Chipotle bowl as a lunch option, we'd still need Nutritionix. Out of scope for this spec.

---

## Implementation plan

| Step | Effort | Notes |
|---|---|---|
| 1. Sign up for Spoonacular, get free-tier key | 5 min | https://spoonacular.com/food-api |
| 2. Add `SPOONACULAR_API_KEY` to Supabase secrets | 2 min | Dashboard → Edge Functions → Secrets |
| 3. Write `supabase/functions/_shared/spoonacular.ts` wrapper | 30 min | Two functions: `searchRecipes(filters)`, `getRecipeInfo(id)`. Error handling for 401, 402 (quota), 5xx. |
| 4. Replace `recommend_meal_plan` tool with `extract_meal_targets` | 20 min | Update STRUCTURED_TOOLS array and the case handler |
| 5. Add Spoonacular call + mapping in case handler | 45 min | The new orchestration path |
| 6. Frontend: no changes | 0 min | The emitted action is still `recommend_meal_plan` with the same `MealInPlan[]` payload |
| 7. Add AI-11 test (live macro-target test, expects Spoonacular result within ±5%) | 20 min | |
| 8. Live test, deploy, monitor logs for 24h | — | Watch for Spoonacular quota usage in dashboard |

**Total dev time:** ~2 hours.

---

## Decision

Ship as-is or revisit later? My recommendation: ship it.

- Solves the reliability bug at the root (not via more LLM retries)
- Real recipes look more professional than LLM-invented ones
- The first 50 meal plans/day are free for testing; cost stays under $30/mo through hundreds of daily active users
- The implementation is a straightforward two-hour task

The only real downside is one external dependency. The fallback to today's LLM path mitigates that.
