#!/usr/bin/env bun
//
// Generates a SQL seed migration for the "lean + calorie-dense" gap: recipes
// that are ≥400 kcal (snacks ≥380) with ≤10g fat. The owner library had only
// ~31 of these across 855 recipes, which made low-fat and high-carb athletic
// day targets impossible to match (fat overshot 200-300% because the only
// calorie-dense options were fatty). This pack fills the four slots across
// omnivore / vegetarian / vegan so every diet benefits.
//
// Idempotent: every row tagged 'hitt_lean_v1' in dietary_tags + category
// 'lean'. Re-running the seed DELETEs these and re-inserts.
//
// Run: bun scripts/gen_lean_dense_pack.ts <output-sql-path>

import path from "node:path";

type Slot = "breakfast" | "lunch" | "dinner" | "snack";
type Diet = "omnivore" | "vegetarian" | "vegan";
type MethodType = "grain" | "oats" | "smoothie" | "snack" | "pasta" | "curry" | "stirfry" | "traybake" | "wrap";

interface Recipe {
  name: string;
  slot: Slot;
  p: number; c: number; f: number; // fat kept ≤10; kcal computed from macros
  diet: Diet;
  gf: boolean;
  allergens: string[];
  ings: string[];
  type: MethodType;
}

const kcal = (r: Recipe) => Math.round(r.p * 4 + r.c * 4 + r.f * 9);

// Parameterised method prose (matches the owner's voice from the existing library).
function method(type: MethodType, name: string): string[] {
  switch (type) {
    case "grain": return [
      "Season the protein and cook in a hot non-stick pan (or grill) with a light spray of oil until cooked through.",
      "Cook the grain base per packet, keeping it fluffy.",
      "Steam or sauté the vegetables for 3-4 minutes until just tender.",
      "Plate the grain as a base, top with the protein and vegetables.",
      "Finish with the sauce or seasoning and a crack of black pepper. Serve.",
    ];
    case "oats": return [
      "Combine the oats with the liquid in a pan or bowl.",
      "Cook on the hob or microwave for 2-3 minutes until creamy (or chill overnight).",
      "Stir the protein through until smooth.",
      "Top with the fruit and any seeds. Serve warm or cold.",
    ];
    case "smoothie": return [
      "Add all ingredients to a blender with a handful of ice.",
      "Blend on high until completely smooth.",
      "Pour into a glass or bowl; add the toppings if serving as a bowl.",
    ];
    case "snack": return [
      "Prepare and portion each component.",
      "Assemble on a plate or in a pot.",
      "Mix or shake any liquid element and serve alongside.",
    ];
    case "pasta": return [
      "Cook the pasta in salted water until al dente, then drain.",
      "Brown the protein in a non-stick pan with a light spray of oil.",
      "Add the tomato base and simmer 5 minutes; season well.",
      "Toss the pasta through the sauce and serve.",
    ];
    case "curry": return [
      "Fry the aromatics in a light spray of oil for 1-2 minutes.",
      "Add the protein and colour on all sides.",
      "Stir in the spices and tomato/coconut base; simmer 10-12 minutes.",
      "Serve over the cooked rice.",
    ];
    case "stirfry": return [
      "Cook the protein in a very hot wok with a light spray of oil until seared.",
      "Add the vegetables and stir-fry 3-4 minutes until crisp-tender.",
      "Add the sauce and toss for 1 minute to coat.",
      "Serve over the rice or noodles.",
    ];
    case "traybake": return [
      "Heat the oven to 200°C. Spread the protein and vegetables on a lined tray.",
      "Season, spray lightly with oil, and add the potato or grain.",
      "Roast 20-25 minutes until cooked through and golden.",
      "Plate up and finish with fresh herbs. Serve.",
    ];
    case "wrap": return [
      "Cook and season the filling in a non-stick pan until done.",
      "Warm the wrap or base briefly.",
      "Fill, add the salad and sauce, and fold. Serve.",
    ];
  }
}

