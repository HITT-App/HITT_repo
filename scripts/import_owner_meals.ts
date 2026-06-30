#!/usr/bin/env bun
//
// One-shot importer for the owner-curated meal library (~660 recipes across
// 4 .docx files). Parses each file, inserts rows into public.recipes (with
// source='owner'), and seeds ingredients + steps.
//
// Idempotent: wipes all rows where source='owner' before re-inserting. Safe to
// re-run after the owner updates the source documents.
//
// Run:
//   SUPABASE_URL=...                        \
//   SUPABASE_SERVICE_ROLE_KEY=...           \
//   bun scripts/import_owner_meals.ts <dir-containing-the-4-docx-files> [--dry-run]
//
// The script auto-detects files by filename substring:
//   - "Lose_Weight"     → category 'lose_weight'
//   - "Gain_Weight"     → category 'gain_weight'
//   - "Build_Muscle"    → category 'build_muscle'
//   - "Recovery"        → category 'recovery'

import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { readdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const emitSqlIdx = args.indexOf("--emit-sql");
const emitSqlPath = emitSqlIdx >= 0 ? args[emitSqlIdx + 1] : null;
const dir = args.find((a, idx) => !a.startsWith("--") && idx !== emitSqlIdx + 1);

if (!dir) {
  console.error(
    "Usage: bun scripts/import_owner_meals.ts <dir> [--dry-run | --emit-sql <file>]",
  );
  process.exit(1);
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const needsDb = !dryRun && !emitSqlPath;
if (needsDb && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error(
    "Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in env,\n" +
      "or pass --emit-sql <file> to write the seed as a Postgres script instead.",
  );
  process.exit(1);
}

const supabase = needsDb
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

// ──────────────────────────────────────────────────────────────────────────
// File discovery
// ──────────────────────────────────────────────────────────────────────────

const CATEGORY_MATCHERS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /Lose[_ ]Weight/i, category: "lose_weight" },
  { pattern: /Gain[_ ]Weight/i, category: "gain_weight" },
  { pattern: /Build[_ ]Muscle/i, category: "build_muscle" },
  { pattern: /Recovery/i, category: "recovery" },
];

interface FoundFile {
  path: string;
  category: string;
}

function discoverFiles(dir: string): FoundFile[] {
  const entries = readdirSync(dir).filter((f) => f.endsWith(".docx"));
  const found: FoundFile[] = [];
  for (const file of entries) {
    const match = CATEGORY_MATCHERS.find((c) => c.pattern.test(file));
    if (match) found.push({ path: path.join(dir, file), category: match.category });
  }
  return found;
}

// ──────────────────────────────────────────────────────────────────────────
// .docx → plain-text paragraphs (one line per <w:p>)
// ──────────────────────────────────────────────────────────────────────────

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function extractDocxText(file: string): string {
  const result = spawnSync("unzip", ["-p", file, "word/document.xml"], {
    encoding: "utf8",
    maxBuffer: 50_000_000,
  });
  if (result.status !== 0) {
    throw new Error(`unzip failed for ${file}: ${result.stderr}`);
  }
  const xml = result.stdout;
  // Each <w:p> is a paragraph; concatenate its <w:t> runs.
  const paras = xml.split(/<\/w:p>/);
  return paras
    .map((p) =>
      decodeXmlEntities(
        [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(""),
      ),
    )
    .join("\n");
}

// ──────────────────────────────────────────────────────────────────────────
// Recipe parser
// ──────────────────────────────────────────────────────────────────────────

const SLOT_MAP: Record<string, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack: "snack",
  "pre-workout": "pre_workout",
  "post-workout": "post_workout",
  recovery: "recovery",
};

const DIET_MAP: Record<string, string> = {
  omnivore: "omnivore",
  pescatarian: "pescatarian",
  vegetarian: "vegetarian",
  vegan: "vegan",
};

interface ParsedRecipe {
  number: number;
  name: string;
  category: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  diet: string | null;
  gluten_free: boolean;
  allergens: string[];
  ingredients: string[];
  method: string[];
}

