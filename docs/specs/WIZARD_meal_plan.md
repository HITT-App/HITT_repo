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

## Screen 4 — Macro amounts (only for checked macros)

If protein checked, show:

```
┌───────────────────────────────────────────────┐
│  ←  🥩                                      × │
│                                               │
│  PROTEIN TARGET                               │
│  Grams of protein for the day?                │
│                                               │
│  Bodybuilding guideline: 1.6–2.2 g per kg     │
│  bodyweight. For you (70 kg) that's 110–155g. │
│                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ 100g │ │ 150g │ │ 200g │ │ 250g │         │
│  └──────┘ └──────┘ └──────┘ └──────┘         │
│                                               │
│  Or enter a custom amount:                    │
│  ┌─────────────────────────────────────────┐  │
│  │  [        ] g                           │  │
│  └─────────────────────────────────────────┘  │
│                                               │
└───────────────────────────────────────────────┘
```

- Bodyweight pulled from profile (`profiles.weight_kg`)
- If no weight on file, suppress the guideline line and default to the chips
- Repeated screen for carbs / fat if those were checked
- For single-meal path, divides target by 3 in the guideline

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
│  • Protein target: 250 g                      │
│  • Source: Lean meat, Fish                    │
│  • Vegetarian dietary prefs respected         │
│  • Excluding: nuts (allergy on file)          │
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
  calories: number | null
  macros: { protein: boolean; carbs: boolean; fat: boolean }
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  proteinSources: Array<'lean' | 'red' | 'fish' | 'plant' | 'any'>
  // Auto-pulled from profile (read-only in wizard):
  remainingToday: number    // from meal_logs query
  dailyTarget: number       // from nutrition_profiles
  weightKg: number | null
  dietPrefs: string[]       // for filtering Screen 5
  allergies: string[]       // shown on Screen 6
}
```

---

## Submit payload to Spoonacular

```typescript
{
  // Mode
  isFullDay: state.scope === 'day',

  // From calorie target
  targetCalories: state.calories,

  // From macro screens (null if not targeted)
  minProtein: state.macros.protein ? state.proteinG! - 20 : undefined,
  maxProtein: state.macros.protein ? state.proteinG! + 20 : undefined,
  minCarbs:   state.macros.carbs   ? state.carbsG! - 20   : undefined,
  maxCarbs:   state.macros.carbs   ? state.carbsG! + 20   : undefined,
  minFat:     state.macros.fat     ? state.fatG! - 10     : undefined,
  maxFat:     state.macros.fat     ? state.fatG! + 10     : undefined,

  // From profile + protein-source screen
  diet:       deriveDiet(state.dietPrefs),    // 'vegetarian' | 'vegan' | …
  intolerances: state.allergies,
  includeIngredients: state.proteinSources.map(toKeyword), // e.g. ['chicken', 'salmon']

  number: state.scope === 'day' ? 3 : 1,
  addRecipeNutrition: true,
  addRecipeInstructions: true,
}
```

---

## Questions for you before implementation

1. **Step 4 ordering** — if user picks protein + carbs + fat, do we show three
   separate amount screens in sequence, or one combined screen with all three
   sliders/inputs? Combined feels less click-heavy but is busier visually.
2. **Bodyweight guideline (Screen 4)** — currently uses 1.6–2.2 g/kg. Is that
   the right range to display? It's standard "active person" advice; happy
   to adjust.
3. **Protein source = none of the above** — should there be an "other / let
   me type" option for someone who wants a very specific protein (e.g.
   "elk")? Or is the 4-bucket categorisation enough?
4. **One-meal mode protein target** — does the user enter daily protein and
   we calc per-meal share, or do they enter per-meal protein directly? The
   current spec assumes per-day; per-meal might be more intuitive for a
   single-meal request.
5. **Recipe variety** — if the user runs the wizard with the same inputs
   twice, do they want the same meals or different? Spoonacular returns the
   same top-ranked recipes for identical queries. We could add `sort=random`
   to vary.
6. **Save these as defaults?** — should the wizard offer to remember choices
   (e.g. "always vegetarian, always target 200g protein") so subsequent
   plans skip the wizard?
