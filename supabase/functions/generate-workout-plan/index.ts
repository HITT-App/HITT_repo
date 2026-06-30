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

interface ExerciseItem {
  title: string;
  description: string | null;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  body_area: string | null;
  order_index: number;
}

interface AIPlanItem {
  day_index: number;
  sequence_in_day: number;
  workout_title: string;
  exercises: ExerciseItem[];
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

    const systemPrompt = [
      "You are a certified fitness coach building a personalised HIIT workout plan.",
      "Generate complete workout sessions with specific exercises — do NOT reference any external workout library.",
      "Each exercise must have a title, description (1 short sentence on how to do it), and either sets+reps OR duration_seconds (not both).",
      "Adapt difficulty to the user's fitness level: beginners get simpler movements, fewer sets, longer rest.",
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
    });

    await admin.from("ai_generation_log").insert({
      user_id: user.id,
      generation_type: "workout_plan",
      model: "gemini-2.5-flash",
      prompt: { system: systemPrompt, user: userPrompt },
    });

    const aiResponse = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 32000,
      // 4 weeks of structured workouts is a lot of JSON; the default 55s
      // gateway timeout regularly clipped responses mid-stream and surfaced
      // as a raw AbortError in the UI. 110s comfortably fits Gemini 2.5 Flash
      // on this workload while staying inside the Supabase edge function wall.
      timeout_ms: 110_000,
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

    const validation = validatePlan(parsed, { days, sessionsPerWeek });
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
      workout_source: "ai_generated",
      workout_title: item.workout_title,
      exercises_snapshot: item.exercises.map((ex, idx) => ({
        title: ex.title,
        description: ex.description ?? null,
        sets: ex.sets ?? null,
        reps: ex.reps ?? null,
        duration_seconds: ex.duration_seconds ?? null,
        body_area: ex.body_area ?? null,
        order_index: idx,
        thumbnail_url: null,
        video_url: null,
      })),
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
      items: itemsToInsert.map(item => ({
        day_index: item.day_index,
        sequence_in_day: item.sequence_in_day,
        workout_source: item.workout_source,
        workout_title: item.workout_title,
        exercises_snapshot: item.exercises_snapshot,
        scheduled_date: item.scheduled_date,
      })),
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
}): string {
  const totalSessions = input.sessionsPerWeek * Math.ceil(input.days / 7);

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
    `Create ${totalSessions} workout sessions spread across ${input.days} days (day_index 0 = today). Omit rest days — just don't include them. Avoid back-to-back sessions targeting the same muscle group.`,
    "",
    "For each session, create 5–8 exercises tailored to the user's goal and fitness level.",
    "Use sets+reps for strength exercises (e.g. squats, push-ups) and duration_seconds for cardio/timed exercises (e.g. plank, mountain climbers). Never set both.",
    "",
    "Return ONLY a JSON object with this exact schema:",
    JSON.stringify({
      items: [
        {
          day_index: 0,
          sequence_in_day: 0,
          workout_title: "example title",
          exercises: [
            {
              title: "exercise name",
              description: "one sentence how-to",
              sets: 3,
              reps: 12,
              duration_seconds: null,
              body_area: "legs",
              order_index: 0,
            },
            {
              title: "plank",
              description: "hold a straight body position on forearms",
              sets: null,
              reps: null,
              duration_seconds: 30,
              body_area: "core",
              order_index: 1,
            },
          ],
        },
      ],
    }),
  ]
    .filter(Boolean)
    .join("\n");
}

function parseLLMJSON(text: string): { items?: AIPlanItem[] } | null {
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
  parsed: { items?: AIPlanItem[] } | null,
  constraints: { days: number; sessionsPerWeek: number }
): { ok: true; items: AIPlanItem[] } | { ok: false; reason: string } {
  if (!parsed || !Array.isArray(parsed.items)) {
    return { ok: false, reason: "missing items array" };
  }

  const cleaned: AIPlanItem[] = [];
  for (const raw of parsed.items) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, reason: "item is not an object" };
    }
    const { day_index, sequence_in_day, workout_title, exercises } = raw as AIPlanItem;
    if (typeof day_index !== "number" || day_index < 0 || day_index >= constraints.days) {
      return { ok: false, reason: `invalid day_index: ${day_index}` };
    }
    if (typeof workout_title !== "string" || !workout_title.trim()) {
      return { ok: false, reason: `missing workout_title on day_index ${day_index}` };
    }
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return { ok: false, reason: `no exercises on day_index ${day_index}` };
    }
    cleaned.push({
      day_index: Math.floor(day_index),
      sequence_in_day: typeof sequence_in_day === "number" ? Math.floor(sequence_in_day) : 0,
      workout_title: workout_title.trim(),
      exercises: exercises.map((ex, idx) => ({
        title: String(ex.title ?? "Exercise"),
        description: ex.description ? String(ex.description) : null,
        sets: typeof ex.sets === "number" ? ex.sets : null,
        reps: typeof ex.reps === "number" ? ex.reps : null,
        duration_seconds: typeof ex.duration_seconds === "number" ? ex.duration_seconds : null,
        body_area: ex.body_area ? String(ex.body_area) : null,
        order_index: idx,
      })),
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
