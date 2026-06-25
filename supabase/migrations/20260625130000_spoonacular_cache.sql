-- Cache Spoonacular meal plan responses by macro signature.
-- A query for the same (calories, protein, carbs, fat, diet, allergies)
-- returns the cached meals if the entry is less than 24 hours old.
--
-- This cuts API costs significantly for repeat users (most ask for similar
-- macros day-to-day) and absorbs rate-limit bursts.

create table if not exists spoonacular_cache (
  signature text primary key,           -- canonical hash of the query
  meals     jsonb not null,             -- the MealInPlan[] payload
  created_at timestamptz not null default now()
);

create index if not exists idx_spoonacular_cache_created_at
  on spoonacular_cache (created_at);

-- TTL cleanup: rows older than 24h are stale. A daily cron could prune,
-- but for now we just check created_at on read.

-- No RLS — this table is only ever touched by the ai-coach edge function
-- using the service-role key. Cached meals are not user-specific.
alter table spoonacular_cache enable row level security;

create policy "service role only"
  on spoonacular_cache
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table spoonacular_cache is
  'Caches Spoonacular meal plan responses by macro signature for 24h to reduce API cost.';
