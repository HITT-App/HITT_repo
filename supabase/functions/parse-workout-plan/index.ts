import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonrepair } from "https://esm.sh/jsonrepair@3.7.0";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";

// Minimal CSV parser that handles quoted fields containing commas and newlines.
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { field += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      fields.push(field); field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

// Drop columns that contain long prose (step-by-step instructions etc.)
// — they cause malformed JSON and add no scheduling value.
function simplifyCSV(text: string): string {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length < 2) return text;

  const header = parseCSVLine(lines[0]);
  const sampleRows = lines.slice(1, Math.min(6, lines.length)).map(parseCSVLine);

  const proseHeader = /how|description|instruction|step|detail|note|tip|example/i;
  const colLengths = header.map((_, ci) =>
    sampleRows.reduce((sum, row) => sum + (row[ci]?.length ?? 0), 0) / sampleRows.length
  );

  const keepCols = header.map((h, ci) =>
    !proseHeader.test(h) && colLengths[ci] <= 100
  );

  if (keepCols.every(Boolean)) return text;

  return lines
    .map((line) => parseCSVLine(line).filter((_, ci) => keepCols[ci]).join(","))
    .join("\n");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const quota = await checkAIQuota(supabaseAdmin, userData.user.id, {
      dailyCap: DEFAULT_QUOTAS.parse_workout_plan,
      generationType: "parse_workout_plan",
    });
    if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);

    await supabaseAdmin.from("ai_generation_log").insert({
      user_id: userData.user.id,
      generation_type: "parse_workout_plan",
      model: "gemini-2.5-flash",
      prompt: { redacted: true },
    });

    const body = await req.json();
    const { content, contentType, userGoal, fitnessLevel, bodyScanSummary } = body;

    if (!content) {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContext = [
      userGoal ? `Goal: ${userGoal}` : null,
      fitnessLevel ? `Fitness level: ${fitnessLevel}` : null,
      bodyScanSummary ? `Body scan: ${bodyScanSummary}` : null,
    ].filter(Boolean).join("\n") || "No user profile data available.";

    const prompt = `You are an expert fitness coach reviewing a workout plan uploaded by a user.
Extract every session and exercise from the plan, then assess how well it aligns with the user's profile.

User profile:
${userContext}

Instructions:
- If the content is a scheduled plan: extract sessions exactly as written
- If the content is an exercise library (no schedule): group exercises into 3 balanced weekly sessions (Mon/Wed/Fri) across week 1, selecting the most relevant exercises for the user's goal
- Assign each session a day_of_week (0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat)
- Assign week_number starting at 1; if the plan is one repeating week, all sessions are week 1
- For exercises: use sets+reps for strength, duration_seconds for cardio/timed, or both if specified
- Estimate duration_minutes per session if not stated
- alignmentScore: 0-100 reflecting how well this matches the user's goal and body scan
- adjustmentNotes: 1-3 specific callouts only if genuinely needed (not generic advice); empty array if plan is solid
- If you suggest adjustments, include adjustedSessions with the modified version; omit adjustedSessions entirely if no changes are needed
- Speak directly to the user ("your plan", "you should") in assessment text

Return ONLY valid JSON in this exact shape:
{
  "planTitle": "string",
  "assessment": "string (2-3 sentences, direct second-person)",
  "alignmentScore": number,
  "adjustmentNotes": ["string"],
  "sessions": [
    {
      "title": "string",
      "category": "strength|cardio|hiit|recovery|flexibility|sports",
      "duration_minutes": number,
      "calories_burned": number,
      "day_of_week": number,
      "week_number": number,
      "exercises": [
        {
          "title": "string",
          "description": "string|null",
          "sets": number|null,
          "reps": number|null,
          "duration_seconds": number|null,
          "body_area": "string",
          "order_index": number,
          "thumbnail_url": null,
          "video_url": null
        }
      ]
    }
  ],
  "adjustedSessions": []
}`;

    const messageContent: any[] = [{ type: "text", text: prompt }];
    if (contentType === "image") {
      messageContent.push({
        type: "image_url",
        image_url: { url: content.startsWith("data:") ? content : `data:image/jpeg;base64,${content}` },
      });
    } else {
      // Strip long description columns from CSVs — they contain quotes/newlines that cause
      // the AI to produce malformed JSON, and they add no scheduling value
      const cleaned = simplifyCSV(content);
      const capped = cleaned.length > 12000 ? cleaned.slice(0, 12000) + "\n[truncated]" : cleaned;
      messageContent.push({ type: "text", text: `\n\nPlan content:\n${capped}` });
    }

    const response = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: messageContent }],
      // Bumped from 8000. A 4-week plan with 3 sessions per week × 5-8
      // exercises per session serialises to well over 12000 chars. The
      // 8000-token cap was silently truncating longer responses mid-JSON,
      // producing an unclosed object that the parser couldn't extract.
      // Gemini 2.5 Flash supports up to 65k output tokens.
      max_tokens: 16000,
      // Force valid JSON output at the API level. Gemini 2.5 supports the
      // OpenAI-compatible response_format flag via OpenRouter — the model
      // still returns text but the runtime rejects it and re-samples until
      // the string parses as JSON. Eliminates the "trailing prose" / "smart
      // quotes" / "unescaped newlines in string values" class of failure
      // that the local repair logic below only partially handled.
      response_format: { type: "json_object" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("No response from AI");

    // TEMP DIAGNOSTIC — log the full raw AI response so we can see what shape
    // the AI gateway is returning. Remove once the malformed-JSON class of
    // bug is nailed down (chasing casey/vanessa upload failures 2026-07-03).
    console.log("[parse-workout-plan] raw AI response length:", raw.length);
    console.log("[parse-workout-plan] raw AI response first 3000 chars:", raw.slice(0, 3000));
    if (raw.length > 3000) {
      console.log("[parse-workout-plan] raw AI response last 500 chars:", raw.slice(-500));
    }

    // With response_format=json_object above the model MUST emit strict
    // JSON — the raw content should parse directly. Belt-and-braces: fall
    // through the same tag-stripping + repair pipeline in case the flag is
    // silently dropped by an intermediate proxy.
    const detagged = raw
      .replace(/<antml_thinking>[\s\S]*?<\/antml_thinking>/gi, "")
      .replace(/^```(?:json)?\s*/im, "")
      .replace(/\s*```\s*$/im, "")
      .trim();

    // Multi-stage parse pipeline. Each stage handles a different failure
    // mode we've seen from Gemini 2.5 Flash on long workout-plan responses:
    //   1. Well-formed JSON (happy path) → direct parse
    //   2. JSON wrapped in prose → regex-extract the outermost { ... }
    //   3. LLM quirks (smart quotes, trailing commas, control chars) → repair + parse
    //   4. Truncated / malformed / unterminated JSON → jsonrepair library
    //      (auto-closes brackets, escapes stray quotes, terminates strings)
    let result: any = null;

    // Stage 1
    try { result = JSON.parse(detagged); } catch { /* fall through */ }

    // Stage 2
    let extracted = detagged;
    if (!result) {
      const jsonMatch = detagged.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = jsonMatch[0];
        try { result = JSON.parse(extracted); } catch { /* fall through */ }
      } else {
        // No closing brace at all — response was truncated mid-JSON.
        // Extract from the first '{' onwards so jsonrepair can auto-close it.
        const openIdx = detagged.indexOf("{");
        if (openIdx >= 0) extracted = detagged.slice(openIdx);
      }
    }

    // Stage 3
    if (!result) {
      const repaired = extracted
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")   // non-printable control chars
        .replace(/[‘’]/g, "'")                 // smart single quotes → straight
        .replace(/[“”]/g, '"')                 // smart double quotes → straight
        .replace(/,\s*([}\]])/g, "$1");                  // trailing commas before } or ]
      try { result = JSON.parse(repaired); } catch { /* fall through */ }
    }

    // Stage 4 — purpose-built LLM-JSON repair library. Handles unclosed
    // brackets from truncated responses, unescaped quotes in string values,
    // unterminated strings, missing commas, etc.
    if (!result) {
      try {
        result = JSON.parse(jsonrepair(extracted));
      } catch (parseErr) {
        const errPos = String(parseErr?.message ?? "").match(/position (\d+)/)?.[1];
        const window = errPos
          ? extracted.slice(Math.max(0, +errPos - 200), +errPos + 200)
          : extracted.slice(0, 500);
        console.error("parse-workout-plan: JSON repair failed after all fallbacks:", parseErr,
          "content length:", extracted.length,
          "raw length:", raw.length,
          "error window:", window);
        throw new Error("The AI returned malformed JSON. Try pasting the key sessions as plain text instead of uploading the file.");
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-workout-plan error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
