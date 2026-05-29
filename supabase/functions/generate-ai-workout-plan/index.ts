import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";
import { gatherWorkoutContext } from "../_shared/ai-workout-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert fitness coach. Generate a multi-day workout plan tailored to the user's context.

Output must be valid JSON matching EXACTLY this shape:
{
  "plan": {
    "title": "<plan name — 3-6 words>",
    "goal": "<1 sentence describing what this plan achieves>",
    "start_date": "<YYYY-MM-DD — use the startDate from the request>",
    "workouts": [
      {
        "scheduled_date": "<YYYY-MM-DD>",
        "title": "<workout title — 2-5 words>",
        "description": "<1-2 sentences>",
        "estimated_duration_minutes": <integer>,
        "estimated_calories": <integer>,
        "exercises": [
          {
            "title": "<exercise name>",
            "description": "<form cue, max 1 sentence, or null>",
            "duration_seconds": <integer or null>,
            "sets": <integer or null>,
            "reps": <integer or null>,
            "order_index": <integer, 1-based>,
            "body_area": "<lower_body | upper_body | core | full_body | cardio | flexibility>",
            "thumbnail_url": null,
            "video_url": null
          }
        ]
      }
    ]
  }
}

Rules:
- Generate EXACTLY the requested number of workouts (daysPerWeek count)
- Distribute focus across days (e.g. for 4 days: legs, push, pull, full body — adapt to goal)
- Avoid training the same muscle group on consecutive days
- Schedule workouts across the week starting from startDate, skipping rest days sensibly
- Each exercise must have EITHER sets+reps OR duration_seconds — not both, not neither
- order_index starts at 1 per workout
- Aim for 4–8 exercises per workout
- Always set thumbnail_url and video_url to null
- Output ONLY the JSON — no commentary, no markdown fences`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: userData, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userId = userData.user.id;

  const quota = await checkAIQuota(admin, userId, {
    dailyCap: DEFAULT_QUOTAS.generate_ai_workout_plan ?? 10,
    generationType: "generate_ai_workout_plan",
  });
  if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);

  let intent = "";
  let daysPerWeek = 3;
  let startDate = "";
  let customMemory = "";
  let customResponseStyle = "";
  try {
    const body = await req.json();
    intent = body.intent ?? "";
    daysPerWeek = body.daysPerWeek ?? 3;
    startDate = body.startDate ?? "";
    customMemory = body.customMemory ?? "";
    customResponseStyle = body.customResponseStyle ?? "";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!intent) {
    return new Response(JSON.stringify({ error: "intent is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return new Response(JSON.stringify({ error: "startDate is required (YYYY-MM-DD)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (typeof daysPerWeek !== "number" || daysPerWeek < 1 || daysPerWeek > 7) {
    return new Response(JSON.stringify({ error: "daysPerWeek must be 1–7" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  await admin.from("ai_generation_log").insert({
    user_id: userId,
    generation_type: "generate_ai_workout_plan",
    model: "gemini-2.5-flash",
    prompt: { intent, daysPerWeek, startDate },
  });

  const started = Date.now();

  const context = await gatherWorkoutContext(supabase, userId, { customMemory, customResponseStyle });

  const userPrompt = [
    context.healthMetricsSummary,
    context.goalsSummary,
    context.recentActivitySummary,
    context.customMemory ? `Personal context: ${context.customMemory}` : "",
    context.customResponseStyle ? `Response style: ${context.customResponseStyle}` : "",
    `\nUser request: ${intent}`,
    `Training days per week: ${daysPerWeek}`,
    `Start date: ${startDate}`,
    "\nGenerate the plan. Output ONLY the JSON.",
  ].filter(Boolean).join("\n");

  const aiResponse = await aiChatCompletion({
    model: "gemini-2.5-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 6000,
  });

  const latencyMs = Date.now() - started;
  const rawText = await aiResponse.text();

  if (!aiResponse.ok) {
    await admin.from("ai_generation_log").insert({
      user_id: userId,
      generation_type: "generate_ai_workout_plan",
      model: "gemini-2.5-flash",
      prompt: { intent, daysPerWeek, startDate },
      error: `Gateway ${aiResponse.status}: ${rawText.slice(0, 400)}`,
      latency_ms: latencyMs,
    });
    return new Response(JSON.stringify({ error: "AI service error — try again" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const plan = parsePlanJSON(rawText);

  if (!plan) {
    await admin.from("ai_generation_log").insert({
      user_id: userId,
      generation_type: "generate_ai_workout_plan",
      model: "gemini-2.5-flash",
      prompt: { intent, daysPerWeek, startDate },
      error: "Could not parse JSON from AI response",
      latency_ms: latencyMs,
    });
    return new Response(JSON.stringify({ error: "AI returned malformed response — try again" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const validationError = validatePlan(plan, daysPerWeek);
  if (validationError) {
    await admin.from("ai_generation_log").insert({
      user_id: userId,
      generation_type: "generate_ai_workout_plan",
      model: "gemini-2.5-flash",
      prompt: { intent, daysPerWeek, startDate },
      error: `Validation failed: ${validationError}`,
      latency_ms: latencyMs,
    });
    return new Response(JSON.stringify({ error: "AI produced invalid plan — try again" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Force media fields to null on all exercises
  for (const w of plan.workouts) {
    for (const ex of w.exercises) {
      ex.thumbnail_url = null;
      ex.video_url = null;
    }
  }

  await admin.from("ai_generation_log").insert({
    user_id: userId,
    generation_type: "generate_ai_workout_plan",
    model: "gemini-2.5-flash",
    prompt: { intent, daysPerWeek, startDate },
    response: { plan_title: plan.title, workout_count: plan.workouts.length },
    latency_ms: latencyMs,
  });

  return new Response(JSON.stringify({ plan }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function parsePlanJSON(text: string): PlanShape | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const outer = JSON.parse(cleaned);
    const content = outer?.choices?.[0]?.message?.content;
    const inner = typeof content === "string"
      ? JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""))
      : outer;
    return inner?.plan ?? null;
  } catch {
    return null;
  }
}

type ExerciseShape = {
  title: string;
  description: string | null;
  duration_seconds: number | null;
  sets: number | null;
  reps: number | null;
  order_index: number;
  body_area: string | null;
  thumbnail_url: null;
  video_url: null;
};

type WorkoutInPlan = {
  scheduled_date: string;
  title: string;
  description: string;
  estimated_duration_minutes: number;
  estimated_calories: number;
  exercises: ExerciseShape[];
};

type PlanShape = {
  title: string;
  goal: string;
  start_date: string;
  workouts: WorkoutInPlan[];
};

function validatePlan(p: PlanShape, expectedDays: number): string | null {
  if (!p.title || typeof p.title !== "string") return "missing plan title";
  if (!Array.isArray(p.workouts) || p.workouts.length === 0) return "no workouts";
  // Allow ±1 from expected — AI might round sensibly
  if (Math.abs(p.workouts.length - expectedDays) > 1) {
    return `expected ~${expectedDays} workouts, got ${p.workouts.length}`;
  }

  for (let i = 0; i < p.workouts.length; i++) {
    const w = p.workouts[i];
    if (!w.title) return `workout ${i}: missing title`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w.scheduled_date ?? "")) return `workout ${i}: invalid scheduled_date`;
    if (!Array.isArray(w.exercises) || w.exercises.length === 0) return `workout ${i}: no exercises`;
    for (let j = 0; j < w.exercises.length; j++) {
      const ex = w.exercises[j];
      if (!ex.title) return `workout ${i} exercise ${j}: missing title`;
      if (typeof ex.order_index !== "number") return `workout ${i} exercise ${j}: missing order_index`;
      const hasSetsReps = typeof ex.sets === "number" && typeof ex.reps === "number";
      const hasDuration = typeof ex.duration_seconds === "number";
      if (!hasSetsReps && !hasDuration) return `workout ${i} exercise ${j} (${ex.title}): needs sets+reps or duration_seconds`;
    }
  }

  return null;
}
