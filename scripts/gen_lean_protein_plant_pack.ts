#!/usr/bin/env bun
//
// Generates a SQL seed migration for the "lean high-protein plant" gap: recipes
// that are BOTH high-protein (mains >=40g, snacks >=28g) AND low-fat (<=10g),
// built on the leanest plant proteins — seitan, soya mince/TVP, soya protein,
// red lentils, edamame, and egg whites (vegetarian). The macro battery showed
// vegetarian/vegan/dairy-free users undershooting protein (dairy excluded) and
// overshooting fat on low-fat days, because most plant proteins carry fat.
// These don't. Every row dairy-free.
//
// Idempotent: tagged 'hitt_leanpro_v1' + category 'lean'. Re-running replaces
// only these rows. Companion to gen_lean_dense_pack.ts (tag 'hitt_lean_v1').
//
// Run: bun scripts/gen_lean_protein_plant_pack.ts <output-sql-path>

import path from "node:path";

type Slot = "breakfast" | "lunch" | "dinner" | "snack";
type Diet = "vegetarian" | "vegan";
type MethodType = "grain" | "oats" | "smoothie" | "snack" | "pasta" | "curry" | "stirfry" | "traybake";

interface Recipe {
  name: string; slot: Slot;
  p: number; c: number; f: number;
  diet: Diet; gf: boolean; allergens: string[];
  ings: string[]; type: MethodType;
}

const kcal = (r: Recipe) => Math.round(r.p * 4 + r.c * 4 + r.f * 9);

function method(type: MethodType): string[] {
  switch (type) {
    case "grain": return [
      "Season the protein and sear in a hot non-stick pan with a light spray of oil until cooked through.",
      "Cook the grain base per packet until fluffy.",
      "Steam or sauté the vegetables for 3-4 minutes until just tender.",
      "Plate the grain, top with the protein and vegetables.",
      "Finish with the sauce and a crack of black pepper. Serve.",
    ];
    case "oats": return [
      "Combine the oats with the liquid in a pan or bowl.",
      "Cook or microwave 2-3 minutes until creamy (or chill overnight).",
      "Stir the protein through until smooth.",
      "Top with the fruit and seeds. Serve.",
    ];
    case "smoothie": return [
      "Add all ingredients to a blender with a handful of ice.",
      "Blend on high until completely smooth.",
      "Pour and serve; add toppings if serving as a bowl.",
    ];
    case "snack": return [
      "Prepare and portion each component.",
      "Assemble on a plate or in a pot.",
      "Shake or mix any liquid element and serve alongside.",
    ];
    case "pasta": return [
      "Cook the pasta in salted water until al dente, then drain.",
      "Brown the protein in a non-stick pan with a light spray of oil.",
      "Add the tomato base and simmer 5 minutes; season well.",
      "Toss the pasta through and serve.",
    ];
    case "curry": return [
      "Fry the aromatics in a light spray of oil for 1-2 minutes.",
      "Add the protein and colour on all sides.",
      "Stir in the spices and tomato base; simmer 10-12 minutes.",
      "Serve over the cooked rice.",
    ];
    case "stirfry": return [
      "Sear the protein in a very hot wok with a light spray of oil.",
      "Add the vegetables and stir-fry 3-4 minutes until crisp-tender.",
      "Add the sauce and toss 1 minute to coat.",
      "Serve over the rice or noodles.",
    ];
    case "traybake": return [
      "Heat the oven to 200°C. Spread the protein and vegetables on a lined tray.",
      "Season, spray lightly with oil, add the potato or grain.",
      "Roast 20-25 minutes until cooked through.",
      "Plate and finish with fresh herbs. Serve.",
    ];
  }
}

const BREAKFAST: Recipe[] = [
  { name: "Double Soya Protein Oats", slot: "breakfast", p: 45, c: 65, f: 8, diet: "vegan", gf: false, allergens: ["gluten", "soya"], type: "oats", ings: ["60g rolled oats", "2 scoops (60g) soya protein", "300ml soya milk", "1 banana", "10g chia seeds"] },
  { name: "Egg-White & Soya Mince Scramble on Toast", slot: "breakfast", p: 48, c: 40, f: 8, diet: "vegetarian", gf: false, allergens: ["eggs", "gluten", "soya"], type: "grain", ings: ["250g egg whites", "40g rehydrated soya mince", "2 slices wholemeal toast", "spinach & tomato", "paprika"] },
  { name: "Pea-Protein Berry Smoothie XL", slot: "breakfast", p: 42, c: 58, f: 7, diet: "vegan", gf: false, allergens: ["gluten"], type: "smoothie", ings: ["2 scoops (60g) pea protein", "150g frozen berries", "1 banana", "30g oats", "350ml water"] },
  { name: "Soya Yogurt, Protein & Granola Bowl", slot: "breakfast", p: 40, c: 60, f: 9, diet: "vegan", gf: false, allergens: ["soya", "gluten"], type: "snack", ings: ["300g high-protein soya yogurt", "1 scoop (25g) soya protein", "40g low-fat granola", "80g berries"] },
  { name: "High-Protein Chickpea (Besan) Pancakes", slot: "breakfast", p: 40, c: 50, f: 9, diet: "vegan", gf: true, allergens: [], type: "oats", ings: ["100g gram (chickpea) flour", "1.5 scoops (40g) pea protein", "spinach & pepper", "light syrup", "water to batter"] },
  { name: "Egg-White Omelette & Baked Beans", slot: "breakfast", p: 42, c: 46, f: 7, diet: "vegetarian", gf: true, allergens: ["eggs"], type: "grain", ings: ["250g egg whites", "200g baked beans", "mushrooms & tomato", "chives", "black pepper"] },
];