const BREAKFAST: Recipe[] = [
  { name: "Protein Oats with Banana & Berries", slot: "breakfast", p: 35, c: 78, f: 8, diet: "vegan", gf: false, allergens: ["gluten", "soya"], type: "oats", ings: ["60g rolled oats", "300ml soya milk", "1 scoop (30g) soya protein", "1 banana, sliced", "80g mixed berries", "10g chia seeds"] },
  { name: "Egg-White & Turkey Breakfast Wrap", slot: "breakfast", p: 42, c: 52, f: 9, diet: "omnivore", gf: false, allergens: ["gluten", "eggs"], type: "wrap", ings: ["1 large wholemeal wrap", "200g egg whites", "80g lean turkey rasher", "handful spinach", "2 tbsp salsa"] },
  { name: "Chicken & Rice Breakfast Bowl", slot: "breakfast", p: 45, c: 72, f: 8, diet: "omnivore", gf: true, allergens: [], type: "grain", ings: ["120g chicken breast", "180g cooked white rice", "1 egg white", "60g peas", "soy-free seasoning"] },
  { name: "Smoked Haddock & Poached Egg-White on Toast", slot: "breakfast", p: 40, c: 48, f: 9, diet: "omnivore", gf: false, allergens: ["gluten", "fish", "eggs"], type: "traybake", ings: ["120g smoked haddock", "2 slices wholemeal bread", "2 egg whites, poached", "80g spinach", "lemon & pepper"] },
  { name: "Berry Protein Smoothie Bowl", slot: "breakfast", p: 35, c: 70, f: 7, diet: "vegan", gf: true, allergens: ["soya"], type: "smoothie", ings: ["1.5 scoops (45g) soya protein", "150g frozen berries", "1 banana", "250ml water", "20g granola-free oats", "seeds to top"] },
  { name: "Tofu Scramble & Beans on Toast", slot: "breakfast", p: 32, c: 58, f: 10, diet: "vegan", gf: false, allergens: ["gluten", "soya"], type: "grain", ings: ["150g firm tofu", "200g baked beans", "2 slices wholemeal bread", "turmeric & black salt", "handful spinach"] },
  { name: "Banana Protein Pancakes", slot: "breakfast", p: 38, c: 66, f: 9, diet: "vegetarian", gf: false, allergens: ["gluten", "eggs"], type: "oats", ings: ["1 banana", "3 egg whites", "50g oat flour", "1 scoop (25g) whey", "berries to top", "light maple syrup"] },
  { name: "Overnight Oats, Apple & Cinnamon", slot: "breakfast", p: 30, c: 75, f: 8, diet: "vegan", gf: false, allergens: ["gluten", "soya"], type: "oats", ings: ["70g rolled oats", "300ml soya milk", "1 scoop (25g) soya protein", "1 grated apple", "cinnamon", "10g raisins"] },
  { name: "Prawn & Egg-White Rice Congee", slot: "breakfast", p: 40, c: 62, f: 6, diet: "omnivore", gf: true, allergens: ["crustaceans", "eggs"], type: "grain", ings: ["100g king prawns", "180g cooked rice", "2 egg whites", "spring onion & ginger", "low-salt stock"] },
  { name: "Turkey & Potato Breakfast Hash", slot: "breakfast", p: 42, c: 50, f: 10, diet: "omnivore", gf: true, allergens: ["eggs"], type: "traybake", ings: ["120g lean turkey mince", "200g diced potato", "2 egg whites", "peppers & onion", "paprika"] },
  { name: "Mango & Pea-Protein Smoothie + Bagel", slot: "breakfast", p: 34, c: 80, f: 7, diet: "vegan", gf: false, allergens: ["gluten"], type: "smoothie", ings: ["1.5 scoops (45g) pea protein", "150g mango", "1 plain bagel", "250ml water", "1 tsp honey-free syrup"] },
];

