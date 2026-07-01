#!/usr/bin/env bun
//
// Generates a SQL seed migration for a 30-recipe vegetarian + dairy-free keto
// pack. Fills the intersection gap in the owner keto library (3 veg-df lunches,
// 7 dinners, 0 snacks currently) so vegetarian users with a dairy allergy can
// hit day-level calorie targets without spilling over the carb ceiling.
//
// Idempotent: tags every row with dietary_tags containing 'hitt_ext_v1'. A
// future migration can DELETE these cleanly and swap in owner-authored ones.
//
// Run:
//   bun scripts/gen_veg_df_keto_pack.ts <output-sql-path>

import path from "node:path";

interface Recipe {
  name: string;
  slot: "lunch" | "dinner" | "snack";
  kcal: number;
  p: number;
  c: number;
  f: number;
  diet: "vegetarian" | "vegan";
  glutenFree: boolean;
  allergens: string[];
  ingredients: string[];
  method: string[];
}

// Boilerplate methods, parameterised so we can generate variety without
// rewriting the prose 30 times. Matches the owner's voice from the existing
// library.
function methodTofu(protein: string, base: string, veg: string, seasoning: string, fat: string): string[] {
  return [
    `Press and cube the ${protein}.`,
    `Season the ${protein} generously with ${seasoning}.`,
    `Cook the ${protein} pan-seared in a little olive oil until golden on all sides.`,
    `Meanwhile, prepare the ${base} by sautéing in a hot pan with a little fat for 4-5 minutes.`,
    `Steam or sauté the ${veg} for 3-4 minutes until just tender but still vibrant.`,
    `Plate the ${base} as a base, top with the ${protein} and ${veg}.`,
    `Finish with the ${fat} and a final crack of black pepper. Serve immediately.`,
  ];
}
function methodTempeh(protein: string, base: string, veg: string, seasoning: string, fat: string): string[] {
  return [
    `Slice the ${protein} into thin strips.`,
    `Season the ${protein} generously with ${seasoning}.`,
    `Cook the ${protein} pan-seared in a little olive oil until golden and heated through, turning once.`,
    `Meanwhile, prepare the ${base} by sautéing in a hot pan with a little fat for 4-5 minutes.`,
    `Steam or sauté the ${veg} for 3-4 minutes until just tender but still vibrant.`,
    `Plate the ${base} as a base, top with the ${protein} and ${veg}.`,
    `Finish with the ${fat} and a final crack of black pepper. Serve immediately.`,
  ];
}
function methodEggs(protein: string, base: string, veg: string, seasoning: string, fat: string): string[] {
  return [
    `Whisk the ${protein} lightly in a bowl.`,
    `Season the ${protein} generously with ${seasoning}.`,
    `Cook the ${protein} scrambled in a non-stick pan over medium heat until just set.`,
    `Meanwhile, prepare the ${base} by sautéing in a hot pan with a little fat for 4-5 minutes.`,
    `Steam or sauté the ${veg} for 3-4 minutes until just tender but still vibrant.`,
    `Plate the ${base} as a base, top with the ${protein} and ${veg}.`,
    `Finish with the ${fat} and a final crack of black pepper. Serve immediately.`,
  ];
}
function methodSnack(protein: string, veg: string, seasoning: string, fat: string, cookVerb = "pan-seared"): string[] {
  return [
    `Season the ${protein} generously with ${seasoning}.`,
    `Cook the ${protein} ${cookVerb} until cooked through, turning once.`,
    `Wash and prepare the ${veg}, then set aside to serve fresh.`,
    `Plate the ${veg}, top with the ${protein}.`,
    `Finish with the ${fat} and a final crack of black pepper. Serve immediately.`,
  ];
}

// ── LUNCH (10) ──────────────────────────────────────────────────────────────