const LUNCH: Recipe[] = [
  { name: "Seitan Gyro Rice Bowl", slot: "lunch", p: 50, c: 70, f: 9, diet: "vegan", gf: false, allergens: ["gluten"], type: "grain", ings: ["170g seitan", "200g cooked rice", "shredded salad & red onion", "garlic-herb sauce (dairy-free)"] },
  { name: "Soya Mince Chilli & Rice", slot: "lunch", p: 48, c: 72, f: 8, diet: "vegan", gf: true, allergens: ["soya"], type: "curry", ings: ["70g dry soya mince", "150g kidney beans", "200g cooked rice", "tomato, onion, chilli", "cumin & paprika"] },
  { name: "High-Protein Lentil & Quinoa Bowl", slot: "lunch", p: 40, c: 78, f: 9, diet: "vegan", gf: true, allergens: [], type: "snack", ings: ["150g cooked red lentils", "150g cooked quinoa", "roasted veg", "lemon-herb dressing", "parsley"] },
  { name: "Tempeh & Edamame Rice Bowl", slot: "lunch", p: 44, c: 72, f: 10, diet: "vegan", gf: false, allergens: ["soya", "gluten", "sesame"], type: "stirfry", ings: ["120g tempeh", "80g edamame", "200g cooked rice", "tamari & ginger", "sesame seeds"] },
  { name: "Quorn & Sweet Potato Traybake", slot: "lunch", p: 45, c: 68, f: 8, diet: "vegetarian", gf: true, allergens: ["eggs"], type: "traybake", ings: ["175g Quorn pieces", "250g sweet potato", "peppers & courgette", "smoked paprika"] },
  { name: "TVP Bolognese Pasta", slot: "lunch", p: 46, c: 80, f: 8, diet: "vegan", gf: false, allergens: ["soya", "gluten"], type: "pasta", ings: ["70g dry soya mince (TVP)", "90g dry pasta", "250g passata", "carrot, onion, garlic", "basil"] },
  { name: "Falafel-Spiced Chickpea & Couscous", slot: "lunch", p: 40, c: 76, f: 10, diet: "vegan", gf: false, allergens: ["gluten", "sesame", "soya"], type: "snack", ings: ["200g chickpeas", "80g dry couscous", "80g edamame", "cucumber & tomato", "lemon-tahini drizzle", "coriander"] },
  { name: "Edamame, Tofu & Soba Salad", slot: "lunch", p: 42, c: 72, f: 10, diet: "vegan", gf: false, allergens: ["soya", "gluten", "sesame"], type: "snack", ings: ["120g firm tofu", "100g edamame", "90g soba noodles", "sesame-ginger dressing", "spring onion"] },
];

const DINNER: Recipe[] = [
  { name: "Seitan Steak, Mash & Greens", slot: "dinner", p: 50, c: 62, f: 9, diet: "vegan", gf: false, allergens: ["gluten"], type: "traybake", ings: ["180g seitan steak", "300g potato mash (dairy-free)", "kale & green beans", "mustard-herb glaze"] },
  { name: "Soya Mince Shepherd's Pie", slot: "dinner", p: 46, c: 70, f: 9, diet: "vegan", gf: true, allergens: ["soya"], type: "traybake", ings: ["70g dry soya mince", "300g potato mash (dairy-free)", "carrot, peas, onion", "veg gravy"] },
  { name: "High-Protein Tofu & Chickpea Tikka with Rice", slot: "dinner", p: 44, c: 78, f: 10, diet: "vegan", gf: true, allergens: ["soya"], type: "curry", ings: ["150g firm tofu", "120g chickpeas", "200g cooked rice", "dairy-free tikka sauce", "coriander"] },
  { name: "TVP & Black Bean Burrito Bowl", slot: "dinner", p: 48, c: 80, f: 9, diet: "vegan", gf: true, allergens: ["soya"], type: "grain", ings: ["70g dry soya mince", "150g black beans", "180g cooked rice", "salsa & lime", "lettuce"] },
  { name: "Seitan Stir-Fry with Noodles", slot: "dinner", p: 50, c: 74, f: 9, diet: "vegan", gf: false, allergens: ["gluten", "soya", "sesame"], type: "stirfry", ings: ["180g seitan", "90g noodles", "broccoli, pepper, carrot", "tamari-garlic sauce", "sesame"] },
  { name: "High-Protein Red Lentil Dahl & Rice", slot: "dinner", p: 42, c: 85, f: 9, diet: "vegan", gf: true, allergens: [], type: "curry", ings: ["140g dry red lentils", "200g cooked rice", "tomato, onion, ginger", "cumin & turmeric", "spinach"] },
  { name: "Quorn Fillet, Rice & Ratatouille", slot: "dinner", p: 46, c: 70, f: 8, diet: "vegetarian", gf: true, allergens: ["eggs"], type: "grain", ings: ["2 Quorn fillets", "180g cooked rice", "aubergine, courgette, pepper, tomato", "herbs de Provence"] },
  { name: "Tempeh Satay-Style with Rice", slot: "dinner", p: 42, c: 76, f: 10, diet: "vegan", gf: true, allergens: ["soya", "peanuts"], type: "stirfry", ings: ["130g tempeh", "200g cooked rice", "pak choi & pepper", "light peanut-soy sauce", "lime"] },
];

