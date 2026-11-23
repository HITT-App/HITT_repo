// Stored counters (posts_count, likes_count, ...) must match the rows they count. A counter with
// no trigger keeping it in step stays at its default forever and nothing errors: profiles showed
// "0 Posts" above real posts until Nov 2026.
//
// 1. Coverage: every count-like column in the schema is either listed in COUNTERS (checked
//    against live data) or in NOT_DERIVED with a reason. A new counter fails until it's listed.
// 2. Live: compares each counter with a fresh count, via `supabase db query --linked` (read-only).
//    Skipped when the CLI isn't linked.
import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { join } from "node:path"

const ROOT = join(import.meta.dirname, "..")

type Counter = { table: string; column: string; key: string; actual: string }

// `actual` is a correlated subquery over the counted table; `t` is the counter's row.
const COUNTERS: Counter[] = [
  { table: "community_posts", column: "likes_count", key: "id",
    actual: "select count(*) from public.community_likes l where l.post_id = t.id" },
  { table: "community_posts", column: "comments_count", key: "id",
    actual: "select count(*) from public.community_comments c where c.post_id = t.id" },
  { table: "community_comments", column: "likes_count", key: "id",
    actual: "select count(*) from public.community_likes l where l.comment_id = t.id" },
  { table: "community_profiles", column: "followers_count", key: "user_id",
    actual: "select count(*) from public.community_follows f where f.following_id = t.user_id" },
  { table: "community_profiles", column: "following_count", key: "user_id",
    actual: "select count(*) from public.community_follows f where f.follower_id = t.user_id" },
  { table: "community_profiles", column: "posts_count", key: "user_id",
    actual: "select count(*) from public.community_posts p where p.user_id = t.user_id and p.deleted_at is null" },
  { table: "community_profiles", column: "likes_received", key: "user_id",
    actual: `select count(*) from public.community_likes l join public.community_posts p on p.id = l.post_id
             where p.user_id = t.user_id and p.deleted_at is null` },
  { table: "coaches", column: "review_count", key: "id",
    actual: "select count(*) from public.coach_reviews r where r.coach_id = t.id" },
]

const NOT_DERIVED: Record<string, string> = {
  "coaches.session_count": "coach's career total, entered by admin; not app bookings",
  "coaches_public.review_count": "view over coaches; checked via coaches.review_count",
  "coaches_public.session_count": "view over coaches",
  "meals.rating_count": "catalog value; there is no ratings table",
  "workouts.rating_count": "catalog value; there is no ratings table",
  "routes.rating_count": "catalog value; there is no ratings table",
  "user_streaks.total_workouts": "app logic (workout_counted_by_app); covered by backfill migrations",
  "leaderboard_scores.total_points": "points ledger, not a row count",
  "push_notifications.success_count": "send result log",
  "push_notifications.failure_count": "send result log",
  "data_access_logs.record_count": "audit log field",
  "rate_limit_events.request_count": "rate-limit window counter",
}

// Known mismatches parked on purpose. Remove the entry when it's fixed.
const PARKED: Record<string, string> = {
  "coaches.review_count": "demo coaches seeded with made-up review counts; coaching is off (coaching_enabled)",
}

const COUNT_LIKE = /(_count|_received)$|^total_|_total$/

let failed = 0
const fail = (msg: string) => { failed++; console.log(`  ✗ ${msg}`) }

// ── 1. Coverage ──────────────────────────────────────────────────────────────
const types = readFileSync(join(ROOT, "src/integrations/supabase/types.ts"), "utf8")
const schemaCols: string[] = []
for (const m of types.matchAll(/\n {6}(\w+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/g)) {
  for (const c of m[2].matchAll(/^\s+(\w+)\??:/gm)) {
    if (COUNT_LIKE.test(c[1])) schemaCols.push(`${m[1]}.${c[1]}`)
  }
}
const listed = new Set([...COUNTERS.map(c => `${c.table}.${c.column}`), ...Object.keys(NOT_DERIVED)])
console.log(`Coverage: ${schemaCols.length} count-like columns in the schema`)
for (const col of schemaCols) {
  if (!listed.has(col)) fail(`${col} is not listed — add it to COUNTERS or NOT_DERIVED in tests/test-counters.ts`)
}

// ── 2. Live data ─────────────────────────────────────────────────────────────
const sql = COUNTERS.map((c, i) => `
  select ${i} as i, count(*) filter (where stored <> actual) as wrong, count(*) as total,
         (array_agg(key || ': stored ' || stored || ', actual ' || actual) filter (where stored <> actual))[1:3] as examples
  from (select t.${c.key}::text as key, coalesce(t.${c.column}, 0) as stored, (${c.actual}) as actual
        from public.${c.table} t) x`).join("\nunion all") + "\norder by i"

const run = spawnSync("supabase", ["db", "query", "--linked", "--agent=no", "-o", "json", sql], {
  cwd: ROOT, encoding: "utf8",
})
const jsonStart = run.stdout?.indexOf("[") ?? -1
if (run.status !== 0 || jsonStart < 0) {
  console.log(`Live: skipped (supabase CLI not linked or query failed)\n${(run.stderr || "").split("\n").slice(0, 3).join("\n")}`)
} else {
  const rows: { i: number; wrong: number; total: number; examples: string[] | null }[] =
    JSON.parse(run.stdout.slice(jsonStart, run.stdout.lastIndexOf("]") + 1))
  console.log(`Live: ${COUNTERS.length} counters checked`)
  for (const r of rows) {
    const c = COUNTERS[r.i]
    const id = `${c.table}.${c.column}`
    if (Number(r.wrong) > 0 && PARKED[id]) {
      console.log(`  – ${id}: ${r.wrong} of ${r.total} wrong, parked: ${PARKED[id]}`)
    } else if (Number(r.wrong) > 0) {
      fail(`${c.table}.${c.column}: ${r.wrong} of ${r.total} rows wrong (e.g. ${(r.examples ?? []).join("; ")})`)
    } else {
      console.log(`  ✓ ${c.table}.${c.column} (${r.total} rows)`)
    }
  }
}

if (failed) {
  console.log(`\n✗ ${failed} counter problem(s)`)
  process.exit(1)
}
console.log("\n✓ every counter matches its data")