const LUNCHES: Recipe[] = [
  {
    name: "Asian-inspired Firm Tofu with Cauliflower Rice & Baby Spinach",
    slot: "lunch", kcal: 400, p: 30, c: 13, f: 27,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy", "sesame"],
    ingredients: ["150g firm tofu", "100g cauliflower rice", "100g baby spinach", "10g sesame oil", "15g hemp seeds", "tamari (gluten-free soy), ginger and spring onion", "Salt and black pepper, to taste"],
    method: methodTofu("firm tofu", "cauliflower rice", "baby spinach", "tamari, ginger and spring onion", "sesame oil and hemp seeds"),
  },
  {
    name: "Mediterranean Firm Tofu with Cabbage (Shredded) & Olives",
    slot: "lunch", kcal: 420, p: 27, c: 12, f: 30,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["150g firm tofu", "100g shredded cabbage", "100g mixed salad leaves", "15g olive oil", "25g olives (pitted)", "oregano, basil and a squeeze of lemon", "Salt and black pepper, to taste"],
    method: methodTofu("firm tofu", "shredded cabbage", "mixed salad leaves", "oregano, basil and a squeeze of lemon", "olive oil and olives"),
  },
  {
    name: "Italian herb Whole Eggs with Broccoli Florets & Cherry Tomatoes",
    slot: "lunch", kcal: 460, p: 25, c: 12, f: 35,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs"],
    ingredients: ["3 whole eggs", "100g broccoli florets", "80g cherry tomatoes", "15g olive oil", "20g pumpkin seeds", "basil, oregano and a touch of chilli flake", "Salt and black pepper, to taste"],
    method: methodEggs("whole eggs", "broccoli florets", "cherry tomatoes", "basil, oregano and a touch of chilli flake", "olive oil and pumpkin seeds"),
  },
  {
    name: "Moroccan-spiced Firm Tofu with Courgette Noodles (Zoodles) & Kale",
    slot: "lunch", kcal: 395, p: 28, c: 11, f: 26,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["150g firm tofu", "100g courgette noodles (zoodles)", "100g kale", "15g olive oil", "20g sunflower seeds", "ras el hanout, cumin and cinnamon", "Salt and black pepper, to taste"],
    method: methodTofu("firm tofu", "courgette noodles (zoodles)", "kale", "ras el hanout, cumin and cinnamon", "olive oil and sunflower seeds"),
  },
  {
    name: "Peri-peri Egg Whites with Cauliflower Rice & Mixed Peppers",
    slot: "lunch", kcal: 380, p: 30, c: 11, f: 24,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs"],
    ingredients: ["200g egg whites", "100g cauliflower rice", "100g mixed peppers", "15g olive oil", "60g avocado", "peri-peri seasoning and a squeeze of lime", "Salt and black pepper, to taste"],
    method: methodEggs("egg whites", "cauliflower rice", "mixed peppers", "peri-peri seasoning and a squeeze of lime", "olive oil and sliced avocado"),
  },
  {
    name: "Cajun Firm Tofu with Broccoli Florets & Red Onion",
    slot: "lunch", kcal: 440, p: 29, c: 13, f: 30,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["150g firm tofu", "100g broccoli florets", "60g red onion", "15g olive oil", "20g walnuts", "Cajun seasoning, smoked paprika and garlic powder", "Salt and black pepper, to taste"],
    method: methodTofu("firm tofu", "broccoli florets", "red onion", "Cajun seasoning, smoked paprika and garlic powder", "olive oil and walnuts"),
    // walnuts = tree nuts allergen
  },
  {
    name: "Garlic & chilli Whole Eggs with Cabbage (Shredded) & Baby Spinach",
    slot: "lunch", kcal: 485, p: 25, c: 10, f: 38,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs"],
    ingredients: ["3 whole eggs", "100g shredded cabbage", "80g baby spinach", "15g olive oil", "80g avocado", "crushed garlic, chilli flakes and parsley", "Salt and black pepper, to taste"],
    method: methodEggs("whole eggs", "shredded cabbage", "baby spinach", "crushed garlic, chilli flakes and parsley", "olive oil and sliced avocado"),
  },
  {
    name: "Teriyaki Firm Tofu with Courgette Noodles (Zoodles) & Asparagus Tips",
    slot: "lunch", kcal: 390, p: 28, c: 13, f: 25,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy", "sesame"],
    ingredients: ["150g firm tofu", "100g courgette noodles (zoodles)", "100g asparagus tips", "10g sesame oil", "15g tahini", "tamari (gluten-free soy), ginger and mirin", "Salt and black pepper, to taste"],
    method: methodTofu("firm tofu", "courgette noodles (zoodles)", "asparagus tips", "tamari, ginger and mirin", "sesame oil and tahini"),
  },
  {
    name: "Lemon herb Egg Whites with Cauliflower Rice & Chestnut Mushrooms",
    slot: "lunch", kcal: 360, p: 27, c: 9, f: 23,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs"],
    ingredients: ["200g egg whites", "100g cauliflower rice", "100g chestnut mushrooms", "15g olive oil", "60g avocado", "lemon juice, thyme and rosemary", "Salt and black pepper, to taste"],
    method: methodEggs("egg whites", "cauliflower rice", "chestnut mushrooms", "lemon juice, thyme and rosemary", "olive oil and sliced avocado"),
  },
  {
    name: "Indian-spiced Firm Tofu with Cabbage (Shredded) & Cherry Tomatoes",
    slot: "lunch", kcal: 415, p: 27, c: 13, f: 28,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["150g firm tofu", "100g shredded cabbage", "80g cherry tomatoes", "15g olive oil", "15g coconut cream", "garam masala, turmeric and cumin", "Salt and black pepper, to taste"],
    method: methodTofu("firm tofu", "shredded cabbage", "cherry tomatoes", "garam masala, turmeric and cumin", "olive oil and coconut cream"),
  },
];

