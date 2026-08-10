# Owner recipe pack — August 2026

Preparation record for the owner's 1000-recipe drop (`files (3).zip` → `meal_db/categories/*.json`).
**Nothing has been applied to the database yet** — the two migrations below are generated and
statically validated but unrun.

Final pack: **973 recipes, 4,121 ingredients, 3,888 steps.**

## What shipped

| File | Purpose |
|---|---|
| `supabase/migrations/20260810120000_recipes_meal_type_categories.sql` | Schema: two new meal slots, `external_id`, `goals[]`, the pack's extra nutrition columns |
| `supabase/migrations/20260810120100_seed_owner_recipe_pack_2026_08.sql` | Data: 973 recipes, 4,121 ingredients, 3,888 steps |
| `scripts/recipe-pack/audit_recipe_drop.py` | Allergen / duplicate / tag audit of a raw drop |
| `scripts/recipe-pack/prepare_owner_recipe_pack.py` | Raw drop → normalised payload + review queue |
| `scripts/recipe-pack/generate_migrations.py` | Payload → the two migrations |
| `scripts/recipe-pack/recompute_pack_nutrition.ts` | Derives macros from ingredients — **not applied, see below** |
| `scripts/recipe-pack/review.tsv` | 18 rows a human must confirm |
| `scripts/recipe-pack/dropped_duplicates.tsv` | The 22 removed duplicates and what each maps to |
| `scripts/recipe-pack/nutrition_recompute.tsv` | Per-recipe derived-vs-supplied macro diff |

Both Python scripts take the pack directory as their first argument:

```bash
python3 scripts/recipe-pack/prepare_owner_recipe_pack.py <pack-dir>
python3 scripts/recipe-pack/generate_migrations.py <pack-dir>
```

## Owner decisions applied

- **Tortillas are corn.** `tortilla` was removed from the gluten detector entirely, so tortillas and
  tortilla chips carry no gluten allergen and no longer invalidate a Gluten Free claim. This cleared
  8 of the original 29 review rows (`CHT-004`, `CHT-022`, `CHT-114`, `DIN-084`).
- **Five recipes removed** (`EXCLUDE` in `prepare_owner_recipe_pack.py`):
  - `DIN-063` — malformed ingredient line `40g Feta-Free (use Dairy-Free Feta) or omit`.
  - `DIN-111` / `DIN-182` and `LUN-124` / `LUN-186` — near-identical pairs whose stated macros
    contradict their ingredient lists (an omitted olive oil the calories don't reflect).

## Taxonomy decision — categorise by meal type, not goal

Per the owner: categories should describe the **type of meal**, for browse variety.

- `meal_type` — the coarse slot. Extended from 7 to 9 values with **`dessert`** and **`cheat_meal`**.
- `category` — now the **dish type**, normalised from the drop's `sub_type` (83 values:
  `salad`, `curry`, `overnight_oats`, `jacket_potato`, `healthy_fry_up`, …). Near-duplicate
  sub_types were merged (`winter_comfort_meal` → `winter_comfort`, `wraps`/`breakfast_wrap` → `wrap`).
- `goals[]` — **new column.** The goal axis had to go somewhere: `ai-coach` selects owner recipes
  by goal via `category`, and with `category` repurposed the whole pack would have been invisible
  to the meal planner. Its no-results retry would not have covered this, because the 927 older
  rows alone keep the strict query non-empty. `Fat Loss → lose_weight`, `Muscle Gain → build_muscle`,
  `Weight Gain → gain_weight`; every recipe in the pack has at least one.

The drop's other `goal` values aren't goals and were handled elsewhere: Budget / Family Friendly /
BBQ Meal already exist as dish categories, and `High Fibre` became the `high_fibre` dietary tag.

### Code changed alongside

- `supabase/functions/ai-coach/index.ts` — owner-recipe query now matches
  `category.eq.<goal>` **or** `goals.cs.{<goal>}`. **Needs `supabase functions deploy ai-coach`
  when the migrations are applied**, otherwise the planner ignores the pack.
- `src/pages/BrowseMeals.tsx` — `dessert` + `cheat_meal` added to the meal-type filter, a
  `MEAL_TYPE_LABEL` map so `cheat_meal` renders as "Cheat Meals", and two new landing shelves.

## Nutrition: recomputed, reviewed, and NOT applied

`scripts/recipe-pack/recompute_pack_nutrition.ts` drives the same USDA-reconciled `food-table.ts`,
portion rules and correction rules as `scripts/recipe-nutrition/recompute.ts` over this pack. It
exists, it runs, and its output is in `nutrition_recompute.tsv` — but **the derived macros were
deliberately not written into the seed**, because they are wrong in a way that would be invisible
after import.

**The defect: dry vs cooked weight.** `FOODS['oats']` is *cooked* porridge — 71 kcal/100 g,
`cooked: true` — because the pre-existing corpus writes oats as cooked weight. This pack writes
them **dry**: it says "Cooked" explicitly when it means cooked (`600g Cooked Basmati Rice`), so a
bare `50g Oats` is 50 g dry, about 190 kcal. Costing that at the cooked rate understates it ~2.7×.