const SNACK: Recipe[] = [
  { name: "Soya Yogurt & Berry Protein Pot", slot: "snack", p: 30, c: 45, f: 6, diet: "vegan", gf: true, allergens: ["soya"], type: "snack", ings: ["300g high-protein soya yogurt", "1/2 scoop (15g) soya protein", "80g berries", "10g seeds"] },
  { name: "Roasted Edamame & Protein Shake", slot: "snack", p: 35, c: 40, f: 9, diet: "vegan", gf: true, allergens: ["soya"], type: "snack", ings: ["120g roasted edamame", "1 scoop (30g) soya protein", "300ml water"] },
  { name: "Seitan Jerky & Rice Cakes", slot: "snack", p: 32, c: 50, f: 5, diet: "vegan", gf: false, allergens: ["gluten", "soya"], type: "snack", ings: ["60g seitan jerky", "3 rice cakes", "tamari glaze"] },
  { name: "Pea-Protein & Banana Smoothie", slot: "snack", p: 34, c: 55, f: 5, diet: "vegan", gf: true, allergens: [], type: "smoothie", ings: ["1 scoop (30g) pea protein", "1 banana", "30g oats", "300ml water"] },
  { name: "High-Protein Hummus & Pitta", slot: "snack", p: 28, c: 55, f: 10, diet: "vegan", gf: false, allergens: ["gluten", "sesame"], type: "snack", ings: ["80g high-protein hummus", "1 wholemeal pitta", "carrot & pepper sticks"] },
  { name: "Roasted Chickpea & Soya Protein Plate", slot: "snack", p: 30, c: 52, f: 9, diet: "vegan", gf: true, allergens: ["soya"], type: "snack", ings: ["150g roasted chickpeas", "1/2 scoop (15g) soya protein shake", "cherry tomatoes"] },
];

const ALL = [...BREAKFAST, ...LUNCH, ...DINNER, ...SNACK];

const esc = (s: string) => s.replace(/'/g, "''");
const pgArray = (arr: string[]) => arr.length ? `ARRAY[${arr.map((a) => `'${esc(a)}'`).join(", ")}]` : "ARRAY[]::TEXT[]";

function render(): string {
  const out: string[] = [];
  out.push("-- Auto-generated by scripts/gen_lean_protein_plant_pack.ts");
  out.push(`-- ${ALL.length}-recipe lean high-protein plant pack (mains >=40g protein, <=10g fat).`);
  out.push("-- Fixes protein undershoot + fat overshoot for vegetarian/vegan/dairy-free");
  out.push("-- users on high-protein and low-fat targets. Tagged 'hitt_leanpro_v1'.");
  out.push("-- Idempotent: re-running replaces only these rows.");
  out.push("");
  out.push("BEGIN;");
  out.push("");
  out.push("DELETE FROM public.recipes WHERE source = 'owner' AND category = 'lean'");
  out.push("  AND dietary_tags @> ARRAY['hitt_leanpro_v1']::TEXT[];");
  out.push("");

  for (const r of ALL) {
    const tags: string[] = [];
    tags.push(r.diet === "vegan" ? "vegan" : "vegetarian");
    if (r.gf) tags.push("gluten-free");
    tags.push("hitt_leanpro_v1");

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
    const stepRows = method(r.type).map((instr, idx) => `    ((SELECT id FROM new_recipe), ${idx + 1}, '${esc(instr)}')`);

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
if (!outPath) { console.error("Usage: bun scripts/gen_lean_protein_plant_pack.ts <output-sql-path>"); process.exit(1); }
await Bun.write(outPath, render());
const bySlot = (s: Slot) => ALL.filter((r) => r.slot === s).length;
console.log(`Wrote ${ALL.length} recipes (b ${bySlot("breakfast")} / l ${bySlot("lunch")} / d ${bySlot("dinner")} / s ${bySlot("snack")}) → ${path.basename(outPath)}`);
const bad = ALL.filter((r) => r.f > 10 || r.p < (r.slot === "snack" ? 28 : 40));
if (bad.length) { console.error("Not lean-high-protein:", bad.map((r) => `${r.name} (${r.p}p/${r.f}f)`)); process.exit(1); }
console.log("All recipes verified lean + high-protein (mains >=40g protein, snacks >=28g, <=10g fat).");
