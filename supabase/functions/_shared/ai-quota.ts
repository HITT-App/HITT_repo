// Per-user daily quota for AI-calling edge functions.
//
// Counts rows in ai_generation_log for the caller over the last 24 hours and
// returns a 429 Response if they're over the cap. All limits are deliberately
// soft enough that legitimate power users never hit them; the point is to
// catch a single buggy or malicious client hitting a function in a tight
// loop before it burns the AI budget.
//
// Defaults can be overridden per endpoint; pass a higher cap for ai-coach
// (long conversations) than for plan generation.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface QuotaOptions {
  /** Max generations of this type per 24h per user. */
  dailyCap: number;
  /** generation_type to check against ai_generation_log. */
  generationType: string;
}

export const DEFAULT_QUOTAS: Record<string, number> = {
  ai_coach: 200,
  workout_plan: 20,
  meal_plan: 20,
  smart_insights: 50,
  activity_recommendations: 50,
  sleep_recommendations: 50,
  workout_recommendations: 50,
  analyze_food: 50,
  analyze_body: 20,
  analyze_form: 100,
  activity_image: 30,
  // 5F — review these limits before production; 10 plans/day is generous at scale
  generate_ai_workout: 20,
  generate_ai_workout_plan: 10,
};

export interface QuotaResult {
  ok: boolean;
  used: number;
  cap: number;
  resetsAtISO: string;
}

export async function checkAIQuota(
  admin: SupabaseClient,
  userId: string,
  opts: QuotaOptions
): Promise<QuotaResult> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const { count } = await admin
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("generation_type", opts.generationType)
    .gte("created_at", since);

  const used = count ?? 0;
  const resetsAtISO = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  return { ok: used < opts.dailyCap, used, cap: opts.dailyCap, resetsAtISO };
}

export function quotaExceededResponse(result: QuotaResult, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: "Daily AI quota exceeded",
      used: result.used,
      cap: result.cap,
      resets_at: result.resetsAtISO,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": "3600",
      },
    }
  );
}
