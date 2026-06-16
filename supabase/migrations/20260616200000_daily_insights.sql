create table if not exists daily_insights (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  insight_text  text not null,
  insight_type  text not null check (insight_type in ('ai', 'rule')),
  generated_at  date not null default current_date,
  created_at    timestamptz not null default now(),
  unique (user_id)
);

alter table daily_insights enable row level security;

create policy "Users can read own insight"
  on daily_insights for select
  using (auth.uid() = user_id);

create policy "Users can upsert own insight"
  on daily_insights for insert
  with check (auth.uid() = user_id);

create policy "Users can update own insight"
  on daily_insights for update
  using (auth.uid() = user_id);
