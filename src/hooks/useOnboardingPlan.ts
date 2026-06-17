import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OnboardingAnswers {
  goal: string;
  experience: string;
  daysPerWeek: number;
  selectedDays: number[];   // 0=Sun, 1=Mon … 6=Sat
  sessionMinutes: number;
}

export interface ScheduledItem {
  workout_id: string;
  workout_title: string;
  scheduled_date: string;
}

export function useOnboardingPlan() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Map the AI plan's sequential items to the user's chosen days of week
  const mapToSelectedDays = (
    planItems: { day_index: number; workout_id: string; workout_title?: string }[],
    selectedDays: number[]
  ): { workout_id: string; workout_title: string; date: Date }[] => {
    if (!planItems.length || !selectedDays.length) return [];

    const sorted = [...selectedDays].sort((a, b) => a - b);
    const today = new Date();
    const todayDow = today.getDay();

    // Build upcoming dates for selected days (next 4 weeks)
    const upcomingDates: Date[] = [];
    for (let week = 0; week < 4; week++) {
      for (const dow of sorted) {
        const diff = ((dow - todayDow + 7) % 7) + week * 7;
        if (diff === 0 && week === 0) continue; // skip today — start next occurrence
        const d = new Date(today);
        d.setDate(today.getDate() + (diff || 7));
        upcomingDates.push(d);
      }
    }
    upcomingDates.sort((a, b) => a.getTime() - b.getTime());

    return planItems.slice(0, upcomingDates.length).map((item, i) => ({
      workout_id: item.workout_id,
      workout_title: item.workout_title ?? 'Workout',
      date: upcomingDates[i],
    }));
  };

  const generatePlan = useCallback(async (answers: OnboardingAnswers) => {
    if (!user) return;
    setIsGenerating(true);
    setError(null);
    setScheduledItems([]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-workout-plan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            goal: answers.goal,
            days: answers.daysPerWeek * 4,       // 4-week plan
            sessions_per_week: answers.daysPerWeek,
            duration_minutes: answers.sessionMinutes,
            title: `${answers.goal} Plan`,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Plan generation failed');
      }

      const data = await res.json();
      // data.plan_items: [{ day_index, workout_id, workout_title? }]
      const planItems: { day_index: number; workout_id: string; workout_title?: string }[] =
        data.items ?? [];

      const mapped = mapToSelectedDays(planItems, answers.selectedDays);
      setScheduledItems(
        mapped.map(m => ({
          workout_id: m.workout_id,
          workout_title: m.workout_title,
          scheduled_date: m.date.toISOString().split('T')[0],
        }))
      );
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  }, [user]);

  const confirmSchedule = useCallback(async () => {
    if (!user || !scheduledItems.length) return false;

    const rows = scheduledItems.map(item => ({
      user_id: user.id,
      workout_id: item.workout_id,
      scheduled_date: item.scheduled_date,
      scheduled_time: null,
    }));

    const { error: insertError } = await supabase
      .from('scheduled_workouts')
      .insert(rows);

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    // Mark onboarding complete so the prompt doesn't appear again
    localStorage.setItem('hiit-plan-onboarding-done', 'true');
    return true;
  }, [user, scheduledItems]);

  return { isGenerating, scheduledItems, error, generatePlan, confirmSchedule };
}