function parseRecipes(text: string, category: string): ParsedRecipe[] {
  const lines = text.split("\n");
  const recipes: ParsedRecipe[] = [];

  // A recipe block starts with "N. <Title>" (number-dot-space) and the next
  // non-empty line matches "X kcal | Protein Yg | Carbs Yg | Fat Yg". The
  // index table also has numbers but each cell is on its own line, so the
  // macro pattern never follows in the index — making this disambiguation safe.
  const isMacroLine = (s: string) =>
    /^(\d+)\s*kcal\s*\|\s*Protein\s+([\d.]+)g\s*\|\s*Carbs\s+([\d.]+)g\s*\|\s*Fat\s+([\d.]+)g/i.test(
      s,
    );

  const peekNonEmpty = (from: number) => {
    let j = from;
    while (j < lines.length && !lines[j].trim()) j++;
    return j;
  };

  let i = 0;
  while (i < lines.length) {
    const titleMatch = lines[i].match(/^(\d+)\.\s+(.+)$/);
    if (!titleMatch) {
      i++;
      continue;
    }
    const j = peekNonEmpty(i + 1);
    if (j >= lines.length || !isMacroLine(lines[j])) {
      i++;
      continue;
    }
    const macroMatch = lines[j].match(
      /^(\d+)\s*kcal\s*\|\s*Protein\s+([\d.]+)g\s*\|\s*Carbs\s+([\d.]+)g\s*\|\s*Fat\s+([\d.]+)g/i,
    )!;

    const number = parseInt(titleMatch[1], 10);
    const name = titleMatch[2].trim();
    const calories = parseInt(macroMatch[1], 10);
    const protein_g = parseFloat(macroMatch[2]);
    const carbs_g = parseFloat(macroMatch[3]);
    const fat_g = parseFloat(macroMatch[4]);

    // Tags line — diet, slot, goal, optional gluten-free
    const k = peekNonEmpty(j + 1);
    const tagLine = lines[k] || "";
    const tagMatch = tagLine.match(/^Tags:\s*(.+)$/i);
    let diet: string | null = null;
    let meal_type = "";
    let gluten_free = false;
    if (tagMatch) {
      const tags = tagMatch[1].split("•").map((t) => t.trim().toLowerCase());
      for (const t of tags) {
        if (DIET_MAP[t]) diet = DIET_MAP[t];
        if (SLOT_MAP[t]) meal_type = SLOT_MAP[t];
        if (t === "gluten-free") gluten_free = true;
      }
    }

    // Allergens line
    const l = peekNonEmpty(k + 1);
    const allergensMatch = lines[l]?.match(/^Allergens:\s*(.+)$/i);
    let allergens: string[] = [];
    if (allergensMatch) {
      const raw = allergensMatch[1].trim();
      if (raw.toLowerCase() !== "none") {
        allergens = raw
          .split(",")
          .map((a) => a.trim().toLowerCase())
          .filter(Boolean);
      }
    }

    // Ingredients — between "Ingredients" header and "Method" header
    let m = l + 1;
    while (m < lines.length && lines[m].trim().toLowerCase() !== "ingredients")
      m++;
    m++;
    const ingredients: string[] = [];
    while (m < lines.length && lines[m].trim().toLowerCase() !== "method") {
      const line = lines[m].trim();
      if (line) ingredients.push(line);
      m++;
    }
    m++; // skip "Method"

    // Method — until next recipe (number + title with macro line) or EOF
    const method: string[] = [];
    while (m < lines.length) {
      const isRecipeStart = lines[m].match(/^(\d+)\.\s+(.+)$/);
      if (isRecipeStart) {
        const nextNonEmpty = peekNonEmpty(m + 1);
        if (nextNonEmpty < lines.length && isMacroLine(lines[nextNonEmpty])) {
          break;
        }
      }
      const line = lines[m].trim();
      if (line) method.push(line);
      m++;
    }

    recipes.push({
      number,
      name,
      category,
      meal_type,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      diet,
      gluten_free,
      allergens,
      ingredients,
      method,
    });
    i = m;
  }

  return recipes;
}

