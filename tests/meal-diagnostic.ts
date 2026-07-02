// Diagnostic — which owner recipes are missing ingredients / steps?
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync("/Users/vanessa/hitt-app/.env", "utf-8")
    .split("\n")
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => {
      const [k, ...rest] = l.split("=");
      const v = rest.join("=").trim().replace(/^["']|["']$/g, "");
      return [k.trim(), v];
    })
);
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !anonKey) { console.error("missing env"); process.exit(1); }

const supabase = createClient(url, anonKey);

async function main() {
  // 0. Try signing in first — some RLS policies require an auth session even for read.
  const settingsJson = JSON.parse(readFileSync("/Users/vanessa/hitt-app/.claude/settings.local.json", "utf-8"));
  const testEmail = settingsJson?.env?.TEST_EMAIL;
  const testPass = settingsJson?.env?.TEST_PASSWORD;
  if (testEmail && testPass) {
    const { error } = await supabase.auth.signInWithPassword({ email: testEmail, password: testPass });
    console.log(error ? `auth failed: ${error.message}` : `signed in as ${testEmail}`);
  }

  // Sanity — can we read ANY recipes at all?
  const { count: anyCount } = await supabase.from("recipes").select("id", { count: "exact", head: true });
  console.log(`Total recipes visible (all sources): ${anyCount}`);

  // 1. Count owner recipes total.
  const { count: total } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("source", "owner");
  console.log(`Total owner recipes: ${total}`);

  // 2. Pull all owner recipe ids in a bounded query.
  const recipes: { id: string; name: string }[] = [];
  let from = 0;
  const chunk = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("recipes")
      .select("id, name")
      .eq("source", "owner")
      .range(from, from + chunk - 1);
    if (error) { console.error("recipes fetch:", error.message); break; }
    if (!data || data.length === 0) break;
    recipes.push(...data);
    if (data.length < chunk) break;
    from += chunk;
  }
  console.log(`Recipes fetched: ${recipes.length}`);

  // 3. Fetch every ingredient row that ties back to an owner recipe. Paginate.
  const ingCountByRecipe = new Map<string, number>();
  const stepCountByRecipe = new Map<string, number>();
  const ids = new Set(recipes.map(r => r.id));

  from = 0;
  while (true) {
    const { data } = await supabase
      .from("ingredients")
      .select("recipe_id")
      .range(from, from + 19999);
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (ids.has(row.recipe_id)) {
        ingCountByRecipe.set(row.recipe_id, (ingCountByRecipe.get(row.recipe_id) ?? 0) + 1);
      }
    }
    if (data.length < 20000) break;
    from += 20000;
  }

  from = 0;
  while (true) {
    const { data } = await supabase
      .from("steps")
      .select("recipe_id")
      .range(from, from + 19999);
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (ids.has(row.recipe_id)) {
        stepCountByRecipe.set(row.recipe_id, (stepCountByRecipe.get(row.recipe_id) ?? 0) + 1);
      }
    }
    if (data.length < 20000) break;
    from += 20000;
  }

  console.log(`Distinct recipes with ingredients: ${ingCountByRecipe.size}`);
  console.log(`Distinct recipes with steps:       ${stepCountByRecipe.size}`);

  const missingIng = recipes.filter(r => !ingCountByRecipe.has(r.id));
  const missingSteps = recipes.filter(r => !stepCountByRecipe.has(r.id));
  console.log(`\nOwner recipes with NO ingredients: ${missingIng.length}`);
  console.log(`Owner recipes with NO steps:       ${missingSteps.length}`);

  console.log("\nFirst 30 with no ingredients:");
  for (const r of missingIng.slice(0, 30)) {
    console.log(`  - ${r.name}`);
  }

  // The specific one Vanessa named.
  const peri = recipes.find(r => /peri.?peri.*salmon.*broccoli.*kale/i.test(r.name));
  if (peri) {
    console.log(`\nPeri-peri salmon target: "${peri.name}"`);
    console.log(`  id: ${peri.id}`);
    console.log(`  ingredients: ${ingCountByRecipe.get(peri.id) ?? 0}`);
    console.log(`  steps:       ${stepCountByRecipe.get(peri.id) ?? 0}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
