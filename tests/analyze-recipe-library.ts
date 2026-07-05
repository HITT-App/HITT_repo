/**
 * Profiles the owner recipe library so we can see whether it can actually
 * serve the variety of macro requests users make.
 *   TEST_EMAIL=... TEST_PASSWORD=... bun run tests/analyze-recipe-library.ts
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbrqdlkjoxvglcdlixbi.supabase.co';
const ANON_KEY     = 'sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM';

interface R { meal_type: string; category: string | null; calories: number; protein_g: number; carbs_g: number; fat_g: number; dietary_tags: string[] | null; allergens: string[] | null; }

const q = (arr: number[], p: number) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.floor(p * s.length));
  return s[i];
};
const fmt = (arr: number[]) => arr.length
  ? `min ${Math.round(Math.min(...arr))} · p25 ${Math.round(q(arr,0.25))} · med ${Math.round(q(arr,0.5))} · p75 ${Math.round(q(arr,0.75))} · max ${Math.round(Math.max(...arr))}`
  : '(none)';

async function main() {
  const s = createClient(SUPABASE_URL, ANON_KEY);
  const { data: auth, error: ae } = await s.auth.signInWithPassword({ email: process.env.TEST_EMAIL!, password: process.env.TEST_PASSWORD! });
  if (ae || !auth.session) throw new Error('auth: ' + ae?.message);
  const db = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } } });

  // Drain (paginate — PostgREST caps at 1000/response)
  const rows: R[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('recipes')
      .select('meal_type, category, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens')
      .eq('source', 'owner').range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as R[]));
    if (data.length < 1000) break;
  }
  console.log('TOTAL owner recipes:', rows.length, '\n');

  const types = ['breakfast', 'lunch', 'dinner', 'snack'];
  for (const t of types) {
    const rs = rows.filter(r => r.meal_type === t);
    console.log('═'.repeat(72));
    console.log(`${t.toUpperCase()}  (${rs.length} recipes)`);
    console.log('  calories:', fmt(rs.map(r => +r.calories)));
    console.log('  protein :', fmt(rs.map(r => +r.protein_g)));
    console.log('  carbs   :', fmt(rs.map(r => +r.carbs_g)));
    console.log('  fat     :', fmt(rs.map(r => +r.fat_g)));
    // Coverage buckets that matter for extreme requests
    const lowFat = rs.filter(r => +r.fat_g <= 5).length;
    const lowFat10 = rs.filter(r => +r.fat_g <= 10).length;
    const hiProt = rs.filter(r => +r.protein_g >= 30).length;
    const lowCarb = rs.filter(r => +r.carbs_g <= 10).length;
    const hiCal = rs.filter(r => +r.calories >= 600).length;
    const leanDense = rs.filter(r => +r.calories >= 400 && +r.fat_g <= 10).length;
    console.log(`  buckets : ≤5g fat: ${lowFat}   ≤10g fat: ${lowFat10}   ≥30g protein: ${hiProt}   ≤10g carb: ${lowCarb}   ≥600 kcal: ${hiCal}   lean+dense(≥400kcal,≤10g fat): ${leanDense}`);
  }

  // Diet coverage
  console.log('═'.repeat(72));
  const tagCount = (tag: string, t?: string) => rows.filter(r => (!t || r.meal_type === t) && (r.dietary_tags ?? []).map(x => x.toLowerCase()).includes(tag)).length;
  for (const tag of ['vegan', 'vegetarian', 'pescatarian', 'keto', 'gluten_free', 'dairy_free']) {
    console.log(`  ${tag.padEnd(12)}: total ${tagCount(tag)}  (b ${tagCount(tag,'breakfast')} / l ${tagCount(tag,'lunch')} / d ${tagCount(tag,'dinner')} / s ${tagCount(tag,'snack')})`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
