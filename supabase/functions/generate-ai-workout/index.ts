import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";
import { gatherWorkoutContext } from "../_shared/ai-workout-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert fitness coach. Generate a single workout tailored to the user's context.

Output must be valid JSON matching EXACTLY this shape:
{
  "workout": {
    "title": "<short, descriptive — 2-5 words>",
    "description": "<1-2 sentences explaining the focus and benefit>",
    "estimated_duration_minutes": <integer>,
    "estimated_calories": <integer>,
    "exercises": [
      {
        "title": "<exercise name>",
        "description": "<form cue or instruction, max 1 sentence, or null>",
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
}

Rules:
- Match workout intensity to the user's fitness level and recent activity
- Each exercise must have EITHER sets+reps OR duration_seconds — not both, not neither
- order_index starts at 1 and increments by 1
- Aim for 4–8 exercises in a typical workout
- Estimated calories should be realistic for the duration and intensity
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
    dailyCap: DEFAULT_QUOTAS.generate_ai_workout ?? 20,
    generationType: "generate_ai_workout",
  });
  if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);

  let intent = "";
  let customMemory = "";
  let customResponseStyle = "";
  try {
    const body = await req.json();
    intent = body.intent ?? "";
    customMemory = body.customMemory ?? "";
    customResponseStyle = body.customResponseStyle ?? "";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!intent) {
    return new Response(JSON.stringify({ error: "intent is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Pre-log for traceability — ensures failures are captured even on AbortError
  await admin.from("ai_generation_log").insert({
    user_id: userId,
    generation_type: "generate_ai_workout",
    model: "gemini-2.5-flash",
    prompt: { intent },
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
    "\nGenerate a workout matching the request and context. Output ONLY the JSON.",
  ].filter(Boolean).join("\n");

  const aiResponse = await aiChatCompletion({
    model: "gemini-2.5-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 8000,
  });

  const latencyMs = Date.now() - started;
  const rawText = await aiResponse.text();

  if (!aiResponse.ok) {
    await admin.from("ai_generation_log").insert({
      user_id: userId,
      generation_type: "generate_ai_workout",
      model: "gemini-2.5-flash",
      prompt: { intent },
      error: `Gateway ${aiResponse.status}: ${rawText.slice(0, 400)}`,
      latency_ms: latencyMs,
    });
    return new Response(JSON.stringify({ error: "AI service error — try again" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const workout = parseWorkoutJSON(rawText);

  if (!workout) {
    await admin.from("ai_generation_log").insert({
      user_id: userId,
      generation_type: "generate_ai_workout",
      model: "gemini-2.5-flash",
      prompt: { intent },
      error: "Could not parse JSON from AI response",
      latency_ms: latencyMs,
    });
    return new Response(JSON.stringify({ error: "AI returned malformed response — try again" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const validationError = validateWorkout(workout);
  if (validationError) {
    await admin.from("ai_generation_log").insert({
      user_id: userId,
      generation_type: "generate_ai_workout",
      model: "gemini-2.5-flash",
      prompt: { intent },
      error: `Validation failed: ${validationError}`,
      latency_ms: latencyMs,
    });
    return new Response(JSON.stringify({ error: "AI produced invalid workout — try again" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Force media fields to null — AI workouts never have media
  for (const ex of workout.exercises) {
    ex.thumbnail_url = null;
    ex.video_url = null;
  }

  await admin.from("ai_generation_log").insert({
    user_id: userId,
    generation_type: "generate_ai_workout",
    model: "gemini-2.5-flash",
    prompt: { intent },
    response: { workout_title: workout.title, exercise_count: workout.exercises.length },
    latency_ms: latencyMs,
  });

  return new Response(JSON.stringify({ workout }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function parseWorkoutJSON(text: string): WorkoutShape | null {
  let raw = text.trim();

  // Unwrap OpenAI-compatible envelope: choices[0].message.content
  try {
    const outer = JSON.parse(raw);
    const content = outer?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      raw = content.trim();
    } else if (outer?.workout) {
      return outer.workout as WorkoutShape;
    } else {
      return (outer?.workout ?? null) as WorkoutShape | null;
    }
  } catch {
    // Not a valid JSON envelope — treat as raw text
  }

  // Strip Gemini extended-thinking tags (<thinking>...</thinking>)
  raw = raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();

  // Strip markdown fences
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  // Fallback: extract outermost {...} block in case of leading/trailing prose
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first !== -1 && last > first) raw = raw.slice(first, last + 1);

  try {
    const parsed = JSON.parse(raw);
    return (parsed?.workout ?? null) as WorkoutShape | null;
  } catch {
    return null;
  }
}

type WorkoutShape = {
  title: string;
  description: string;
  estimated_duration_minutes: number;
  estimated_calories: number;
  exercises: ExerciseShape[];
};

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

function validateWorkout(w: WorkoutShape): string | null {
  if (!w.title || typeof w.title !== "string") return "missing title";
  if (!Array.isArray(w.exercises) || w.exercises.length === 0) return "no exercises";
  if (typeof w.estimated_duration_minutes !== "number") return "missing estimated_duration_minutes";
  if (typeof w.estimated_calories !== "number") return "missing estimated_calories";

  for (let i = 0; i < w.exercises.length; i++) {
    const ex = w.exercises[i];
    if (!ex.title || typeof ex.title !== "string") return `exercise ${i}: missing title`;
    if (typeof ex.order_index !== "number") return `exercise ${i}: missing order_index`;
    const hasSetsReps = typeof ex.sets === "number" && typeof ex.reps === "number";
    const hasDuration = typeof ex.duration_seconds === "number";
    if (!hasSetsReps && !hasDuration) return `exercise ${i} (${ex.title}): needs sets+reps or duration_seconds`;
  }

  return null;
}
