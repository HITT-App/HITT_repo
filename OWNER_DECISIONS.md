# Owner Decisions — HIIT App

Design calls that need the owner's sign-off. Keep items open until decided, then link to the commit/PR that implemented the choice and move to "Resolved".

---

## Open

### HIIT Score — formula weighting
Current V1 (in `supabase/functions/compute-hiit-score/index.ts`):

| Component | Max | Signal |
|---|---|---|
| Baseline | 50 | — |
| Workouts completed (last 7d) | +15 | `scheduled_workouts` where `status = 'completed'`, 3 pts per session |
| Current streak | +5 | `user_streaks.current_streak`, 1 pt per day |
| Days hitting protein target | +10 | `meal_logs` summed per day vs `nutrition_goals.daily_protein_grams` (90% threshold), 2 pts per day |
| Days ≥7h sleep | +10 | `sleep_logs.duration_minutes ≥ 420`, 2 pts per day |
| Intensity | +10 | avg workout duration / 20 min, scaled |

Total clamped to `[0, 100]`. Truly inactive user → 50. Maxed → 100.

**Decision needed:** accept as-is, or adjust weights / thresholds / signal sources?

### Explainable score breakdown
Should tapping the HIIT Score badge open a popover showing "you scored 72: +12 workouts, +5 streak, +8 nutrition, …"? The `components` jsonb column is already storing the breakdown — it's a ~2-hour frontend task to surface it.

**Decision needed:** yes / no / later.

### Mental-health signal
The proposal's framing ("Master Your Mind") suggests mood should count toward the score. We already collect `daily_checkins.mood` and `daily_checkins.energy (1–5)`. Folding in, e.g., +5 for "days with self-reported energy ≥ 4" would reduce room in the existing categories.

**Decision needed:** include a mindfulness component from day one, or wait for user data first?

### Nightly cron
The app currently recomputes scores client-side on home load (for active users only). For inactive users the trend chart will gap during their absence. A pg_cron nightly job would close that gap — SQL is in `supabase/manual_setup/pg_cron_hiit_score.sql`, ready to run in the Supabase SQL editor when the owner wants it enabled.

**Decision needed:** enable cron now, or wait until retention/trend analysis matters?

---

## Resolved

_(none yet)_
