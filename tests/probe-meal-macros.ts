/**
 * Macro-match battery — normal + extreme (but internally CONSISTENT) requests,
 * to see which the library can actually match. Prints the test account's diet
 * profile first (it constrains the pool).
 *   TEST_EMAIL=... TEST_PASSWORD=... bun run tests/probe-meal-macros.ts
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbrqdlkjoxvglcdlixbi.supabase.co';
const ANON_KEY     = 'sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM';
const FN_URL       = `${SUPABASE_URL}/functions/v1/ai-coach`;

interface T { cal: number; p: number; c: number; f: number; }
const BATTERY: Array<{ label: string; msg: string; t: T }> = [
  { label: 'N1 balanced maintenance', msg: 'meal plan for the day: 2000 calories, 150g protein, 200g carbs, 60g fat', t: { cal: 2000, p: 150, c: 200, f: 60 } },
  { label: 'N2 high-protein cut',      msg: 'meal plan for the day: 1700 calories, 160g protein, 130g carbs, 50g fat', t: { cal: 1700, p: 160, c: 130, f: 50 } },
  { label: 'N3 muscle bulk',           msg: 'meal plan for the day: 3000 calories, 200g protein, 350g carbs, 90g fat', t: { cal: 3000, p: 200, c: 350, f: 90 } },
  { label: 'E1 low-fat / high-carb',   msg: 'meal plan for the day: 2600 calories, 180g protein, 400g carbs, 35g fat', t: { cal: 2600, p: 180, c: 400, f: 35 } },
  { label: 'E2 keto / very low carb',  msg: 'keto meal plan for the day: 1800 calories, 130g protein, 35g carbs, 125g fat', t: { cal: 1800, p: 130, c: 35, f: 125 } },
  { label: 'E3 very high protein',     msg: 'meal plan for the day: 2400 calories, 260g protein, 200g carbs, 55g fat', t: { cal: 2400, p: 260, c: 200, f: 55 } },
  { label: 'E4 very high calorie',     msg: 'meal plan for the day: 3500 calories, 220g protein, 450g carbs, 100g fat', t: { cal: 3500, p: 220, c: 450, f: 100 } },
  { label: 'E5 very low calorie',      msg: 'meal plan for the day: 1200 calories, 110g protein, 100g carbs, 35g fat', t: { cal: 1200, p: 110, c: 100, f: 35 } },
  { label: 'E6 ultra low fat',         msg: 'meal plan for the day: 2200 calories, 170g protein, 330g carbs, 20g fat', t: { cal: 2200, p: 170, c: 330, f: 20 } },
];

async function main() {
  const s = createClient(SUPABASE_URL, ANON_KEY);
  const { data: auth, error: ae } = await s.auth.signInWithPassword({ email: process.env.TEST_EMAIL!, password: process.env.TEST_PASSWORD! });
  if (ae || !auth.session) throw new Error('auth: ' + ae?.message);
  const tok = auth.session.access_token;
  const db = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${tok}` } } });
  const { data: prof } = await db.from('nutrition_profiles').select('food_preferences, allergies').eq('user_id', auth.session.user.id).maybeSingle();
  console.log('TEST ACCOUNT profile — diet:', JSON.stringify(prof?.food_preferences ?? []), ' allergies:', JSON.stringify(prof?.allergies ?? []));
  console.log('(results below are constrained to this diet/allergen subset)\n');

  const pct = (got: number, want: number) => want ? Math.round((got / want) * 100) : 0;
  const flag = (p: number) => (p >= 85 && p <= 120) ? '✅' : (p >= 70 && p <= 140) ? '🟡' : '❌';

  for (const b of BATTERY) {
    const macroKcal = b.t.p * 4 + b.t.c * 4 + b.t.f * 9;
    const consistent = macroKcal >= b.t.cal * 0.9 && macroKcal <= b.t.cal * 1.1;
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'X-Response-Format': 'structured-v1' },
      body: JSON.stringify({ messages: [{ role: 'user', content: b.msg }], customMemory: '', customResponseStyle: '' }),
    });
    if (!res.ok) { console.log(b.label, '→ HTTP', res.status); continue; }
    const text = await res.text();
    const actions: any[] = [];
    for (const line of text.split('\n')) { if (!line.startsWith('data: ')) continue; const d = line.slice(6).trim(); if (d === '[DONE]') continue; try { const c = JSON.parse(d); if (c.type === 'action') actions.push(c.action); } catch {} }
    const plan = actions.find(a => a.type === 'recommend_meal_plan');
    console.log('═'.repeat(72));
    console.log(`${b.label}  ${consistent ? '' : '(⚠️ macros sum to ' + macroKcal + ' kcal — inconsistent)'}`);
    console.log(`  target: ${b.t.cal}/${b.t.p}p/${b.t.c}c/${b.t.f}f`);
    if (!plan) { console.log('  → NO plan action:', actions.map(a => a.type).join(',') || '(none)'); continue; }
    const meals = plan.payload.meals as any[];
    const g = meals.reduce((s, m) => ({ cal: s.cal + (+m.calories || 0), p: s.p + (+m.protein_g || 0), c: s.c + (+m.carbs_g || 0), f: s.f + (+m.fat_g || 0) }), { cal: 0, p: 0, c: 0, f: 0 });
    const pc = pct(g.cal, b.t.cal), pp = pct(g.p, b.t.p), pcc = pct(g.c, b.t.c), pf = pct(g.f, b.t.f);
    console.log(`  got   : ${meals.length} items → ${Math.round(g.cal)}/${Math.round(g.p)}p/${Math.round(g.c)}c/${Math.round(g.f)}f`);
    console.log(`  match : cal ${pc}%${flag(pc)}  protein ${pp}%${flag(pp)}  carbs ${pcc}%${flag(pcc)}  fat ${pf}%${flag(pf)}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