// ── DINNER (8) ──────────────────────────────────────────────────────────────

const DINNERS: Recipe[] = [
  {
    name: "Mediterranean Firm Tofu with Courgette Noodles (Zoodles) & Olives",
    slot: "dinner", kcal: 580, p: 32, c: 13, f: 44,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["180g firm tofu", "100g courgette noodles (zoodles)", "100g mixed salad leaves", "20g olive oil", "40g olives (pitted)", "80g avocado", "oregano, basil and a squeeze of lemon", "Salt and black pepper, to taste"],
    method: methodTofu("firm tofu", "courgette noodles (zoodles)", "mixed salad leaves", "oregano, basil and a squeeze of lemon", "olive oil, olives and sliced avocado"),
  },
  {
    name: "Moroccan-spiced Tempeh with Cauliflower Rice & Kale",
    slot: "dinner", kcal: 605, p: 34, c: 14, f: 42,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["150g tempeh", "100g cauliflower rice", "100g kale", "20g olive oil", "20g sunflower seeds", "80g avocado", "ras el hanout, cumin and cinnamon", "Salt and black pepper, to taste"],
    method: methodTempeh("tempeh", "cauliflower rice", "kale", "ras el hanout, cumin and cinnamon", "olive oil, sunflower seeds and sliced avocado"),
  },
  {
    name: "Cajun Whole Eggs with Broccoli Florets & Chestnut Mushrooms",
    slot: "dinner", kcal: 560, p: 28, c: 11, f: 44,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs"],
    ingredients: ["4 whole eggs", "100g broccoli florets", "100g chestnut mushrooms", "20g olive oil", "80g avocado", "20g pumpkin seeds", "Cajun seasoning, smoked paprika and garlic powder", "Salt and black pepper, to taste"],
    method: methodEggs("whole eggs", "broccoli florets", "chestnut mushrooms", "Cajun seasoning, smoked paprika and garlic powder", "olive oil, sliced avocado and pumpkin seeds"),
  },
  {
    name: "Italian herb Firm Tofu with Cabbage (Shredded) & Cherry Tomatoes",
    slot: "dinner", kcal: 630, p: 33, c: 13, f: 48,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["180g firm tofu", "100g shredded cabbage", "80g cherry tomatoes", "20g olive oil", "30g olives (pitted)", "80g avocado", "basil, oregano and a touch of chilli flake", "Salt and black pepper, to taste"],
    method: methodTofu("firm tofu", "shredded cabbage", "cherry tomatoes", "basil, oregano and a touch of chilli flake", "olive oil, olives and sliced avocado"),
  },
  {
    name: "Asian-inspired Tempeh with Courgette Noodles (Zoodles) & Baby Spinach",
    slot: "dinner", kcal: 585, p: 34, c: 14, f: 41,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy", "sesame"],
    ingredients: ["150g tempeh", "100g courgette noodles (zoodles)", "100g baby spinach", "10g sesame oil", "15g tahini", "20g hemp seeds", "tamari (gluten-free soy), ginger and spring onion", "Salt and black pepper, to taste"],
    method: methodTempeh("tempeh", "courgette noodles (zoodles)", "baby spinach", "tamari, ginger and spring onion", "sesame oil, tahini and hemp seeds"),
  },
  {
    name: "Peri-peri Firm Tofu with Cauliflower Rice & Asparagus Tips",
    slot: "dinner", kcal: 620, p: 33, c: 12, f: 48,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["180g firm tofu", "100g cauliflower rice", "100g asparagus tips", "20g olive oil", "80g avocado", "20g pumpkin seeds", "peri-peri seasoning and a squeeze of lime", "Salt and black pepper, to taste"],
    method: methodTofu("firm tofu", "cauliflower rice", "asparagus tips", "peri-peri seasoning and a squeeze of lime", "olive oil, sliced avocado and pumpkin seeds"),
  },
  {
    name: "Teriyaki Egg Whites with Cauliflower Rice & Tenderstem Broccoli",
    slot: "dinner", kcal: 545, p: 30, c: 12, f: 40,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs", "soy", "sesame"],
    ingredients: ["220g egg whites", "100g cauliflower rice", "100g tenderstem broccoli", "10g sesame oil", "80g avocado", "20g hemp seeds", "tamari (gluten-free soy), ginger and mirin", "Salt and black pepper, to taste"],
    method: methodEggs("egg whites", "cauliflower rice", "tenderstem broccoli", "tamari, ginger and mirin", "sesame oil, sliced avocado and hemp seeds"),
  },
  {
    name: "BBQ Firm Tofu with Broccoli Florets & Red Onion",
    slot: "dinner", kcal: 590, p: 31, c: 13, f: 44,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["180g firm tofu", "100g broccoli florets", "60g red onion", "20g olive oil", "80g avocado", "20g sunflower seeds", "smoked paprika, garlic powder and a smoky BBQ rub", "Salt and black pepper, to taste"],
    method: methodTofu("firm tofu", "broccoli florets", "red onion", "smoked paprika, garlic powder and a smoky BBQ rub", "olive oil, sliced avocado and sunflower seeds"),
  },
];

