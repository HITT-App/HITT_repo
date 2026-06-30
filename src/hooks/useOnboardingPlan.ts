import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ExerciseSnapshot } from '@/integrations/supabase/types';
import { format } from 'date-fns';

// Maps any abort-shaped error (client cancel, upstream gateway timeout) to a
// human-readable string. Without this, users see literal "AbortError: The
// signal has been aborted" when the LLM gateway hits its 55s timeout.
function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    const name = err.name;
    const msg = err.message ?? '';
    const looksAborted =
      name === 'AbortError' ||
      /aborted|abort|signal|timeout/i.test(msg);
    if (looksAborted) {
      return 'This is taking longer than expected — please try again.';
    }
    return msg || 'Something went wrong';
  }
  return 'Something went wrong';
}

export interface OnboardingAnswers {
  goal: string;
  experience: string;
  daysPerWeek: number;
  selectedDays: number[];   // 0=Sun, 1=Mon … 6=Sat
  sessionMinutes: number;
}

export interface ScheduledItem {
  workout_source: 'ai_generated';
  workout_title: string;
  exercises_snapshot: ExerciseSnapshot[];
  scheduled_date: string;
}

export function useOnboardingPlan() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight plan generation when the consumer unmounts so the
  // user doesn't see stale errors if they navigate away mid-request.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const mapToSelectedDays = (
    planItems: { day_index: number; workout_title: string; exercises_snapshot: ExerciseSnapshot[] }[],
    selectedDays: number[]
  ): { workout_title: string; exercises_snapshot: ExerciseSnapshot[]; date: Date }[] => {
    if (!planItems.length || !selectedDays.length) return [];

    const sorted = [...selectedDays].sort((a, b) => a - b);
    const today = new Date();
    const todayDow = today.getDay();

    const upcomingDates: Date[] = [];
    for (let week = 0; week < 4; week++) {
      for (const dow of sorted) {
        const diff = ((dow - todayDow + 7) % 7) + week * 7;
        if (diff === 0 && week === 0) continue;
        const d = new Date(today);
        d.setDate(today.getDate() + (diff || 7));
        upcomingDates.push(d);
      }
    }
    upcomingDates.sort((a, b) => a.getTime() - b.getTime());

    return planItems.slice(0, upcomingDates.length).map((item, i) => ({
      workout_title: item.workout_title,
      exercises_snapshot: item.exercises_snapshot,
      date: upcomingDates[i],
    }));
  };

  const generatePlan = useCallback(async (answers: OnboardingAnswers) => {
    if (!user) return;

    // Cancel any in-flight request before starting a new one (covers rapid
    // back-and-forth taps from the review step).
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

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
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            goal: answers.goal,
            days: answers.daysPerWeek * 4,
            sessions_per_week: answers.daysPerWeek,
            duration_minutes: answers.sessionMinutes,
            title: `${answers.goal} Plan`,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // The edge function wraps upstream LLM gateway timeouts as
        // { error: "AbortError: ..." } via String(err). Map that back to a
        // friendly message before throwing.
        throw new Error(body.error ?? 'Plan generation failed');
      }

      const data = await res.json();
      const planItems: { day_index: number; workout_title: string; exercises_snapshot: ExerciseSnapshot[] }[] =
        data.items ?? [];

      const mapped = mapToSelectedDays(planItems, answers.selectedDays);

      // Defensive: if the LLM returned items but mapping dropped them all (e.g.
      // empty selectedDays), surface a clear error rather than a "0 sessions" UI.
      if (planItems.length > 0 && mapped.length === 0) {
        throw new Error('Could not place the plan on your chosen days — please try again.');
      }
      if (planItems.length === 0) {
        throw new Error('We couldn\'t build a plan this time — please try again.');
      }

      setScheduledItems(
        mapped.map(m => ({
          workout_source: 'ai_generated' as const,
          workout_title: m.workout_title,
          exercises_snapshot: m.exercises_snapshot,
          scheduled_date: format(m.date, 'yyyy-MM-dd'),
        }))
      );
    } catch (err: unknown) {
      // Silent cancel — caller deliberately aborted (e.g. unmount).
      if (controller.signal.aborted) return;
      setError(friendlyError(err));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsGenerating(false);
    }
  }, [user]);

  const checkConflicts = useCallback(async (): Promise<number> => {
    if (!user || !scheduledItems.length) return 0;
    const dates = scheduledItems.map(i => i.scheduled_date).sort();
    const { count } = await supabase
      .from('scheduled_workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('scheduled_date', dates[0])
      .lte('scheduled_date', dates[dates.length - 1]);
    return count ?? 0;
  }, [user, scheduledItems]);

  const confirmSchedule = useCallback(async (strategy: 'replace' | 'add') => {
    if (!user || !scheduledItems.length) return false;

    if (strategy === 'replace') {
      const dates = scheduledItems.map(i => i.scheduled_date).sort();
      const { error: delErr } = await supabase
        .from('scheduled_workouts')
        .delete()
        .eq('user_id', user.id)
        .gte('scheduled_date', dates[0])
        .lte('scheduled_date', dates[dates.length - 1]);
      if (delErr) { setError(delErr.message); return false; }
    }

    const rows = scheduledItems.map(item => ({
      user_id: user.id,
      workout_source: 'ai_generated' as const,
      workout_title: item.workout_title,
      exercises_snapshot: item.exercises_snapshot,
      scheduled_date: item.scheduled_date,
      scheduled_time: null,
    }));

    const { error: insertError } = await supabase
      .from('scheduled_workouts')
      .insert(rows as any);

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    localStorage.setItem('hiit-plan-onboarding-done', 'true');
    return true;
  }, [user, scheduledItems]);

  return { isGenerating, scheduledItems, error, generatePlan, checkConflicts, confirmSchedule };
}