const LUNCH: Recipe[] = [
  { name: "Chicken, Rice & Roasted Veg Bowl", slot: "lunch", p: 48, c: 78, f: 9, diet: "omnivore", gf: true, allergens: [], type: "grain", ings: ["150g chicken breast", "200g cooked rice", "150g roasted courgette & pepper", "lemon & herbs"] },
  { name: "Tuna & Sweet Potato Poke", slot: "lunch", p: 45, c: 70, f: 8, diet: "omnivore", gf: true, allergens: ["fish", "soya", "sesame"], type: "grain", ings: ["150g tuna steak", "220g roasted sweet potato", "edamame", "tamari & sesame", "cucumber"] },
  { name: "Turkey Meatball Pasta", slot: "lunch", p: 46, c: 82, f: 10, diet: "omnivore", gf: false, allergens: ["gluten"], type: "pasta", ings: ["150g lean turkey mince", "90g dry pasta", "200g tomato passata", "garlic & basil", "spinach"] },
  { name: "Prawn Noodle Stir-Fry", slot: "lunch", p: 42, c: 76, f: 8, diet: "omnivore", gf: false, allergens: ["crustaceans", "gluten", "soya"], type: "stirfry", ings: ["140g king prawns", "90g rice noodles", "stir-fry vegetables", "tamari & ginger", "lime"] },
  { name: "Lentil & Rice Dahl", slot: "lunch", p: 28, c: 85, f: 9, diet: "vegan", gf: true, allergens: [], type: "curry", ings: ["120g red lentils", "150g cooked basmati", "tomato & onion", "cumin, turmeric, ginger", "spinach"] },
  { name: "Chickpea & Quinoa Power Salad", slot: "lunch", p: 26, c: 80, f: 10, diet: "vegan", gf: true, allergens: [], type: "snack", ings: ["150g chickpeas", "120g cooked quinoa", "cucumber, tomato, red onion", "lemon-tahini drizzle", "parsley"] },
  { name: "Grilled Chicken & Couscous Tabbouleh", slot: "lunch", p: 47, c: 72, f: 9, diet: "omnivore", gf: false, allergens: ["gluten"], type: "grain", ings: ["150g chicken breast", "80g dry couscous", "tomato, cucumber, mint", "lemon", "parsley"] },
  { name: "White Fish & Potato Traybake", slot: "lunch", p: 44, c: 68, f: 8, diet: "omnivore", gf: true, allergens: ["fish"], type: "traybake", ings: ["160g cod loin", "250g new potatoes", "green beans", "lemon & dill"] },
  { name: "Teriyaki Tofu & Rice Bowl", slot: "lunch", p: 30, c: 88, f: 10, diet: "vegan", gf: false, allergens: ["soya", "gluten", "sesame"], type: "stirfry", ings: ["180g firm tofu", "200g cooked rice", "teriyaki (tamari base)", "broccoli & carrot", "sesame seeds"] },
  { name: "Turkey & Black Bean Burrito Bowl", slot: "lunch", p: 46, c: 80, f: 10, diet: "omnivore", gf: true, allergens: [], type: "grain", ings: ["150g lean turkey mince", "150g cooked rice", "150g black beans", "salsa & lime", "lettuce"] },
  { name: "Edamame & Brown Rice Buddha Bowl", slot: "lunch", p: 28, c: 82, f: 10, diet: "vegan", gf: true, allergens: ["soya", "sesame"], type: "snack", ings: ["150g edamame", "200g cooked brown rice", "shredded carrot & cabbage", "sesame-ginger dressing", "nori"] },
];

const DINNER: Recipe[] = [
  { name: "Grilled Chicken, Mash & Greens", slot: "dinner", p: 50, c: 65, f: 9, diet: "omnivore", gf: true, allergens: [], type: "traybake", ings: ["160g chicken breast", "300g potato mash (no butter)", "150g green beans & kale", "gravy (lean)"] },
  { name: "Cod, New Potatoes & Peas", slot: "dinner", p: 46, c: 62, f: 8, diet: "omnivore", gf: true, allergens: ["fish"], type: "traybake", ings: ["180g cod loin", "250g new potatoes", "120g peas", "lemon & parsley"] },
  { name: "Turkey Bolognese with Spaghetti", slot: "dinner", p: 48, c: 85, f: 10, diet: "omnivore", gf: false, allergens: ["gluten"], type: "pasta", ings: ["160g lean turkey mince", "95g dry spaghetti", "250g passata", "carrot, onion, garlic", "basil"] },
  { name: "King Prawn & Vegetable Paella", slot: "dinner", p: 44, c: 80, f: 9, diet: "omnivore", gf: true, allergens: ["crustaceans"], type: "grain", ings: ["150g king prawns", "90g paella rice", "peppers, peas, tomato", "smoked paprika & saffron", "lemon"] },
  { name: "Chicken Tikka & Basmati Rice", slot: "dinner", p: 50, c: 78, f: 10, diet: "omnivore", gf: true, allergens: [], type: "curry", ings: ["160g chicken breast", "200g cooked basmati", "dairy-free tikka marinade", "onion & tomato", "coriander"] },
  { name: "Tofu & Vegetable Pad Thai", slot: "dinner", p: 30, c: 92, f: 10, diet: "vegan", gf: false, allergens: ["soya", "gluten"], type: "stirfry", ings: ["180g firm tofu", "100g rice noodles", "beansprouts & carrot", "tamarind-tamari sauce", "lime & spring onion"] },
  { name: "Lean Beef & Broccoli with Rice", slot: "dinner", p: 50, c: 72, f: 10, diet: "omnivore", gf: false, allergens: ["soya", "gluten"], type: "stirfry", ings: ["150g lean beef strips (5% fat)", "200g cooked rice", "200g broccoli", "tamari & garlic", "ginger"] },
  { name: "Seitan Steak, Sweet Potato & Kale", slot: "dinner", p: 45, c: 70, f: 9, diet: "vegan", gf: false, allergens: ["gluten"], type: "traybake", ings: ["150g seitan", "250g sweet potato", "120g kale", "mustard-herb glaze"] },
  { name: "Chicken & Chickpea Curry with Rice", slot: "dinner", p: 46, c: 82, f: 10, diet: "omnivore", gf: true, allergens: [], type: "curry", ings: ["140g chicken breast", "120g chickpeas", "200g cooked rice", "tomato & spice base", "spinach"] },
  { name: "Grilled Prawn & Quinoa Primavera", slot: "dinner", p: 42, c: 74, f: 9, diet: "omnivore", gf: true, allergens: ["crustaceans"], type: "grain", ings: ["150g king prawns", "160g cooked quinoa", "courgette, peas, asparagus", "lemon & garlic"] },
  { name: "Turkey Steak, Rice & Ratatouille", slot: "dinner", p: 50, c: 70, f: 8, diet: "omnivore", gf: true, allergens: [], type: "grain", ings: ["170g turkey breast steak", "180g cooked rice", "aubergine, courgette, pepper, tomato", "herbs de Provence"] },
];