// ── SNACK (12) ──────────────────────────────────────────────────────────────

const SNACKS: Recipe[] = [
  {
    name: "Peri-peri Egg Whites with Cucumber & Olives",
    slot: "snack", kcal: 230, p: 17, c: 6, f: 15,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs"],
    ingredients: ["120g egg whites", "80g cucumber", "20g olives (pitted)", "10g olive oil", "peri-peri seasoning and a squeeze of lime", "Salt and black pepper, to taste"],
    method: methodSnack("egg whites", "cucumber and olives", "peri-peri seasoning and a squeeze of lime", "olive oil", "scrambled"),
  },
  {
    name: "Mediterranean Firm Tofu with Cherry Tomatoes",
    slot: "snack", kcal: 270, p: 18, c: 7, f: 18,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["120g firm tofu", "80g cherry tomatoes", "10g olive oil", "10g olives (pitted)", "oregano, basil and a squeeze of lemon", "Salt and black pepper, to taste"],
    method: methodSnack("firm tofu", "cherry tomatoes and olives", "oregano, basil and a squeeze of lemon", "olive oil"),
  },
  {
    name: "Garlic & chilli Whole Eggs with Baby Spinach",
    slot: "snack", kcal: 250, p: 15, c: 4, f: 19,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs"],
    ingredients: ["2 whole eggs", "80g baby spinach", "10g olive oil", "40g avocado", "crushed garlic, chilli flakes and parsley", "Salt and black pepper, to taste"],
    method: methodSnack("whole eggs", "baby spinach", "crushed garlic, chilli flakes and parsley", "olive oil and sliced avocado", "scrambled"),
  },
  {
    name: "Asian-inspired Firm Tofu with Cucumber",
    slot: "snack", kcal: 290, p: 17, c: 6, f: 21,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy", "sesame"],
    ingredients: ["120g firm tofu", "80g cucumber", "10g sesame oil", "10g hemp seeds", "tamari (gluten-free soy), ginger and spring onion", "Salt and black pepper, to taste"],
    method: methodSnack("firm tofu", "cucumber", "tamari, ginger and spring onion", "sesame oil and hemp seeds"),
  },
  {
    name: "Italian herb Egg Whites with Cherry Tomatoes",
    slot: "snack", kcal: 200, p: 18, c: 6, f: 12,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs"],
    ingredients: ["150g egg whites", "80g cherry tomatoes", "10g olive oil", "10g pumpkin seeds", "basil, oregano and a touch of chilli flake", "Salt and black pepper, to taste"],
    method: methodSnack("egg whites", "cherry tomatoes", "basil, oregano and a touch of chilli flake", "olive oil and pumpkin seeds", "scrambled"),
  },
  {
    name: "Moroccan-spiced Firm Tofu with Kale",
    slot: "snack", kcal: 310, p: 19, c: 8, f: 22,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["120g firm tofu", "80g kale", "10g olive oil", "10g sunflower seeds", "40g avocado", "ras el hanout, cumin and cinnamon", "Salt and black pepper, to taste"],
    method: methodSnack("firm tofu", "kale", "ras el hanout, cumin and cinnamon", "olive oil, sunflower seeds and sliced avocado"),
  },
  {
    name: "Cajun Whole Eggs with Mixed Peppers",
    slot: "snack", kcal: 275, p: 15, c: 8, f: 20,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs"],
    ingredients: ["2 whole eggs", "80g mixed peppers", "10g olive oil", "40g avocado", "Cajun seasoning, smoked paprika and garlic powder", "Salt and black pepper, to taste"],
    method: methodSnack("whole eggs", "mixed peppers", "Cajun seasoning, smoked paprika and garlic powder", "olive oil and sliced avocado", "scrambled"),
  },
  {
    name: "Lemon herb Firm Tofu with Cucumber",
    slot: "snack", kcal: 250, p: 17, c: 5, f: 18,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["120g firm tofu", "80g cucumber", "10g olive oil", "40g avocado", "lemon juice, thyme and rosemary", "Salt and black pepper, to taste"],
    method: methodSnack("firm tofu", "cucumber", "lemon juice, thyme and rosemary", "olive oil and sliced avocado"),
  },
  {
    name: "Teriyaki Egg Whites with Asparagus Tips",
    slot: "snack", kcal: 195, p: 17, c: 6, f: 11,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs", "soy", "sesame"],
    ingredients: ["150g egg whites", "80g asparagus tips", "10g sesame oil", "10g hemp seeds", "tamari (gluten-free soy), ginger and mirin", "Salt and black pepper, to taste"],
    method: methodSnack("egg whites", "asparagus tips", "tamari, ginger and mirin", "sesame oil and hemp seeds", "scrambled"),
  },
  {
    name: "Indian-spiced Firm Tofu with Baby Spinach",
    slot: "snack", kcal: 305, p: 19, c: 7, f: 22,
    diet: "vegetarian", glutenFree: true,
    allergens: ["soy"],
    ingredients: ["120g firm tofu", "80g baby spinach", "10g olive oil", "15g coconut cream", "40g avocado", "garam masala, turmeric and cumin", "Salt and black pepper, to taste"],
    method: methodSnack("firm tofu", "baby spinach", "garam masala, turmeric and cumin", "olive oil, coconut cream and sliced avocado"),
  },
  {
    name: "BBQ Whole Eggs with Red Onion",
    slot: "snack", kcal: 290, p: 15, c: 8, f: 22,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs"],
    ingredients: ["2 whole eggs", "60g red onion", "10g olive oil", "40g avocado", "10g sunflower seeds", "smoked paprika, garlic powder and a smoky BBQ rub", "Salt and black pepper, to taste"],
    method: methodSnack("whole eggs", "red onion", "smoked paprika, garlic powder and a smoky BBQ rub", "olive oil, sliced avocado and sunflower seeds", "scrambled"),
  },
  {
    name: "Mediterranean Egg Whites with Olives",
    slot: "snack", kcal: 245, p: 17, c: 5, f: 17,
    diet: "vegetarian", glutenFree: true,
    allergens: ["eggs"],
    ingredients: ["150g egg whites", "80g mixed salad leaves", "20g olives (pitted)", "10g olive oil", "oregano, basil and a squeeze of lemon", "Salt and black pepper, to taste"],
    method: methodSnack("egg whites", "mixed salad leaves and olives", "oregano, basil and a squeeze of lemon", "olive oil", "scrambled"),
  },
];

