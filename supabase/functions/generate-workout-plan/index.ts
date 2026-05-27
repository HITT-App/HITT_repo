import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  goal?: string;
  days?: number;
  sessions_per_week?: number;
  duration_minutes?: number;
  title?: string;
}

interface Workout {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  duration_minutes: number;
  body_areas: string[];
  equipment: string[];
}

interface PlanItem {
  day_index: number;
  workout_id: string;
  sequence_in_day: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const quota = await checkAIQuota(admin, user.id, {
      dailyCap: DEFAULT_QUOTAS.workout_plan,
      generationType: "workout_plan",
    });
    if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);

    const body = (await req.json().catch(() => ({}))) as GenerateRequest;

    // Merge request overrides with the user's saved preferences so the
    // request body is always optional — an "I just want a plan" button is
    // a valid entry point from anywhere in the app.
    const { data: prefs } = await admin
      .from("workout_preferences")
      .select("workout_goal, fitness_level, days_per_week, session_duration, target_body_areas, available_equipment")
      .eq("user_id", user.id)
      .maybeSingle();

    const goal = body.goal ?? prefs?.workout_goal ?? "general fitness";
    const fitnessLevel = prefs?.fitness_level ?? "beginner";
    const sessionsPerWeek = body.sessions_per_week ?? prefs?.days_per_week ?? 3;
    const targetDuration = body.duration_minutes ?? prefs?.session_duration ?? 30;
    const days = clamp(body.days ?? 7, 1, 28);
    const title = body.title ?? `${capitalise(goal)} Plan`;

    const { data: workouts, error: workoutsError } = await admin
      .from("workouts")
      .select("id, title, category, difficulty, duration_minutes, body_areas, equipment")
      .order("category")
      .returns<Workout[]>();
    if (workoutsError) throw workoutsError;
    if (!workouts || workouts.length === 0) {
      return json({ error: "Workout catalogue is empty — seed data is missing." }, 500);
    }

    const systemPrompt = [
      "You are a certified fitness coach building a personalised workout plan.",
      "You MUST only reference workouts from the catalogue provided.",
      "You MUST respect the user's fitness level — beginners cannot be given advanced workouts.",
      "You MUST return valid JSON matching the schema exactly. No prose, no markdown fences.",
    ].join(" ");

    const userPrompt = buildUserPrompt({
      goal,
      fitnessLevel,
      sessionsPerWeek,
      targetDuration,
      days,
      targetBodyAreas: prefs?.target_body_areas ?? [],
      availableEquipment: prefs?.available_equipment ?? [],
      workouts,
    });

    const aiResponse = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 6000,
    });

    const aiResponseText = await aiResponse.text();

    if (!aiResponse.ok) {
      await logGeneration(admin, {
        userId: user.id,
        prompt: { system: systemPrompt, user: userPrompt },
        response: null,
        error: `LLM responded ${aiResponse.status}: ${aiResponseText}`,
        latencyMs: Date.now() - started,
        model: "gemini-2.5-flash",
      });
      return json({ error: "AI plan generator failed — please try again." }, 502);
    }

    const parsed = parseLLMJSON(aiResponseText);
    if (!parsed) {
      await logGeneration(admin, {
        userId: user.id,
        prompt: { system: systemPrompt, user: userPrompt },
        response: { raw: aiResponseText },
        error: "Could not parse JSON from LLM response",
        latencyMs: Date.now() - started,
        model: "gemini-2.5-flash",
      });
      return json({ error: "AI returned malformed response — please try again." }, 502);
    }

    const validation = validatePlan(parsed, workouts, { days, sessionsPerWeek });
    if (!validation.ok) {
      await logGeneration(admin, {
        userId: user.id,
        prompt: { system: systemPrompt, user: userPrompt },
        response: parsed,
        error: `Validation failed: ${validation.reason}`,
        latencyMs: Date.now() - started,
        model: "gemini-2.5-flash",
      });
      return json({ error: `Plan validation failed: ${validation.reason}` }, 502);
    }

    // Log first so we can attach the plan row to it
    const { data: logRow } = await admin
      .from("ai_generation_log")
      .insert({
        user_id: user.id,
        generation_type: "workout_plan",
        model: "gemini-2.5-flash",
        prompt: { system: systemPrompt, user: userPrompt },
        response: parsed,
        latency_ms: Date.now() - started,
      })
      .select("id")
      .maybeSingle();

    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const endDate = new Date(today.getTime() + (days - 1) * 86400000)
      .toISOString()
      .split("T")[0];

    const { data: planRow, error: planError } = await admin
      .from("user_workout_plans")
      .insert({
        user_id: user.id,
        title,
        goal,
        start_date: startDate,
        end_date: endDate,
        sessions_per_week: sessionsPerWeek,
        target_duration_minutes: targetDuration,
        generation_log_id: logRow?.id ?? null,
      })
      .select("id")
      .maybeSingle();

    if (planError || !planRow) {
      console.error("Failed to insert plan row", planError);
      return json({ error: "Could not save generated plan" }, 500);
    }

    const itemsToInsert = validation.items.map((item) => ({
      plan_id: planRow.id,
      user_id: user.id,
      workout_id: item.workout_id,
      day_index: item.day_index,
      sequence_in_day: item.sequence_in_day,
      scheduled_date: new Date(today.getTime() + item.day_index * 86400000)
        .toISOString()
        .split("T")[0],
    }));

    const { error: itemsError } = await admin.from("user_workout_plan_items").insert(itemsToInsert);
    if (itemsError) {
      console.error("Failed to insert plan items", itemsError);
      await admin.from("user_workout_plans").delete().eq("id", planRow.id);
      return json({ error: "Could not save plan items" }, 500);
    }

    return json({
      plan_id: planRow.id,
      title,
      start_date: startDate,
      end_date: endDate,
      items: itemsToInsert,
    });
  } catch (err) {
    console.error("generate-workout-plan error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function capitalise(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function buildUserPrompt(input: {
  goal: string;
  fitnessLevel: string;
  sessionsPerWeek: number;
  targetDuration: number;
  days: number;
  targetBodyAreas: string[];
  availableEquipment: string[];
  workouts: Workout[];
}): string {
  const catalogue = input.workouts
    .map(
      (w) =>
        `- id=${w.id} | ${w.title} | category=${w.category} | difficulty=${w.difficulty} | duration=${w.duration_minutes}min | body_areas=[${(w.body_areas ?? []).join(",")}] | equipment=[${(w.equipment ?? []).join(",")}]`
    )
    .join("\n");

  return [
    `Build a ${input.days}-day workout plan for this user:`,
    `- Goal: ${input.goal}`,
    `- Fitness level: ${input.fitnessLevel}`,
    `- Sessions per week: ${input.sessionsPerWeek}`,
    `- Target session duration: ~${input.targetDuration} minutes`,
    input.targetBodyAreas.length
      ? `- Prioritised body areas: ${input.targetBodyAreas.join(", ")}`
      : null,
    input.availableEquipment.length
      ? `- Available equipment: ${input.availableEquipment.join(", ")}`
      : `- Equipment: bodyweight only`,
    "",
    "Here is the full workout catalogue. You MUST only use workout IDs from this list:",
    catalogue,
    "",
    `Distribute ${input.sessionsPerWeek * Math.ceil(input.days / 7)} workouts across ${input.days} days (day_index 0 = today). Include rest days by simply omitting that day. Avoid back-to-back days targeting the same muscle group. Mix categories.`,
    "",
    'Return ONLY a JSON object matching this schema:',
    '{ "items": [ { "day_index": <int 0 .. days-1>, "workout_id": "<uuid from catalogue>", "sequence_in_day": <int starting at 0> } ] }',
  ]
    .filter(Boolean)
    .join("\n");
}

