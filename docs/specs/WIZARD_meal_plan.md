# Meal Plan Wizard — visual spec

Each screen renders inline in the Jarvis conversation as a card (same pattern
as `MultiChoiceCard` and `JarvisDietaryPrefsCard`). The user taps through; the
wizard maintains its own state. On submit, the parameters get passed to
Spoonacular and a `recommend_meal_plan` action is emitted.

Trigger: LLM detects vague meal-plan intent ("plan my meals", "what should I
eat", "any meal ideas") and calls `open_meal_plan_wizard` tool. The fast-path
regex (explicit numbers) skips the wizard entirely.

Cards are dismissible — back arrow returns to the previous screen, X cancels
the whole wizard.

---

## Screen 1 — Scope

```
┌───────────────────────────────────────────────┐
│  🍽️                                         × │
│                                               │
│  PLAN YOUR FOOD                               │
│  What are you looking for?                    │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │       One meal suggestion       →       │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │       Full day meal plan        →       │  │
│  └─────────────────────────────────────────┘  │
│                                               │
└───────────────────────────────────────────────┘
```

- Primary action: tap a button → advances to Screen 2
- The eyebrow ("PLAN YOUR FOOD") matches the small-caps style used elsewhere
- No "skip" — if they don't want either, they hit X

---

## Screen 2a — Calorie target (one meal path)

```
┌───────────────────────────────────────────────┐
│  ←  🔥                                      × │
│                                               │
│  CALORIE BUDGET                               │
│  How many calories for this meal?             │
│                                               │
│  You've eaten 1,420 kcal today.               │
│  You have 1,080 kcal remaining.               │
│                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │  300 │ │  500 │ │  700 │ │  Use │         │
│  │      │ │      │ │      │ │remaining│       │
│  └──────┘ └──────┘ └──────┘ └──────┘         │
│                                               │
│  Or enter a custom amount:                    │
│  ┌─────────────────────────────────────────┐  │
│  │  [        ] kcal                        │  │
│  └─────────────────────────────────────────┘  │
│                                               │
└───────────────────────────────────────────────┘
```

- Pre-fetched from `meal_logs` on wizard open
- Quick-pick chips for common sizes
- "Use remaining" pre-fills the remaining-for-today value
- Custom number input as a fallback

---

## Screen 2b — Calorie target (full day path)

```
┌───────────────────────────────────────────────┐
│  ←  🔥                                      × │
│                                               │
│  DAILY CALORIE TARGET                         │
│  How many calories for the day?               │
│                                               │
│  Your usual target is 2,500 kcal.             │
│  (set in Nutrition settings)                  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │       Use my target (2,500)             │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  Or enter a different amount:                 │
│  ┌─────────────────────────────────────────┐  │
│  │  [        ] kcal                        │  │
│  └─────────────────────────────────────────┘  │
│                                               │
└───────────────────────────────────────────────┘
```

- Reads `nutrition_profiles.daily_calorie_target` (or whatever the field is
  called — verify before implementing)
- If no target on file, fall back to suggesting 2,000 with a small note
- Custom amount input is text-only numeric

---

## Screen 3 — Macro targeting

```
┌───────────────────────────────────────────────┐
│  ←  ⚖️                                      × │
│                                               │
│  WANT TO TARGET MACROS?                       │
│  Pick any that matter for this plan.          │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  ☑  Protein                             │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  ☐  Carbs                               │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  ☐  Fat                                 │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │              Continue          →        │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  [ Skip — no macro targets ]                  │
│                                               │
└───────────────────────────────────────────────┘
```

- Multi-select, protein pre-checked (most-asked-for)
- Skip link at bottom for users who just want a balanced plan
- Continue button is disabled if nothing is checked AND skip not tapped

---

## Screen 4 — Macro amounts (combined, only sections for checked macros)

Single screen with one row per macro the user ticked on Screen 3. If only
protein is ticked, only the protein row renders — keeps the screen compact.

```
┌───────────────────────────────────────────────┐
│  ←  ⚖️                                      × │
│                                               │
│  MACRO TARGETS                                │
│  How much of each per meal?                   │
│  (for the full day, totals are summed across  │
│   3–5 meals)                                  │
│                                               │
│  ─── 🥩 Protein ────────────────────────────  │
│  Guideline: 1.6–2.2 g/kg bodyweight.          │
│  At 70 kg that's 110–155g per day, ~37–52g    │
│  per meal.                                    │
│                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ 30g  │ │ 40g  │ │ 50g  │ │ 60g  │         │
│  └──────┘ └──────┘ └──────┘ └──────┘         │
│  ┌─────────────────────────────────────────┐  │
│  │  [        ] g  — or enter custom        │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ─── 🌾 Carbs ──────────────────────────────  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ 30g  │ │ 60g  │ │ 90g  │ │ 120g │         │
│  └──────┘ └──────┘ └──────┘ └──────┘         │
│  ┌─────────────────────────────────────────┐  │
│  │  [        ] g                           │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ─── 🥑 Fat ────────────────────────────────  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ 10g  │ │ 15g  │ │ 20g  │ │ 30g  │         │
│  └──────┘ └──────┘ └──────┘ └──────┘         │
│  ┌─────────────────────────────────────────┐  │
│  │  [        ] g                           │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │              Continue          →        │  │
│  └─────────────────────────────────────────┘  │
│                                               │
└───────────────────────────────────────────────┘
```

- **All values are per-meal regardless of scope.** For full-day plans the
  wizard sums them across the requested number of meals (3 by default, 4–5
  if user mentions snacks elsewhere). Per-meal numbers are more intuitive
  than "total daily protein" for most users.
- Bodyweight pulled from profile (`profiles.weight_kg`). Guideline only shown
  on the protein row, only if weight is on file.
- Quick-pick chips for each macro
- Per-meal chip values: protein 30/40/50/60g, carbs 30/60/90/120g, fat 10/15/20/30g
- Carbs / fat sections only appear if those macros were ticked on Screen 3
- Continue button is disabled until every visible macro has a value selected
  or typed

---

## Screen 5 — Protein source

```
┌───────────────────────────────────────────────┐
│  ←  🍗                                      × │
│                                               │
│  PROTEIN SOURCE                               │
│  Any preference for the meals?                │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │       Chef's choice (no preference)     │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  ☐  Lean meat (chicken, turkey)         │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  ☐  Red meat (beef, lamb)               │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  ☐  Fish & seafood                      │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  ☐  Plant-based (tofu, legumes, etc.)   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ─── Or be specific ───────────────────────  │
│  ┌─────────────────────────────────────────┐  │
│  │  [ e.g. salmon, elk, paneer       ]     │  │
│  └─────────────────────────────────────────┘  │
│  Comma-separated. Overrides bucket selection. │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │              Continue          →        │  │
│  └─────────────────────────────────────────┘  │
│                                               │
└───────────────────────────────────────────────┘
```

- **Diet-aware filtering:** if `nutrition_profiles.food_preferences` includes
  `vegetarian`, only show the plant-based option + "Chef's choice"
- If `vegan`, same as vegetarian (plant-based only)
- If `pescatarian`, hide red meat and lean meat, keep fish + plant-based
- If `omnivore` or unset → show all four (as above)
- "Chef's choice" deselects everything else (radio-like behaviour at the top)
- Otherwise multi-select — user can pick "lean meat + fish"
- **Free-type field below the buckets** for users who want something specific
  ("elk", "venison", "paneer", "tempeh"). If filled, the typed list takes
  precedence over the bucket selection on the Spoonacular query. Validates
  against the diet prefs — e.g. typing "salmon" while vegetarian is on file
  shows an inline warning and refuses to continue.

This screen only appears for one-meal mode or when protein was a targeted
macro. For a balanced day plan with no protein target, skip this screen.

---

## Screen 6 — Confirmation

```
┌───────────────────────────────────────────────┐
│  ←  ✨                                      × │
│                                               │
│  REVIEW                                       │
│  Here's what I'm finding for you:             │
│                                               │
│  • Full day · 2,500 kcal                      │
│  • Protein target: 50 g per meal              │
│  • Source: Lean meat, Fish                    │
│  • Vegetarian dietary prefs respected         │
│  • Excluding: nuts (allergy on file)          │
│                                               │
│  ┌──────────────────────────────────────┐     │
│  │ ☐  Save these as my defaults — skip  │     │
│  │    the wizard next time              │     │
│  └──────────────────────────────────────┘     │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │       Find my meals          →          │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ← Edit                                       │
│                                               │
└───────────────────────────────────────────────┘
```

- Summary of every choice so the user can verify before the API call
- Allergens auto-pulled from `nutrition_profiles.allergies` and listed for
  transparency — user doesn't have to manage them in the wizard
- "Edit" goes back to Screen 1 with state preserved
- **Save as defaults** writes the wizard choices to a new
  `meal_plan_defaults` jsonb column on `nutrition_profiles`. On future
  meal-plan requests, the LLM still triggers the wizard, but the wizard
  opens directly on Screen 6 (Review) with the saved values pre-filled —
  user just taps "Find my meals" and goes. The "Edit" link still lets them
  override for a one-off plan without losing the defaults.
- If defaults exist on the profile, Screen 1 also shows a small
  "✨ Use my saved defaults →" shortcut button at the top that jumps
  straight to Screen 6.

---

## Screen 7 — Generating

```
┌───────────────────────────────────────────────┐
│                                               │
│        🌀  Building your plan…                │
│                                               │
│        Searching for the right meals.         │
│                                               │
└───────────────────────────────────────────────┘
```

- Shown while Spoonacular fetches (~1–2s typical)
- Card auto-replaces with the meal plan on response

---

## Empty / edge states

**No calorie target on file (Screen 2b):**
> "Your nutrition profile doesn't have a daily target yet. You can set one in
> Nutrition Settings, or pick from common options below."
> Then the 4-chip quick picker: 1,800 / 2,000 / 2,500 / 3,000 kcal

**Single meal but no meals logged today (Screen 2a):**
> "You haven't logged anything today yet."
> Skip the "remaining" line, just show the chips and custom input.

**Vegetarian / vegan user on Screen 5:**
> Show only "Chef's choice" + "Plant-based" — both visible so the screen
> doesn't feel weirdly empty. Subtext: "Filtered by your dietary preferences."

**Allergies on file:**
> Surface them on the confirmation screen (Screen 6) so the user can see
> they're being respected. No separate screen for entering them — they
> already live in the profile.

---

## Visual notes

- Card background: `bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-3` (matches existing pattern)
- Icons in headers: orange `text-primary` lucide icons sized 24px
- Eyebrow text: `text-[10px] font-semibold tracking-wider text-muted-foreground uppercase`
- Button rows: 12px gap, primary fills width on its own line, ghost variants for secondary
- Chip rows: 4 chips per row, equal width, rounded-xl, secondary background
- Number inputs: rounded-xl, bordered, with right-aligned unit suffix (kcal / g)
- Back/X buttons: top-left and top-right, 32px tap targets, ghost variant

---

## State that needs to be tracked

```typescript
type WizardState = {
  step: 1 | '2a' | '2b' | 3 | 4 | 5 | 6 | 7
  scope: 'meal' | 'day' | null
  calories: number | null            // per-meal if scope='meal', per-day if 'day'
  macros: { protein: boolean; carbs: boolean; fat: boolean }
  // All macro values are PER MEAL. For day plans we sum across mealsCount.
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  proteinSources: Array<'lean' | 'red' | 'fish' | 'plant' | 'any'>
  proteinFreeText: string             // comma-separated, overrides buckets if non-empty
  mealsCount: number                  // 3 default, 4–5 if snacks requested
  saveAsDefaults: boolean             // tick on Screen 6
  // Auto-pulled from profile (read-only in wizard):
  remainingToday: number    // from meal_logs query
  dailyTarget: number       // from nutrition_profiles
  weightKg: number | null
  dietPrefs: string[]       // for filtering Screen 5
  allergies: string[]       // shown on Screen 6
}
```

### Saved defaults (new DB column)

```sql
alter table nutrition_profiles
  add column meal_plan_defaults jsonb;
```

Shape stored in the column:

```json
{
  "scope": "day",
  "calories": 2500,
  "macros": { "protein": true, "carbs": false, "fat": false },
  "proteinG": 50,
  "carbsG": null,
  "fatG": null,
  "proteinSources": ["lean", "fish"],
  "proteinFreeText": "",
  "mealsCount": 3,
  "savedAt": "2026-06-25T..."
}
```

Read on wizard open; if present, Screen 1 shows the "Use my saved defaults"
shortcut. If user un-checks "Save as defaults" on a future run, clear the
column.

---

## Submit payload to Spoonacular

The wizard collects per-meal values. Spoonacular's `complexSearch` filters
operate per-recipe, so for full-day plans we make one call per meal with the
same per-meal macro range each time (the recipes returned for each meal slot
will sum to roughly the full-day total).

```typescript
const baseQuery = {
  // Per-meal calorie range (5kcal each side for tight matching)
  minCalories: state.calories! - 50,
  maxCalories: state.calories! + 50,

  // Per-meal macro ranges (only included if user targeted that macro)
  minProtein: state.macros.protein ? state.proteinG! - 10 : undefined,
  maxProtein: state.macros.protein ? state.proteinG! + 10 : undefined,
  minCarbs:   state.macros.carbs   ? state.carbsG!   - 15 : undefined,
  maxCarbs:   state.macros.carbs   ? state.carbsG!   + 15 : undefined,
  minFat:     state.macros.fat     ? state.fatG!     -  5 : undefined,
  maxFat:     state.macros.fat     ? state.fatG!     +  5 : undefined,

  // From profile + protein-source screen
  diet:         deriveDiet(state.dietPrefs),    // 'vegetarian' | 'vegan' | …
  intolerances: state.allergies.join(','),
  includeIngredients: state.proteinFreeText.trim()
    ? state.proteinFreeText                              // free-type overrides
    : state.proteinSources.map(toKeyword).join(','),     // bucket → keyword list

  // Variety — random offset so repeated runs return different recipes
  offset: Math.floor(Math.random() * 50),
  sort: 'random',

  addRecipeNutrition: true,
  addRecipeInstructions: true,
};

// One call per meal slot
const mealCount = state.scope === 'day' ? state.mealsCount : 1;
const callsByMeal: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> =
  mealCount === 1 ? ['lunch']
  : mealCount === 3 ? ['breakfast', 'lunch', 'dinner']
  : mealCount === 4 ? ['breakfast', 'lunch', 'dinner', 'snack']
  : ['breakfast', 'lunch', 'dinner', 'snack', 'snack'];

const results = await Promise.all(
  callsByMeal.map(slot =>
    spoonacularSearch({ ...baseQuery, type: slotToType(slot), number: 1 })
  )
);
```

`type` (breakfast / main course / side dish / etc) helps Spoonacular pick
appropriate recipes for each slot. Random offset + `sort=random` solve the
"same recipes every time" problem (decision #5).

---

## Decisions log

| # | Question | Decision |
|---|---|---|
| 1 | Macro amounts: separate screens or combined? | **Combined** — one screen, sections only for macros the user ticked |
| 2 | Bodyweight guideline range? | **Keep 1.6–2.2 g/kg** — standard active-person advice |
| 3 | "Other" protein option? | **Buckets + free-type field** — comma-separated, overrides bucket selection if filled, validates against diet prefs |
| 4 | One-meal protein: daily or per-meal? | **Per-meal** — applies to all macros and all scopes, simpler mental model |
| 5 | Recipe variety on repeated runs? | **Yes** — `sort=random` + `offset: random(0–50)` on the Spoonacular query |
| 6 | Save choices as defaults? | **Yes** — new `meal_plan_defaults` jsonb column on `nutrition_profiles`. Tick on Screen 6, surfaces "Use my saved defaults" shortcut on Screen 1 of future runs |

---

## Implementation phases

1. **DB migration** — add `meal_plan_defaults` column to `nutrition_profiles`
2. **Spoonacular wrapper** — `_shared/spoonacular.ts` with `searchRecipes` and error handling
3. **Edge function** — add `open_meal_plan_wizard` tool and `extract_meal_targets` tool (the regex fast-path doesn't need either, but the LLM-triggered wizard does)
4. **Frontend wizard component** — `JarvisMealPlanWizard.tsx`, state machine, screens 1–7
5. **Wire to JarvisMode** — new dispatcher case `open_meal_plan_wizard` that mounts the wizard
6. **Defaults shortcut** — Screen 1 reads profile, shows shortcut if defaults exist
7. **Tests** — wizard happy path, defaults round-trip, diet-aware filtering, free-type validation
8. **Live integration test** — call Spoonacular with realistic macro targets, assert recipes returned within ±10%