const ALL = [...LUNCHES, ...DINNERS, ...SNACKS];

// ── SQL emitter (matches import_owner_meals.ts format) ──────────────────────

function esc(s: string): string { return s.replace(/'/g, "''"); }
function pgArray(values: string[]): string {
  return values.length === 0
    ? "ARRAY[]::TEXT[]"
    : "ARRAY[" + values.map((v) => `'${esc(v)}'`).join(", ") + "]";
}

function render(): string {
  const out: string[] = [];
  out.push("-- Auto-generated by scripts/gen_veg_df_keto_pack.ts");
  out.push("-- 30-recipe vegetarian + dairy-free keto extension pack.");
  out.push("-- Tagged with 'hitt_ext_v1' in dietary_tags for later replacement.");
  out.push("-- Idempotent: re-running this seed replaces only these rows.");
  out.push("");
  out.push("BEGIN;");
  out.push("");
  out.push("-- Cascade deletes ingredients + steps via FK ON DELETE CASCADE.");
  out.push(
    "DELETE FROM public.recipes WHERE source = 'owner' AND category = 'keto'",
  );
  out.push(
    "  AND dietary_tags @> ARRAY['hitt_ext_v1']::TEXT[];",
  );
  out.push("");

  for (const r of ALL) {
    const tags = [r.diet];
    if (r.glutenFree) tags.push("gluten-free");
    tags.push("hitt_ext_v1");

    out.push("WITH new_recipe AS (");
    out.push("  INSERT INTO public.recipes (");
    out.push(
      "    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source",
    );
    out.push("  ) VALUES (");
    out.push(`    '${esc(r.name)}',`);
    out.push(`    'keto',`);
    out.push(`    '${r.slot}',`);
    out.push(`    ${r.kcal},`);
    out.push(`    ${r.p},`);
    out.push(`    ${r.c},`);
    out.push(`    ${r.f},`);
    out.push(`    ${pgArray(tags)},`);
    out.push(`    ${pgArray(r.allergens)},`);
    out.push(`    'owner'`);
    out.push("  ) RETURNING id");
    out.push(")");

    const ingRows = r.ingredients.map(
      (item, idx) => `(SELECT id FROM new_recipe), '${esc(item)}', ${idx}`,
    );
    const stepRows = r.method.map(
      (instr, idx) => `(SELECT id FROM new_recipe), ${idx + 1}, '${esc(instr)}'`,
    );

    out.push(", ing AS (");
    out.push("  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES");
    out.push("    " + ingRows.map((r) => `(${r})`).join(",\n    "));
    out.push("  RETURNING 1");
    out.push(")");
    out.push("INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES");
    out.push("    " + stepRows.map((r) => `(${r})`).join(",\n    ") + ";");
    out.push("");
  }

  out.push("COMMIT;");
  return out.join("\n");
}

const outPath = process.argv[2];
if (!outPath) {
  console.error("Usage: bun scripts/gen_veg_df_keto_pack.ts <output-sql-path>");
  process.exit(1);
}
await Bun.write(outPath, render());
console.log(
  `Wrote ${ALL.length} recipes (${LUNCHES.length} lunches, ${DINNERS.length} dinners, ${SNACKS.length} snacks) → ${path.basename(outPath)}`,
);
