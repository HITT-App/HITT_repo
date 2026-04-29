import posthog from 'posthog-js';

export function initAnalytics() {
  if (!import.meta.env.VITE_POSTHOG_KEY) return;
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
  });
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
