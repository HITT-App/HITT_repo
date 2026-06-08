import type { SupabaseClient } from '@supabase/supabase-js'

export async function recordActiveDay(
  sb: SupabaseClient,
  userId: string
): Promise<number> {
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await sb
    .from('user_streaks')
    .select('id, current_streak, longest_streak, last_workout_date')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing?.last_workout_date === today) {
    return existing.current_streak
  }

  let newStreak = 1
  if (existing?.last_workout_date) {
    const diffDays = Math.floor(
      (new Date(today).getTime() - new Date(existing.last_workout_date).getTime()) / 86_400_000
    )
    newStreak = diffDays === 1 ? existing.current_streak + 1 : 1
  }

  const longest = existing ? Math.max(existing.longest_streak, newStreak) : newStreak

  if (existing) {
    await sb
      .from('user_streaks')
      .update({ current_streak: newStreak, longest_streak: longest, last_workout_date: today })
      .eq('user_id', userId)
  } else {
    await sb.from('user_streaks').insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_workout_date: today,
      total_workouts: 0,
    })
  }

  return newStreak
}