Measured over the 247 recipes that passed the safety gate:

- **57** contain a dry-written staple the table treats as cooked (23 foods carry `cooked: true`:
  oats, rice, pasta, couscous, quinoa, lentils, bulgur, beans, …).
- Only **98 of 247** land within ±10% of the author's figures; the spread runs from −86% to +124%.
- Worked example: `BRK-086 Simple Milk & Honey Porridge` (50 g oats, 250 ml semi-skimmed milk,
  10 g honey) went 380 → **171 kcal**. The supplied 380 is about right; the derived figure is not.
- Separately, `BRK-107` costed `6 Quail Eggs` at the generic 50 g-per-egg unit weight — 300 g of egg
  instead of ~54 g — and moved +124%.

The other 726 recipes never reached the gate at all, almost all because one or more ingredients
aren't in the food table (it was built for the older 957-recipe corpus, not this one).

**So the pack ships with the author's supplied macros**, which at least pass an internal consistency
check: all 973 are within 15% of `4·protein + 4·carbs + 9·fat`, and they are genuinely per serving
(verified against the 4- and 8-serving batch recipes).

**To finish the job properly**, someone needs to: add dry-weight entries for the ~23 `cooked: true`
staples and select between them on whether the ingredient line says "cooked"; add a quail-egg unit
weight; and extend `food-table.ts` to cover this pack's ingredient vocabulary. That is health-adjacent
data and shouldn't be guessed at — it wants the same USDA reconciliation the existing table had.

## Vocabulary normalisation

| Incoming | Stored |
|---|---|
| `Milk` | `dairy` |
| `Egg` | `eggs` |
| `Shellfish` | `crustaceans` |
| `Tree Nuts` | `tree nuts` |
| `Gluten Free` | `gluten-free` |
| `Dairy Free` | `dairy_free` |
| `Breakfast` (category) | `breakfast` (meal_type) |

`prep_time` / `cook_time` were free text (`"6 hr (slow cooker)"`, `"0 min (overnight chill)"`) and are
now integer minutes, with the parenthetical preserved in `description`.

## Allergen remediation

The drop's allergen data was materially incomplete: it only ever used nine labels, and **celery,
mustard, sulphites, lupin and molluscs never appeared once** — five of the UK's fourteen, absent
by construction rather than by accident.

Remediation was deliberately **one-directional**, so every automatic edit errs towards over-warning:

- **Allergens are only ever ADDED**, never removed — each from an explicit ingredient match.
- **Free-from tags are only ever REMOVED**, never added.
- **Ambiguous ingredients are never auto-resolved** — they go to `review.tsv`.

Representative catches: all eight scallop dishes declared no molluscs; `BRK-059` listed a fried egg
with `allergens: []`; `DIN-046 Family Fish Pie` contained prawns and wheat flour while declaring
only Fish + Milk **and** carrying a Gluten Free tag; `DES-091`/`DES-104` panna cotta used gelatine
while tagged Vegetarian.

> **This is keyword-derived, not a substitute for the author's own allergen review.** It closes the
> gaps we can prove from ingredient text. It cannot find an allergen the ingredient list itself
> omits — a sauce or stock with undeclared celery, mustard or sulphites will still slip through.

## De-duplication and name cleanup

946 unique ingredient signatures across the original 1000. **22 exact duplicates dropped** (identical
ingredients, servings *and* nutrition — pure renames). **35 batch/portion variants kept** — same dish,
different serving counts; defensible but repetitive in Browse Meals, worth an owner decision.

32 names carried generator artefacts: 20 nonsense `<food>-Free` insertions (`Protein Crab-Free
Vanilla Panna Cotta` → `Protein Vanilla Panna Cotta`) and 12 `Final …` scaffolding prefixes.
Genuine dietary claims were preserved — `DIN-175 Vegan Egg-Free Scramble Dinner Bowl` is untouched.

## Still open

1. **`review.tsv` (18 rows)** — remaining ambiguous ingredients and every automatic tag removal.
2. **The five missing allergen classes** need a full re-pass by the author.
3. **Nutrition derivation** — see the section above; the food table needs dry/cooked handling and
   broader coverage before the recompute can be trusted.
4. **35 batch/portion variants** — keep or collapse.

## Applying

```bash
supabase db push                       # both migrations, in timestamp order
supabase functions deploy ai-coach     # required — see "Code changed alongside"
```

The seed deletes only rows whose `external_id` matches `^(BRK|LUN|DIN|SNK|CHT|DES)-[0-9]+$`, so the
927 pre-existing owner rows (which have no `external_id`) are untouched and re-running is safe.

**The SQL has not been executed.** There is no local Postgres or Docker on this machine, so it was
validated statically: 973/4,121/3,888 rows parsed, 24 columns consistent on every row, quotes
balanced in the SQL body, no NULLs in NOT NULL columns, no `meal_type` outside the new CHECK, and no
child row referencing a missing recipe. Run it against a branch or staging database first.