// ──────────────────────────────────────────────────────────────────────────
// Validation — catch parsing slip-ups before we trust the import
// ──────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────
// SQL emitter — produces a single transactional seed script. Idempotent:
// each run replaces all source='owner' rows (ingredients/steps cascade).
// ──────────────────────────────────────────────────────────────────────────

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

function pgArray(values: string[]): string {
  if (values.length === 0) return "ARRAY[]::TEXT[]";
  return "ARRAY[" + values.map((v) => `'${sqlEscape(v)}'`).join(", ") + "]";
}

function renderSql(recipes: ParsedRecipe[]): string {
  const out: string[] = [];
  out.push("-- Auto-generated by scripts/import_owner_meals.ts");
  out.push("-- Seeds the owner-curated meal library (source='owner').");
  out.push("-- Idempotent: re-running this seed replaces all owner rows.");
  out.push("");
  out.push("BEGIN;");
  out.push("");
  out.push("-- Cascade deletes ingredients + steps via FK ON DELETE CASCADE.");
  out.push("DELETE FROM public.recipes WHERE source = 'owner';");
  out.push("");

  for (const r of recipes) {
    const dietary_tags: string[] = [];
    if (r.diet) dietary_tags.push(r.diet);
    if (r.gluten_free) dietary_tags.push("gluten-free");

    out.push("WITH new_recipe AS (");
    out.push("  INSERT INTO public.recipes (");
    out.push(
      "    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source",
    );
    out.push("  ) VALUES (");
    out.push(`    '${sqlEscape(r.name)}',`);
    out.push(`    '${r.category}',`);
    out.push(`    '${r.meal_type}',`);
    out.push(`    ${r.calories},`);
    out.push(`    ${r.protein_g},`);
    out.push(`    ${r.carbs_g},`);
    out.push(`    ${r.fat_g},`);
    out.push(`    ${pgArray(dietary_tags)},`);
    out.push(`    ${pgArray(r.allergens)},`);
    out.push(`    'owner'`);
    out.push("  ) RETURNING id");
    out.push(")");

    const ingredientRows = r.ingredients.map(
      (item, idx) => `(SELECT id FROM new_recipe), '${sqlEscape(item)}', ${idx}`,
    );
    const stepRows = r.method.map(
      (instruction, idx) =>
        `(SELECT id FROM new_recipe), ${idx + 1}, '${sqlEscape(instruction)}'`,
    );

    if (ingredientRows.length || stepRows.length) {
      if (ingredientRows.length && stepRows.length) {
        out.push(", ing AS (");
        out.push("  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES");
        out.push("    " + ingredientRows.map((r) => `(${r})`).join(",\n    "));
        out.push("  RETURNING 1");
        out.push(")");
        out.push("INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES");
        out.push("    " + stepRows.map((r) => `(${r})`).join(",\n    ") + ";");
      } else if (ingredientRows.length) {
        out.push("INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES");
        out.push("    " + ingredientRows.map((r) => `(${r})`).join(",\n    ") + ";");
      } else {
        out.push("INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES");
        out.push("    " + stepRows.map((r) => `(${r})`).join(",\n    ") + ";");
      }
    } else {
      out.push("SELECT 1 FROM new_recipe;");
    }
    out.push("");
  }

  out.push("COMMIT;");
  return out.join("\n");
}

