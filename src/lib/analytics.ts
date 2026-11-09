import posthog from 'posthog-js';

// While off, PostHog isn't started at all, so the app doesn't contact it.
const OFF_KEY = 'hiit.analytics.off';

function analyticsOff(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) === '1';
  } catch {
    return false;
  }
}

export function initAnalytics() {
  if (!import.meta.env.VITE_POSTHOG_KEY || analyticsOff() || posthog.__loaded) return;
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    // Screens show health data, so recording stays off whatever PostHog's project setting says.
    disable_session_recording: true,
    // Not used, and it would load a script from PostHog even for someone who's opted out.
    disable_surveys: true,
  });
}

export function isAnalyticsEnabled(): boolean {
  return !!import.meta.env.VITE_POSTHOG_KEY && !analyticsOff();
}

// Saved on this device. Turning it back on starts PostHog without a restart.
export function setAnalyticsEnabled(enabled: boolean) {
  try {
    if (enabled) localStorage.removeItem(OFF_KEY);
    else localStorage.setItem(OFF_KEY, '1');
  } catch {
    // Storage blocked: the choice still applies until the app restarts.
  }
  if (enabled) {
    initAnalytics();
    if (posthog.__loaded) posthog.opt_in_capturing();
  } else if (posthog.__loaded) {
    posthog.opt_out_capturing();
  }
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  posthog.identify(userId, properties);
}

export function resetAnalyticsUser() {
  posthog.reset();
}

export function track(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}

// ── Named events ────────────────────────────────────────────────────

export const Analytics = {
  userSignedUp: (method: 'email' | 'google') =>
    track('user_signed_up', { method }),

  workoutStarted: (type: string) =>
    track('workout_started', { activity_type: type }),

  workoutCompleted: (props: { type: string; durationSecs: number; distanceKm?: number; calories?: number }) =>
    track('workout_completed', {
      activity_type: props.type,
      duration_secs: props.durationSecs,
      distance_km: props.distanceKm,
      calories: props.calories,
    }),

  mealLogged: (source: 'manual' | 'barcode' | 'scanner') =>
    track('meal_logged', { source }),

  planGenerated: (type: 'workout' | 'nutrition' | 'activity') =>
    track('plan_generated', { plan_type: type }),

  premiumFeatureViewed: (feature?: string) =>
    track('premium_feature_viewed', { feature }),

  subscriptionCheckoutStarted: () =>
    track('subscription_checkout_started'),
};
