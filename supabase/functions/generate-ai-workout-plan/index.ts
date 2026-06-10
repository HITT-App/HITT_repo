import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";
import { gatherWorkoutContext } from "../_shared/ai-workout-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert fitness coach. Generate a personalised multi-session workout plan.

Output ONLY valid JSON matching EXACTLY this shape — no commentary, no markdown fences:
{
  "plan": {
    "title": "<plan name, 3–6 words>",
    "goal": "<one sentence: what this plan achieves>",
    "start_date": "<YYYY-MM-DD from the request>",
    "workouts": [
      {
        "scheduled_date": "<YYYY-MM-DD>",
        "title": "<workout title, 2–5 words>",
        "description": "<1–2 sentences>",
        "why": "<one sentence, max 12 words, explaining why this session fits here — e.g. 'Kick off the week with a full-body metabolic burst.' or 'Easy session after yesterday's hard leg day.'>",
        "intensity": "<low | moderate | high>",
        "estimated_duration_minutes": <integer>,
        "estimated_calories": <integer>,
        "exercises": [
          {
            "title": "<exercise name>",
            "description": "<form cue, 1 sentence max, or null>",
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
- Schedule workouts ONLY on the user's preferred days of the week (supplied in the request)
- Spread sessions across the full plan period — not all in week 1
- Avoid training the same muscle group on back-to-back days
- Match difficulty to the user's fitness level — beginners get simpler progressions, athletes get higher volume
- Respect available equipment — bodyweight only if no equipment listed
- Use intensity='low' for recovery/mobility, 'moderate' for standard sessions, 'high' for HIIT/heavy lifting
- Each exercise must have EITHER sets+reps OR duration_seconds — not both, not neither
- 4–8 exercises per workout
- order_index starts at 1 per workout
- Always set thumbnail_url and video_url to null
- 'why' must be one sentence, max 12 words, specific to position in the plan (not generic)`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    return await handleRequest(req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: `Unhandled error: ${msg}` }, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: userData, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !userData?.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  const quota = await checkAIQuota(admin, userId, {
    dailyCap: DEFAULT_QUOTAS.generate_ai_workout_plan ?? 10,
    generationType: "generate_ai_workout_plan",
  });
  if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Wizard-supplied inputs (take precedence over DB prefs)
  const goal = (body.goal as string) ?? "";
  const fitnessLevel = (body.fitnessLevel as string) ?? "";
  const daysPerWeek = typeof body.daysPerWeek === "number" ? body.daysPerWeek : 3;
  const sessionMinutes = typeof body.sessionMinutes === "number" ? body.sessionMinutes : 30;
  const preferredDays = Array.isArray(body.preferredDays) ? (body.preferredDays as number[]) : [];
  const equipment = Array.isArray(body.equipment) ? (body.equipment as string[]) : [];
  const bodyAreas = Array.isArray(body.bodyAreas) ? (body.bodyAreas as string[]) : [];
  const timeline = (body.timeline as string) ?? "4 weeks";
  const eventDate = (body.eventDate as string) ?? null;
  const bodyScanSummary = (body.bodyScanSummary as string) ?? "";
  const startDate = (body.startDate as string) ?? new Date().toISOString().split("T")[0];
  // Legacy Jarvis flow
  const intent = (body.intent as string) ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return json({ error: "startDate must be YYYY-MM-DD" }, 400);
  }

  // Determine total plan days from timeline
  const totalDays = calcTotalDays(timeline, eventDate, startDate);
  const totalWorkouts = daysPerWeek * Math.ceil(totalDays / 7);

  // Day-of-week labels (0=Sun … 6=Sat)
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const preferredDayNames = preferredDays.length
    ? preferredDays.map((d) => DAY_NAMES[d] ?? d).join(", ")
    : "any days";

  const started = Date.now();

  // Gather DB context (health metrics, recent activity, saved preferences)
  const context = await gatherWorkoutContext(supabase, userId, {});

  const userPrompt = buildUserPrompt({
    intent,
    goal: goal || context.goalsSummary,
    fitnessLevel,
    daysPerWeek,
    sessionMinutes,
    preferredDayNames,
    equipment,
    bodyAreas,
    totalDays,
    totalWorkouts,
    startDate,
    bodyScanSummary,
    healthMetricsSummary: context.healthMetricsSummary,
    recentActivitySummary: context.recentActivitySummary,
    customMemory: context.customMemory,
  });

  await admin.from("ai_generation_log").insert({
    user_id: userId,
    generation_type: "generate_ai_workout_plan",
    model: "gemini-2.5-flash",
    prompt: { goal, daysPerWeek, sessionMinutes, timeline, totalWorkouts, startDate },
  });

  const aiResponse = await aiChatCompletion({
    model: "gemini-2.5-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 16000,
    timeout_ms: 110000,
  });

  const latencyMs = Date.now() - started;
  const rawText = await aiResponse.text();

  if (!aiResponse.ok) {
    const detail = `Gateway ${aiResponse.status}: ${rawText.slice(0, 400)}`;
    await admin.from("ai_generation_log").insert({
      user_id: userId,
      generation_type: "generate_ai_workout_plan",
      model: "gemini-2.5-flash",
      error: detail,
      latency_ms: latencyMs,
    });
    return json({ error: `AI service error (${aiResponse.status}) — try again`, detail }, 502);
  }

  const plan = parsePlanJSON(rawText);

  if (!plan) {
    const detail = rawText.slice(0, 300);
    await admin.from("ai_generation_log").insert({
      user_id: userId,
      generation_type: "generate_ai_workout_plan",
      model: "gemini-2.5-flash",
      error: "Could not parse JSON from AI response",
      latency_ms: latencyMs,
      response: { raw: detail },
    });
    return json({ error: "AI returned malformed JSON — try again", detail }, 502);
  }

  coercePlanTypes(plan);

  const validationError = validatePlan(plan, totalWorkouts);
  if (validationError) {
    await admin.from("ai_generation_log").insert({
      user_id: userId,
      generation_type: "generate_ai_workout_plan",
      model: "gemini-2.5-flash",
      error: `Validation: ${validationError}`,
      latency_ms: latencyMs,
    });
    return json({ error: `Plan validation failed: ${validationError}`, detail: validationError }, 502);
  }

  // Sanitise media fields
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
    response: { plan_title: plan.title, workout_count: plan.workouts.length, raw_prefix: rawText.slice(0, 200) },
    latency_ms: latencyMs,
  });

  return json({ plan });
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function calcTotalDays(timeline: string, eventDate: string | null, startDate: string): number {
  if (eventDate) {
    const days = Math.ceil(
      (new Date(eventDate).getTime() - new Date(startDate).getTime()) / 86400000
    );
    return Math.max(7, Math.min(days, 168));
  }
  if (timeline.includes("8 weeks")) return 56;
  if (timeline.includes("3 months")) return 84;
  if (timeline.includes("6 months")) return 168;
  return 28; // '4 weeks' or 'ongoing'
}

function buildUserPrompt(p: {
  intent: string;
  goal: string;
  fitnessLevel: string;
  daysPerWeek: number;
  sessionMinutes: number;
  preferredDayNames: string;
  equipment: string[];
  bodyAreas: string[];
  totalDays: number;
  totalWorkouts: number;
  startDate: string;
  bodyScanSummary: string;
  healthMetricsSummary: string;
  recentActivitySummary: string;
  customMemory: string;
}): string {
  const lines: string[] = [];
  if (p.intent) lines.push(`User request: ${p.intent}`);
  lines.push(`Goal: ${p.goal || "general fitness"}`);
  if (p.fitnessLevel) lines.push(`Fitness level: ${p.fitnessLevel}`);
  lines.push(`Training days per week: ${p.daysPerWeek} (preferred days: ${p.preferredDayNames})`);
  lines.push(`Session length: ~${p.sessionMinutes} minutes`);
  if (p.equipment.length) lines.push(`Available equipment: ${p.equipment.join(", ")}`);
  else lines.push("Equipment: bodyweight only");
  if (p.bodyAreas.length) lines.push(`Priority body areas: ${p.bodyAreas.join(", ")}`);
  if (p.bodyScanSummary) lines.push(`Body scan / physique: ${p.bodyScanSummary}`);
  lines.push(`Plan start: ${p.startDate}`);
  lines.push(`Plan length: ${p.totalDays} days (${p.totalWorkouts} total sessions)`);
  if (p.healthMetricsSummary && p.healthMetricsSummary !== "No health metrics on record.") {
    lines.push(p.healthMetricsSummary);
  }
  if (p.recentActivitySummary && p.recentActivitySummary !== "No recent activity logged.") {
    lines.push(p.recentActivitySummary);
  }
  if (p.customMemory) lines.push(`Personal context: ${p.customMemory}`);
  lines.push("\nGenerate the plan. Output ONLY the JSON.");
  return lines.join("\n");
}

function parsePlanJSON(text: string): PlanShape | null {
  function tryJ(s: string): any {
    const c = s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/m, "").trim();
    try { return JSON.parse(c); } catch { return null; }
  }

  function extractPlan(obj: any): PlanShape | null {
    if (!obj) return null;
    if (obj?.plan?.workouts) return obj.plan as PlanShape;
    if (Array.isArray(obj?.workouts)) return obj as PlanShape;
    return null;
  }

  // 1. Parse raw text directly
  const outer = tryJ(text);
  if (outer) {
    // OpenAI wrapper: choices[0].message.content
    const content = outer?.choices?.[0]?.message?.content;
    const inner = typeof content === "string" ? (tryJ(content) ?? outer) : outer;
    const plan = extractPlan(inner);
    if (plan) return plan;
  }

  // 2. Regex fallback: pull the outermost JSON object from the text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    const extracted = tryJ(match[0]);
    const plan = extractPlan(extracted);
    if (plan) return plan;
  }

  return null;
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
  why: string;
  intensity: "low" | "moderate" | "high";
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

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return isNaN(n) ? null : n;
}

function coercePlanTypes(p: PlanShape): void {
  for (const w of p.workouts) {
    w.estimated_duration_minutes = Number(w.estimated_duration_minutes) || 30;
    w.estimated_calories = Number(w.estimated_calories) || 0;
    for (const ex of w.exercises ?? []) {
      ex.sets = toIntOrNull(ex.sets);
      ex.reps = toIntOrNull(ex.reps);
      ex.duration_seconds = toIntOrNull(ex.duration_seconds);
      if (typeof ex.order_index !== "number") ex.order_index = Number(ex.order_index) || 0;
    }
  }
}

function validatePlan(p: PlanShape, expectedWorkouts: number): string | null {
  if (!p.title || typeof p.title !== "string") return "missing plan title";
  if (!Array.isArray(p.workouts) || p.workouts.length === 0) return "no workouts";
  if (p.workouts.length < Math.max(1, expectedWorkouts - 2)) {
    return `too few workouts: got ${p.workouts.length}, expected ~${expectedWorkouts}`;
  }

  for (let i = 0; i < p.workouts.length; i++) {
    const w = p.workouts[i];
    if (!w.title) return `workout ${i}: missing title`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w.scheduled_date ?? "")) return `workout ${i}: invalid scheduled_date`;
    if (!w.why || typeof w.why !== "string") return `workout ${i}: missing why`;
    if (!["low", "moderate", "high"].includes(w.intensity)) return `workout ${i}: invalid intensity '${w.intensity}'`;
    if (!Array.isArray(w.exercises) || w.exercises.length === 0) return `workout ${i}: no exercises`;
    for (let j = 0; j < w.exercises.length; j++) {
      const ex = w.exercises[j];
      if (!ex.title) return `workout ${i} ex ${j}: missing title`;
      if (typeof ex.order_index !== "number") return `workout ${i} ex ${j}: missing order_index`;
      const hasSetsReps = typeof ex.sets === "number" && typeof ex.reps === "number";
      const hasDuration = typeof ex.duration_seconds === "number";
      if (!hasSetsReps && !hasDuration) return `workout ${i} ex ${j} (${ex.title}): needs sets+reps or duration_seconds`;
    }
  }
  return null;
}