const SNACK: Recipe[] = [
  { name: "Rice Cakes, Jam & Protein Shake", slot: "snack", p: 30, c: 55, f: 5, diet: "vegan", gf: true, allergens: ["soya"], type: "snack", ings: ["3 rice cakes", "20g jam", "1 scoop (30g) soya protein", "300ml water"] },
  { name: "Banana Protein Flapjack", slot: "snack", p: 20, c: 60, f: 10, diet: "vegetarian", gf: false, allergens: ["gluten", "soya"], type: "snack", ings: ["50g oats", "1 banana", "1 scoop (25g) whey", "10g maple syrup", "raisins"] },
  { name: "Mango Sorbet & Dairy-Free Protein Yogurt", slot: "snack", p: 25, c: 62, f: 6, diet: "vegan", gf: true, allergens: ["soya"], type: "snack", ings: ["150g mango sorbet", "150g soya yogurt", "1/2 scoop (15g) soya protein", "granola-free oats"] },
  { name: "Bagel with Syrup & Whey", slot: "snack", p: 28, c: 65, f: 7, diet: "vegetarian", gf: false, allergens: ["gluten", "soya"], type: "snack", ings: ["1 plain bagel", "15g syrup", "1 scoop (25g) whey", "250ml water"] },
  { name: "Rice Pudding with Berries", slot: "snack", p: 22, c: 70, f: 8, diet: "vegan", gf: true, allergens: ["soya"], type: "snack", ings: ["200g dairy-free rice pudding", "80g berries", "1/2 scoop (15g) soya protein", "cinnamon"] },
  { name: "Pretzels, Hummus & Protein Shake", slot: "snack", p: 26, c: 60, f: 10, diet: "vegan", gf: false, allergens: ["gluten", "sesame", "soya"], type: "snack", ings: ["50g pretzels", "60g hummus", "1 scoop (30g) soya protein", "300ml water"] },
  { name: "Dried Fruit & Rice Cake Energy Plate", slot: "snack", p: 20, c: 75, f: 6, diet: "vegan", gf: true, allergens: ["soya"], type: "snack", ings: ["3 rice cakes", "40g dried apricots & raisins", "1/2 scoop (15g) soya protein shake"] },
  { name: "Tuna & Cracker Protein Box", slot: "snack", p: 32, c: 50, f: 8, diet: "omnivore", gf: false, allergens: ["fish", "gluten"], type: "snack", ings: ["1 tin tuna in spring water", "6 crackers", "cherry tomatoes", "black pepper"] },
  { name: "Oat & Berry Protein Smoothie", slot: "snack", p: 30, c: 58, f: 7, diet: "vegan", gf: false, allergens: ["gluten", "soya"], type: "smoothie", ings: ["30g oats", "150g berries", "1 scoop (30g) soya protein", "300ml water"] },
  { name: "Sushi-Style Rice & Edamame", slot: "snack", p: 24, c: 65, f: 7, diet: "vegan", gf: true, allergens: ["soya", "sesame"], type: "snack", ings: ["180g sushi rice", "80g edamame", "nori & sesame", "rice vinegar"] },
  { name: "Jacket Potato & Baked Beans", slot: "snack", p: 22, c: 78, f: 5, diet: "vegan", gf: true, allergens: [], type: "traybake", ings: ["1 large jacket potato", "200g baked beans", "chives", "black pepper"] },
];