function parseLLMJSON(text: string): { items?: PlanItem[] } | null {
  // Most OpenAI-compatible endpoints honour response_format=json_object, but
  // some still wrap it in a markdown fence. Strip fences defensively.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    const outer = JSON.parse(cleaned);
    const content = outer?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
    }
    return outer;
  } catch {
    return null;
  }
}

function validatePlan(
  parsed: { items?: PlanItem[] } | null,
  workouts: Workout[],
  constraints: { days: number; sessionsPerWeek: number }
): { ok: true; items: PlanItem[] } | { ok: false; reason: string } {
  if (!parsed || !Array.isArray(parsed.items)) {
    return { ok: false, reason: "missing items array" };
  }

  const workoutIds = new Set(workouts.map((w) => w.id));

  const cleaned: PlanItem[] = [];
  for (const raw of parsed.items) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, reason: "item is not an object" };
    }
    const { day_index, workout_id, sequence_in_day } = raw as PlanItem;
    if (typeof day_index !== "number" || day_index < 0 || day_index >= constraints.days) {
      return { ok: false, reason: `invalid day_index: ${day_index}` };
    }
    if (typeof workout_id !== "string" || !workoutIds.has(workout_id)) {
      return { ok: false, reason: `unknown workout_id: ${workout_id}` };
    }
    cleaned.push({
      day_index: Math.floor(day_index),
      workout_id,
      sequence_in_day: typeof sequence_in_day === "number" ? Math.floor(sequence_in_day) : 0,
    });
  }

  if (cleaned.length === 0) {
    return { ok: false, reason: "plan has no items" };
  }

  const expected = constraints.sessionsPerWeek * Math.ceil(constraints.days / 7);
  if (cleaned.length > expected * 2) {
    return { ok: false, reason: `too many items: ${cleaned.length} (expected ~${expected})` };
  }

  return { ok: true, items: cleaned };
}

async function logGeneration(
  admin: SupabaseClient,
  row: {
    userId: string;
    prompt: unknown;
    response: unknown;
    error?: string | null;
    latencyMs: number;
    model: string;
  }
): Promise<void> {
  await admin.from("ai_generation_log").insert({
    user_id: row.userId,
    generation_type: "workout_plan",
    model: row.model,
    prompt: row.prompt,
    response: row.response,
    error: row.error ?? null,
    latency_ms: row.latencyMs,
  });
}
