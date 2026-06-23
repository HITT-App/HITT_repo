import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export type ActivityLevel = 'none' | 'light' | 'moderate' | 'active' | 'very_active';

const CACHE_KEY = 'hiit-health-profile';
const CACHE_TS_KEY = 'hiit-health-profile-at';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — refresh when user returns from a workout
const LEVEL_KEY = 'hiit-health-activity-level';

function activityLevelFrom(weeklyAvg: number): ActivityLevel {
  if (weeklyAvg === 0) return 'none';
  if (weeklyAvg < 1)   return 'light';
  if (weeklyAvg < 3)   return 'moderate';
  if (weeklyAvg < 5)   return 'active';
  return 'very_active';
}

export function useHealthProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<string>(
    () => localStorage.getItem(CACHE_KEY) ?? ''
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    () => (localStorage.getItem(LEVEL_KEY) as ActivityLevel) ?? 'none'
  );

  const buildProfile = useCallback(async (force = false) => {
    if (!user) return;

    // Use cached version if fresh enough — but always rebuild if cache shows
    // "no activity" in case permissions were just granted
    if (!force) {
      const ts = localStorage.getItem(CACHE_TS_KEY);
      if (ts && Date.now() - parseInt(ts) < CACHE_TTL_MS) {
        const cached = localStorage.getItem(CACHE_KEY);
        const cachedLevel = localStorage.getItem(LEVEL_KEY) as ActivityLevel;
        // If cached shows no activity, rebuild in case auth was pending
        if (cached && cachedLevel !== 'none') { setProfile(cached); return; }
      }
    }

    const now = new Date();
    const d = (days: number) => new Date(now.getTime() - days * 86_400_000);

    const lines: string[] = [];
    let actLevel: ActivityLevel = 'none';

    // ── 1. Workouts from HealthKit (90 days) ──────────────────────────────
    if (Capacitor.isNativePlatform()) {
      try {
        const { Health } = await import('@capgo/capacitor-health');

        // Request authorization before querying — without this, iOS silently
        // returns empty results even when data exists in Apple Health.
        await Health.requestAuthorization({
          read: ['workouts', 'steps', 'heartRate', 'restingHeartRate',
                 'sleep', 'weight', 'bodyFat', 'totalCalories',
                 'heartRateVariability'],
        }).catch(() => {}); // non-fatal if already granted or denied

        const res = await Health.queryWorkouts({
          startDate: d(90).toISOString(),
          endDate: now.toISOString(),
          limit: 300,
          ascending: false,
        }).catch(() => ({ workouts: [] }));

        const wos = res.workouts ?? [];
        const count = wos.length;
        const weeklyAvg = count / 13;          // 90 days ≈ 13 weeks
        actLevel = activityLevelFrom(weeklyAvg);

        if (count > 0) {
          const typeCounts: Record<string, number> = {};
          let totalMinutes = 0;
          wos.forEach(w => {
            typeCounts[w.workoutType] = (typeCounts[w.workoutType] || 0) + 1;
            totalMinutes += (w.duration ?? 0) / 60;
          });
          const top = Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([t, n]) => `${t.replace(/([A-Z])/g, ' $1').trim()} ×${n}`)
            .join(', ');
          const avgDuration = Math.round(totalMinutes / count);
          lines.push(
            `WORKOUTS (last 90 days): ${count} sessions (~${weeklyAvg.toFixed(1)}/week), avg ${avgDuration} min` +
            (top ? ` — ${top}` : '')
          );
        } else {
          lines.push('WORKOUTS: No recorded workouts in the last 90 days');
        }
      } catch {
        lines.push('WORKOUTS: Could not read workout data');
      }
    }

    lines.push(`ACTIVITY LEVEL: ${actLevel.replace('_', ' ')}`);

    // ── 2. Steps, resting HR, weight from Supabase (30 days) ─────────────
    try {
      const { data: metrics } = await supabase
        .from('health_metrics')
        .select('metric_type, value, recorded_at')
        .eq('user_id', user.id)
        .gte('recorded_at', d(30).toISOString())
        .in('metric_type', ['steps', 'resting_heart_rate', 'heart_rate_variability', 'weight', 'body_fat']);

      const byType = (type: string) => (metrics ?? []).filter(m => m.metric_type === type);
      const avg = (arr: typeof metrics) =>
        arr && arr.length ? arr.reduce((s, m) => s + m.value, 0) / arr.length : null;

      const stepsAvg = avg(byType('steps'));
      if (stepsAvg !== null)
        lines.push(`AVG DAILY STEPS: ${Math.round(stepsAvg).toLocaleString()}`);

      const hrAvg = avg(byType('resting_heart_rate'));
      if (hrAvg !== null)
        lines.push(`RESTING HEART RATE: ${Math.round(hrAvg)} bpm`);

      const hrvAvg = avg(byType('heart_rate_variability'));
      if (hrvAvg !== null)
        lines.push(`HRV: ${Math.round(hrvAvg)} ms`);

      const weights = byType('weight').sort(
        (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      );
      if (weights.length)
        lines.push(`WEIGHT: ${weights[0].value.toFixed(1)} kg`);

      const bfAvg = avg(byType('body_fat'));
      if (bfAvg !== null)
        lines.push(`BODY FAT: ${bfAvg.toFixed(1)}%`);
    } catch { /* non-fatal */ }

    // ── 3. Sleep from Supabase (14 days) ─────────────────────────────────
    try {
      const { data: sleepLogs } = await supabase
        .from('sleep_logs')
        .select('duration_minutes, deep_sleep_minutes, rem_sleep_minutes')
        .eq('user_id', user.id)
        .gte('sleep_date', format(d(14), 'yyyy-MM-dd'));

      if (sleepLogs && sleepLogs.length > 0) {
        const avgMins = sleepLogs.reduce((s, r) => s + r.duration_minutes, 0) / sleepLogs.length;
        const avgDeep = sleepLogs.reduce((s, r) => s + (r.deep_sleep_minutes || 0), 0) / sleepLogs.length;
        const avgRem  = sleepLogs.reduce((s, r) => s + (r.rem_sleep_minutes  || 0), 0) / sleepLogs.length;
        const h = Math.floor(avgMins / 60);
        const m = Math.round(avgMins % 60);
        lines.push(
          `SLEEP (14-day avg): ${h}h ${m}min/night — ${Math.round(avgDeep)} min deep, ${Math.round(avgRem)} min REM`
        );
      }
    } catch { /* non-fatal */ }

    // Body scan results (stored after AI body scan is completed)
    const scanSummary = localStorage.getItem('hiit-body-scan-summary');
    const scanAt = localStorage.getItem('hiit-body-scan-at');
    if (scanSummary && scanAt) {
      const scanAge = Date.now() - parseInt(scanAt);
      const scanDays = Math.round(scanAge / 86_400_000);
      lines.push(`\nAI BODY SCAN RESULTS (${scanDays === 0 ? 'today' : `${scanDays} days ago`}):\n${scanSummary}`);
    }

    const profileStr = lines.join('\n');
    localStorage.setItem(CACHE_KEY, profileStr);
    localStorage.setItem(CACHE_TS_KEY, Date.now().toString());
    localStorage.setItem(LEVEL_KEY, actLevel);
    setProfile(profileStr);
    setActivityLevel(actLevel);
  }, [user]);

  useEffect(() => { buildProfile(); }, [buildProfile]);

  // Refresh whenever the app comes back to the foreground — catches post-workout data
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listener: { remove: () => void } | null = null;
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) buildProfile();
    }).then(l => { listener = l; });
    return () => { listener?.remove(); };
  }, [buildProfile]);

  return { profile, activityLevel, refreshProfile: () => buildProfile(true) };
}