const ALL = [...BREAKFAST, ...LUNCH, ...DINNER, ...SNACK];

const esc = (s: string) => s.replace(/'/g, "''");
const pgArray = (arr: string[]) => arr.length ? `ARRAY[${arr.map((a) => `'${esc(a)}'`).join(", ")}]` : "ARRAY[]::TEXT[]";

function render(): string {
  const out: string[] = [];
  out.push("-- Auto-generated by scripts/gen_lean_dense_pack.ts");
  out.push(`-- ${ALL.length}-recipe lean + calorie-dense pack (≥400 kcal / ≤10g fat).`);
  out.push("-- Fills the low-fat calorie-dense gap so low-fat and high-carb athletic");
  out.push("-- macro targets can be matched. Tagged 'hitt_lean_v1' for later replacement.");
  out.push("-- Idempotent: re-running replaces only these rows.");
  out.push("");
  out.push("BEGIN;");
  out.push("");
  out.push("DELETE FROM public.recipes WHERE source = 'owner' AND category = 'lean'");
  out.push("  AND dietary_tags @> ARRAY['hitt_lean_v1']::TEXT[];");
  out.push("");

  for (const r of ALL) {
    const tags: string[] = [];
    if (r.diet === "vegan") tags.push("vegan");
    else if (r.diet === "vegetarian") tags.push("vegetarian");
    if (r.gf) tags.push("gluten-free");
    tags.push("hitt_lean_v1");

    out.push("WITH new_recipe AS (");
    out.push("  INSERT INTO public.recipes (");
    out.push("    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source");
    out.push("  ) VALUES (");
    out.push(`    '${esc(r.name)}',`);
    out.push("    'lean',");
    out.push(`    '${r.slot}',`);
    out.push(`    ${kcal(r)},`);
    out.push(`    ${r.p},`);
    out.push(`    ${r.c},`);
    out.push(`    ${r.f},`);
    out.push(`    ${pgArray(tags)},`);
    out.push(`    ${pgArray(r.allergens)},`);
    out.push("    'owner'");
    out.push("  ) RETURNING id");
    out.push(")");

    const ingRows = r.ings.map((item, idx) => `    ((SELECT id FROM new_recipe), '${esc(item)}', ${idx})`);
    const stepRows = method(r.type, r.name).map((instr, idx) => `    ((SELECT id FROM new_recipe), ${idx + 1}, '${esc(instr)}')`);

    out.push(", ing AS (");
    out.push("  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES");
    out.push(ingRows.join(",\n"));
    out.push("  RETURNING 1");
    out.push(")");
    out.push("INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES");
    out.push(stepRows.join(",\n") + ";");
    out.push("");
  }

  out.push("COMMIT;");
  return out.join("\n");
}

const outPath = process.argv[2];
if (!outPath) { console.error("Usage: bun scripts/gen_lean_dense_pack.ts <output-sql-path>"); process.exit(1); }
await Bun.write(outPath, render());
const bySlot = (s: Slot) => ALL.filter((r) => r.slot === s).length;
console.log(`Wrote ${ALL.length} recipes (b ${bySlot("breakfast")} / l ${bySlot("lunch")} / d ${bySlot("dinner")} / s ${bySlot("snack")}) → ${path.basename(outPath)}`);
// Sanity: every recipe is lean-dense
const bad = ALL.filter((r) => r.f > 10 || kcal(r) < (r.slot === "snack" ? 380 : 400));
if (bad.length) { console.error("NOT lean-dense:", bad.map((r) => `${r.name} (${kcal(r)}kcal/${r.f}f)`)); process.exit(1); }
console.log("All recipes verified lean-dense (≤10g fat, ≥400 kcal / ≥380 snack).");