function validate(r: ParsedRecipe): string[] {
  const problems: string[] = [];
  if (!r.name) problems.push("missing name");
  if (!r.meal_type) problems.push("missing meal_type (slot)");
  if (!r.calories || r.calories < 50 || r.calories > 1500)
    problems.push(`suspicious calories: ${r.calories}`);
  if (!r.ingredients.length) problems.push("no ingredients");
  if (!r.method.length) problems.push("no method steps");
  if (!r.diet) problems.push("no diet tag");
  return problems;
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  const files = discoverFiles(dir!);
  console.log(`Found ${files.length} files in ${dir}:`);
  for (const f of files) console.log(`  - ${path.basename(f.path)} → ${f.category}`);
  if (files.length !== 4) {
    console.warn(
      "Expected 4 files (Lose_Weight, Gain_Weight, Build_Muscle, Recovery).",
    );
  }

  let allRecipes: ParsedRecipe[] = [];
  for (const file of files) {
    console.log(`\nParsing ${path.basename(file.path)}…`);
    const text = extractDocxText(file.path);
    const parsed = parseRecipes(text, file.category);
    console.log(`  → ${parsed.length} recipes parsed`);

    const broken = parsed.filter((r) => validate(r).length > 0);
    if (broken.length) {
      console.warn(`  ⚠ ${broken.length} recipes failed validation:`);
      for (const r of broken.slice(0, 5)) {
        console.warn(
          `    #${r.number} "${r.name.slice(0, 50)}": ${validate(r).join(", ")}`,
        );
      }
      if (broken.length > 5) console.warn(`    …and ${broken.length - 5} more`);
    }
    allRecipes = allRecipes.concat(parsed);
  }

  console.log(`\nTotal: ${allRecipes.length} recipes ready to import.`);
  if (allRecipes.length > 0) {
    console.log("Sample (first parsed):", JSON.stringify(allRecipes[0], null, 2));
  }

  if (dryRun) {
    console.log("\n--dry-run — no DB changes made.");
    return;
  }

  if (emitSqlPath) {
    const sql = renderSql(allRecipes);
    await Bun.write(emitSqlPath, sql);
    console.log(`\nWrote SQL seed to ${emitSqlPath} (${(sql.length / 1024).toFixed(0)} KB).`);
    console.log("Apply via: supabase db push  (after committing as a migration)");
    return;
  }

  if (!supabase) throw new Error("supabase client missing");

  console.log("\nWiping existing source='owner' rows (cascades to ingredients/steps)…");
  const { error: delErr } = await supabase
    .from("recipes")
    .delete()
    .eq("source", "owner");
  if (delErr) {
    console.error("Delete failed:", delErr.message);
    process.exit(1);
  }

  console.log("Inserting recipes…");
  let inserted = 0;
  let failed = 0;
  for (const r of allRecipes) {
    const dietary_tags: string[] = [];
    if (r.diet) dietary_tags.push(r.diet);
    if (r.gluten_free) dietary_tags.push("gluten-free");

    const { data: row, error } = await supabase
      .from("recipes")
      .insert({
        name: r.name,
        category: r.category,
        meal_type: r.meal_type,
        calories: r.calories,
        protein_g: r.protein_g,
        carbs_g: r.carbs_g,
        fat_g: r.fat_g,
        dietary_tags,
        allergens: r.allergens,
        source: "owner",
      })
      .select("id")
      .single();

    if (error || !row) {
      failed++;
      console.error(`  ✗ "${r.name.slice(0, 60)}": ${error?.message ?? "no row"}`);
      continue;
    }

    if (r.ingredients.length) {
      const rows = r.ingredients.map((item, idx) => ({
        recipe_id: row.id,
        item,
        sort_order: idx,
      }));
      const { error: ingErr } = await supabase.from("ingredients").insert(rows);
      if (ingErr) console.error(`    ingredients failed: ${ingErr.message}`);
    }

    if (r.method.length) {
      const rows = r.method.map((instruction, idx) => ({
        recipe_id: row.id,
        step_number: idx + 1,
        instruction,
      }));
      const { error: stepErr } = await supabase.from("steps").insert(rows);
      if (stepErr) console.error(`    steps failed: ${stepErr.message}`);
    }

    inserted++;
    if (inserted % 50 === 0) console.log(`  …${inserted} inserted`);
  }

  console.log(`\nDone. Inserted ${inserted}, failed ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
