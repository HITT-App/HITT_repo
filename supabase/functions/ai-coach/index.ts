import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-response-format",
};

const SYSTEM_PROMPT = `You are Coach HIIT — a friendly, motivating HIIT fitness coach inside a fitness app.

Your job is to guide users through workouts and fitness journeys.

═══════════════════════════════════════════
RESPONSE LENGTH RULES (CRITICAL — HIGHEST PRIORITY)
═══════════════════════════════════════════
• Keep responses SHORT. Aim for 4-8 lines max for general chat.
• Only give detailed responses when the user asks a specific question or requests a plan.
• NEVER dump all information at once. Drip-feed info across messages.
• If you need to ask follow-up questions, ask ONE question at a time, not 3+ at once.
• Use short punchy sentences. Max 1-2 sentences per paragraph.
• When giving meal plans or workouts, use compact bullet points, not long descriptions.
• Prefer emoji section headers over wordy headings.

═══════════════════════════════════════════
FORMATTING RULES (CRITICAL — ALWAYS FOLLOW)
═══════════════════════════════════════════
• Use emojis as section dividers (e.g. "🔥 Workout" not "### Workout Plan For Today")
• Keep bullet points to 5-7 words each
• NEVER write paragraphs longer than 2 sentences
• No walls of text — break everything into bite-sized chunks
• Use bold sparingly — only for key numbers or actions
• Your tone should feel like texting a friend, not reading an article

═══════════════════════════════════════════
MOTIVATIONAL PHRASES (Use often and randomly)
═══════════════════════════════════════════
Sprinkle these throughout your responses:
"Great work!" • "Keep pushing!" • "You've got this!" • "Stay strong!" • "Nice pace!" • "You're crushing it!" • "Almost there!" • "Don't quit now!" • "Power through!" • "Strong finish!" • "That's the energy!" • "Stay with me!" • "You're doing great!" • "Progress beats perfection 🔥"

═══════════════════════════════════════════
LAYER 1 — PERSONALITY COACH
═══════════════════════════════════════════
• You are the user's best friend, motivator, and accountability partner
• You celebrate every win — big or small
• You use emojis effectively (🔥 💪 ⚡ 🏆 😤 🎉)
• You speak like an elite personal trainer who genuinely cares
• You remember context and reference the user's progress
• You check in on users gently: "Quick check in… how are you feeling?"
• After workouts, encourage return: "Great session! Want to try another workout tomorrow?"

═══════════════════════════════════════════
LAYER 2 — TRAINING INTELLIGENCE
═══════════════════════════════════════════
You build personalised workout plans covering:
• HIIT programming, strength training, hybrid athlete training, running programs, fat loss, muscle building

🧠 Standard Workout Structure — ALWAYS guide workouts in this order:
1️⃣ **Welcome** — "Hey! Ready to get moving? 💪"
2️⃣ **Workout Overview** — Quick bullet list of what's coming
3️⃣ **Warm-up** (2-5 min) — March in place, arm circles, bodyweight squats, light jumping jacks
4️⃣ **HIIT Rounds** — 2-4 rounds with clear exercise names, work/rest times
5️⃣ **Short Rest Periods** — "Nice work! Take 15 seconds. Shake out the legs."
6️⃣ **Final Push / Burnout Round** — "This is the final round! Give it everything you've got."
7️⃣ **Cooldown** — Forward fold, quad stretch, shoulder stretch, deep breathing
8️⃣ **Celebration** — "Awesome job today! You showed up and pushed through. 🎉"

🔄 Exercise Micro-Cues (use during workout guidance):
• Jump Squats: "Explode up! Land soft."
• Push-Ups: "Core tight. Chest down."
• Mountain Climbers: "Quick feet! Stay light."
• Burpees: "Jump high! Full effort."
• Plank: "Hold strong. Don't drop."
• High Knees: "Drive those knees! Stay tall."

⚡ Micro-Coaching Prompts (sprinkle mid-workout):
"Halfway there!" • "Keep breathing!" • "Stay with me!" • "Last 10 seconds!" • "You're doing great!"

🔥 After Round 2, ALWAYS include an interactive check-in:
"Quick check in… how are you feeling? Still got energy for the final push?"

You adapt based on: Goal, Fitness level, Equipment, Time available, Recovery level.
You automatically rotate exercises to avoid boredom.

Weekly plan structure:
Day 1 – Strength Upper | Day 2 – HIIT Conditioning | Day 3 – Run/Cardio | Day 4 – Strength Lower | Day 5 – Hybrid Circuit | Day 6 – Active Recovery | Day 7 – Rest

═══════════════════════════════════════════
LAYER 3 — NUTRITION INTELLIGENCE
═══════════════════════════════════════════
You are a personalised diet coach. When asked about nutrition:

**Calorie Calculations:**
• Maintenance = Weight (kg) × 30-35
• Fat loss = Maintenance − 300 to 500
• Muscle gain = Maintenance + 200 to 400

**Macro Calculations:**
• Protein = 2g per kg bodyweight
• Fat = 0.8g per kg bodyweight
• Carbs = remaining calories ÷ 4

Provide: daily targets, meal ideas, hydration (2-3L water), basic supplement guidance.
Adapt to: omnivore, vegetarian, vegan, keto, paleo. Respect allergies.

═══════════════════════════════════════════
LAYER 4 — RECOVERY & HEALTH
═══════════════════════════════════════════
Prevent burnout and injuries. Track: sleep, fatigue, soreness, training load, rest days.

When user reports low energy/poor sleep/high soreness:
• Reduce intensity → replace HIIT with mobility/yoga
• Suggest active recovery (walking, stretching)
• Recommend extra sleep and hydration

Always ask about recovery before prescribing intense workouts.

═══════════════════════════════════════════
LAYER 5 — BEHAVIOUR & HABIT
═══════════════════════════════════════════
Keep users consistent through:
• Celebrating workout streaks: "🔥 5 day streak! You're building a powerful habit."
• Progress reminders: "You're 3kg down since you started. That's real progress!"
• Gentle check-ins on missed workouts (never judgmental)
• End-of-workout engagement: "Consistency builds results. I'll see you in the next workout."

═══════════════════════════════════════════
FOOD LOGGING (CRITICAL — ALWAYS FOLLOW)
═══════════════════════════════════════════
When the user asks you to log food or a meal (e.g. "log that I just ate an apple", "I had a coffee and a banana"):
1. Identify each food item and estimate calories, protein, carbs, fat, and fiber as best you can.
2. Infer the meal category from the current time of day (the device time is included in context if available, otherwise use your best guess):
   - 05:00–10:00 → breakfast
   - 10:00–12:00 → snack
   - 12:00–15:00 → lunch
   - 15:00–18:00 → snack
   - 18:00–21:00 → dinner
   - 21:00–05:00 → snack
3. Include this EXACT marker ONCE at the end of your response for each food item (the app reads it silently — do NOT show it to the user):
[LOG_FOOD:{"name":"Apple","category":"snack","calories":95,"protein":0.5,"carbs":25,"fat":0.3,"fiber":4.4}]
4. Confirm to the user what was logged and which meal slot it went into. Keep it brief: "Logged an apple as a snack (95 cal) 🍎"
5. If you're unsure about a food item's nutrition, use reasonable averages — do not ask for confirmation, just log it.
6. Food logging does NOT need user confirmation — log it immediately.

═══════════════════════════════════════════
SCHEDULE CREATION — HOW IT WORKS (READ CAREFULLY)
═══════════════════════════════════════════
The ONLY way to propose a schedule is by emitting the marker below.
Do NOT say "I'll save your schedule", "I have it here for you", or "just ask me when you're ready".
Those responses are WRONG. The marker IS how you propose it. Nothing else works.

Step 1 — collect (one question at a time, do not ask multiple at once):
  • Fitness goal (fat loss / muscle gain / endurance / strength / general fitness)
  • Days per week (1–6)
  • Session length in minutes (15 / 30 / 45 / 60)
  • Preferred days if mentioned — if not, choose sensible defaults (e.g. Mon/Wed/Fri for 3 days)

Step 2 — as soon as you have goal + days per week + session length, emit this marker ONCE
at the very end of your response. The app reads it silently — never mention it to the user:
[SCHEDULE_PLAN:{"goal":"fat loss","daysPerWeek":3,"selectedDays":[1,3,5],"sessionMinutes":30}]
  - selectedDays: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  - goal must be exactly one of: "fat loss" | "muscle gain" | "endurance" | "general fitness" | "strength"
  - If the user didn't specify days, pick sensible defaults yourself: 3 days → [1,3,5], 2 days → [1,4], 4 days → [1,2,4,5]
  - Do NOT wait for the user to confirm the marker — emit it as soon as you have the three values

Step 3 — in the same response, say: "I've built your plan! Tap 'Add to my schedule calendar' to save it."
The app will show the button automatically from the marker — do not describe the schedule in detail.

NEVER emit the marker more than once per conversation turn.
NEVER hold the plan "in memory" and offer to add it later — that is not how the app works.
If you have goal + days + session length and have NOT yet emitted the marker this session, emit it now.

APPROVAL CASE (very important):
If you described a schedule verbally (e.g. "Here's your new week…") and the user responds with approval
("looks good", "yes", "perfect", "I like it", "let's do it", "sounds great", etc.) — that counts as
confirmation of ALL values. You already know the days per week and schedule shape from what you described.
Pick 45 minutes as the default session length if not stated. Then immediately emit the marker and say
"Tap 'Add to my schedule calendar' to save it." Do NOT say you have it saved, do NOT ask more questions.

═══════════════════════════════════════════
RECOMMENDATIONS — HOW TO PROPOSE WORKOUTS AND RECIPES
═══════════════════════════════════════════

You can recommend a specific workout or recipe to the user. The app turns these recommendations into interactive cards. The user gets a "Start now" / "Add to schedule" / "Skip" button on workout cards, and "View recipe" / "Log it" / "Skip" on recipe cards. The cards render automatically from the markers — DO NOT describe the workout or recipe in detail in your text. The card shows everything visually.

═══ Workout recommendations ═══

When recommending one workout, emit this marker ONCE at the end of your response:

[RECOMMEND_WORKOUT:{"id":"<uuid_from_WORKOUTS_CATALOGUE>","name":"<title_from_catalogue>"}]

═══ Recipe recommendations ═══

When recommending one recipe, emit this marker ONCE at the end of your response:

[RECOMMEND_RECIPE:{"id":"<uuid_from_RECIPES_CATALOGUE>","name":"<name_from_catalogue>"}]

═══ HARD RULES (CRITICAL — VIOLATING THESE BREAKS THE APP) ═══

1. The "id" value MUST be an exact UUID copied character-for-character from the WORKOUTS CATALOGUE or RECIPES CATALOGUE in your context. Never invent a UUID. Never abbreviate it. If you can't find a matching item in the catalogue, do not emit the marker at all — just describe what you'd suggest in plain text.

2. Emit AT MOST one [RECOMMEND_WORKOUT] marker and AT MOST one [RECOMMEND_RECIPE] marker per response. Pick the single best fit. Multiple cards in one response are confusing.

3. Do NOT describe the workout or recipe in detail in your text. Keep the surrounding sentence short — one line framing why this one fits the user. Example:

   ✅ Good:
   "This one's perfect — it matches your goal and you've got the equipment.
   [RECOMMEND_WORKOUT:{"id":"abc-123-...","name":"Upper Body Strength"}]"

   ❌ Bad (describes too much, the card shows all this):
   "I'd suggest Upper Body Strength — it's 30 minutes, focuses on chest and arms,
   uses dumbbells, intermediate difficulty, and burns around 280 calories...
   [RECOMMEND_WORKOUT:{...}]"

4. The markers are silent — never mention them to the user. The app strips them before displaying your message. Just include the marker at the end of the message and trust that the card will appear.

5. The [RECOMMEND_WORKOUT] marker and the [SCHEDULE_PLAN] marker do different things. Use [RECOMMEND_WORKOUT] when suggesting ONE workout to do soon. Use [SCHEDULE_PLAN] when building a recurring weekly schedule. Don't combine them in the same response.

═══ RECOMMENDATION REASONS — CRITICAL ═══

Every workout or recipe recommendation MUST include a one-sentence reason that names specifically WHY this choice fits THIS user RIGHT NOW. The reason draws on the user's actual data in your context — sleep, mood, recent workouts, energy, training load, recent PBs, body composition, weather, time of day, anything specific to them.

The reason goes in the text BEFORE the marker, in the same response. It is the framing line for the card.

GENERIC REASONS ARE FORBIDDEN. The point of this app is that Jarvis sees everything about the user. Generic reasons reveal that the AI isn't actually paying attention to specifics. Examples of what NOT to say:

❌ "Here's one that fits your goal"
❌ "This is a great workout for fat loss"
❌ "Try this — it'll help build strength"
❌ "Perfect for someone at your fitness level"
❌ "This matches what you asked for"

SPECIFIC REASONS NAME THE DATA. Examples of what TO say:

✅ "Your HRV is low this morning and you've trained 4 days running — let's keep it light."
✅ "Your sleep was poor last night (under 6 hours) — let's go gentler. This 20-minute mobility flow will move you without taxing recovery."
✅ "You've been logging 'low mood' for 3 days straight — sometimes a short walk or stretch resets things faster than another HIIT session."
✅ "You PB'd that 30-min HIIT yesterday — incredible. Today let's do active recovery to lock in the gains."
✅ "You said you wanted more cardio, you've only done 1 cardio session this week, and you've got energy — this 25-min run interval session is exactly what's missing from your week."
✅ "It's 7am and your check-in says you're 'fired up' — let's harness that with a heavy strength session before the day catches up with you."
✅ "You haven't done anything for legs in 9 days and your latest workout history is all upper-body — let's balance it out."

PATTERNS THAT MAKE A GOOD REASON:
- Reference a specific data point (sleep hours, mood word, HRV trend, days since something, count of recent workouts of a type)
- Connect that data point to the recommendation choice
- Keep it to ONE sentence. Two at most.
- Sound like a coach noticing something specific, not an AI summarising data.

WHEN THE DATA IS LIMITED:
If the user is brand new and the only data you have is what they stated in onboarding (goal, days/week, session length), reference THAT instead of pretending you know more:

✅ "You said you want to focus on stamina with 3 weekly sessions — this run interval set is the cleanest match."
✅ "First workout for you, and you wanted strength-focused — let's start with the basics so I can see how you handle the load."

The reason must be TRUE. If you can't find a specific data point to justify the choice, just give an honest neutral framing without inventing data ("This one looked like the closest fit to what you described"). DON'T fabricate facts.

THE REASON GOES BEFORE THE MARKER:
"Your sleep was poor last night (under 6 hours) — let's go gentler. This 20-minute mobility flow will move you without taxing recovery.
[RECOMMEND_WORKOUT:{"id":"abc-123-...","name":"Morning Mobility Flow"}]"

Same rules apply to recipe recommendations. Reference whatever's relevant: what they've eaten today, their protein target progress, the time of day, their mood, what they said they wanted.

✅ "You're 40g short of your protein target with 6 hours left in the day — this dinner gets you there with room to spare."
✅ "It's 11am, you only had coffee for breakfast, and your mood was 'flat' on check-in — this snack has the carbs and protein to lift your energy in 20 minutes."

═══ WHEN TO RECOMMEND ═══

Recommend a workout when:
- The user explicitly asks ("what should I do today?", "suggest a workout", "I have 30 min, what can I fit in?")
- The user mentions a body area or goal that maps clearly to a workout in the catalogue
- During a greeting, IF the user has a schedule but nothing on for today
- After the user describes how they're feeling — match intensity to mood/energy

Recommend a recipe when:
- The user asks for meal ideas
- The user mentions a macro target ("I need more protein today")
- The user mentions a meal time ("what should I have for lunch?")
- The user mentions a dietary goal that matches a category ("fat loss" → recipes from the "fat" category)

DON'T recommend when:
- The user is in the middle of a different flow (onboarding, schedule creation, food logging)
- The user is just chatting or asking a general fitness question
- Nothing in the catalogue is a good fit — say so honestly rather than forcing one

═══════════════════════════════════════════
ONBOARDING FLOW (CRITICAL — ALWAYS FOLLOW)
═══════════════════════════════════════════
When the user message starts with [ONBOARDING] or [GREETING] and there is no schedule yet:
Run a structured intake — one question at a time, never multiple questions in one message.

Turn 1: Introduce yourself warmly in ONE sentence. Ask: "What's your main fitness goal right now?"
Turn 2 (after they answer): Ask: "How many days a week can you commit to training?"
Turn 3 (after they answer): Ask: "And how long do you want each session to be — 30 minutes, 45, or an hour?"
Turn 4 (after they answer): You now have goal + days + session length.
  → Immediately emit [SCHEDULE_PLAN:{...}] at the end of your response
  → Say: "I've built your plan! Tap 'Add to my schedule calendar' to save it."
  → Do NOT ask any more questions before doing this

After the schedule marker:
Ask: "One more thing — do you want to do a body scan? Take 3 quick photos and I'll personalise your plan around your physique."

If YES to body scan → emit [BODY_SCAN_PROMPT] at the end of your response.
If NO → "No worries — we're all set. Let's get you moving!"

RE-ONBOARDING: If the user says their goals have changed, offer to build a fresh plan. Collect goal + days + session length again and emit a new [SCHEDULE_PLAN:{...}] marker.

═══════════════════════════════════════════
SAFETY RULES (CRITICAL)
═══════════════════════════════════════════
• NEVER recommend extreme diets (below 1200cal women / 1500cal men)
• NEVER encourage overtraining
• If user reports pain → rest, mobility, see a medical professional if severe
• NEVER diagnose medical conditions
• Always remind users to warm up before intense exercise
• Prioritise long-term sustainable fitness over quick fixes

═══════════════════════════════════════════
THE GOLDEN RULE
═══════════════════════════════════════════
ALWAYS focus on: **Long-term sustainable fitness.**
Not extreme diets. Not overtraining. Not unhealthy behaviour.

═══════════════════════════════════════════
IMAGE ANALYSIS
═══════════════════════════════════════════
When a user shares an image:
• **Fitness equipment** → Identify it, suggest 3-5 exercises with form tips
• **Food/meals** → Estimate calories and macros, suggest improvements
• **Body progress** → Encouraging, constructive feedback (never negative)
• **Exercise form** → Analyse technique, suggest corrections`;

const IMAGE_ANALYSIS_PROMPT = `You're analyzing an image shared by the user. Please:
1. Identify what's in the image (equipment, food, exercise form, etc.)
2. If equipment: suggest 3-5 exercises with form tips, target muscles, and beginner/advanced modifications
3. If food: estimate calories and macros, suggest healthier alternatives if applicable
4. If exercise form: analyse technique and provide corrections
5. Include safety tips where relevant`;

// ─── Structured response mode (5B) ──────────────────────────────────────────
// Opt-in via X-Response-Format: structured-v1 request header.
// The existing JarvisMode and AICoach surfaces send no header and get marker
// text as before — backwards-compatible by design.

const STRUCTURED_MODE_OVERRIDE = `

═══ STRUCTURED RESPONSE MODE — TOOL USAGE ═══
You are in structured response mode. Do NOT include any [MARKER:{...}] text in your response.
Instead, use the provided tools:
• Use the schedule_plan tool instead of [SCHEDULE_PLAN:{...}]
• Use the log_food tool instead of [LOG_FOOD:{...}]
• Use the recommend_workout tool instead of [RECOMMEND_WORKOUT:{...}]
• Use the recommend_recipe tool instead of [RECOMMEND_RECIPE:{...}]
• Use the body_scan_prompt tool instead of [BODY_SCAN_PROMPT]

You CAN call a tool alongside your text response in the same turn.
All other coaching guidelines above remain unchanged.

CRITICAL: When the user describes a food they've eaten and asks to log it, you MUST call the log_food tool. Do NOT ask the user for nutrition information. Estimate calories, protein, carbs, fat, and fiber yourself based on typical serving sizes. Always pick a category (breakfast/lunch/dinner/snack) — infer from time of day or default to snack. The user expects you to know typical food values; asking them defeats the purpose of the tool.
═══ END STRUCTURED MODE ═══
`;

const STRUCTURED_TOOLS = [
  {
    type: "function",
    function: {
      name: "schedule_plan",
      description: "Propose a workout schedule for the user to confirm. Use when the user has provided goal, days per week, and session length.",
      parameters: {
        type: "object",
        properties: {
          goal: { type: "string", description: "Training goal: fat loss | muscle gain | endurance | strength | general fitness" },
          daysPerWeek: { type: "integer", minimum: 1, maximum: 7 },
          selectedDays: { type: "array", items: { type: "integer", minimum: 0, maximum: 6 }, description: "0=Sunday, 6=Saturday" },
          sessionMinutes: { type: "integer", minimum: 5, maximum: 180 },
        },
        required: ["goal", "daysPerWeek", "selectedDays", "sessionMinutes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_food",
      description: "Log a food item the user has consumed. Call when the user describes a meal they just ate or asks you to log food.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string", description: "breakfast | lunch | dinner | snack" },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
          fiber: { type: "number" },
        },
        required: ["name", "category", "calories", "protein", "carbs", "fat", "fiber"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommend_workout",
      description: "Recommend a specific workout from the catalogue. Use when suggesting a workout the user could start now or schedule.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Exact UUID from the WORKOUTS CATALOGUE" },
          name: { type: "string" },
        },
        required: ["id", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommend_recipe",
      description: "Recommend a specific recipe from the catalogue.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Exact UUID from the RECIPES CATALOGUE" },
          name: { type: "string" },
        },
        required: ["id", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "body_scan_prompt",
      description: "Suggest the user complete a body scan. Use when they ask about body composition, measurements, or progress photos.",
      parameters: { type: "object", properties: {} },
    },
  },
];

function mapToolCallToAction(
  tc: { name: string; arguments: string },
  validWorkoutIds: Set<string>,
  validRecipeIds: Set<string>,
): object | null {
  try {
    const args = tc.arguments ? JSON.parse(tc.arguments) : {};

    switch (tc.name) {
      case "schedule_plan": {
        if (
          typeof args.goal !== "string" ||
          typeof args.daysPerWeek !== "number" ||
          !Array.isArray(args.selectedDays) ||
          typeof args.sessionMinutes !== "number"
        ) {
          console.warn("[ai-coach] Invalid schedule_plan payload:", args);
          return null;
        }
        return { type: "schedule_plan", payload: args };
      }
      case "log_food": {
        if (typeof args.name !== "string" || typeof args.calories !== "number" ||
          args.calories < 0 || args.calories > 10000) {
          console.warn("[ai-coach] Invalid log_food payload:", args);
          return null;
        }
        return {
          type: "log_food",
          payload: {
            name: args.name,
            category: args.category || "snack",
            calories: args.calories,
            protein: args.protein ?? 0,
            carbs: args.carbs ?? 0,
            fat: args.fat ?? 0,
            fiber: args.fiber ?? 0,
          },
        };
      }
      case "recommend_workout": {
        if (typeof args.id !== "string" || !validWorkoutIds.has(args.id)) {
          console.warn("[ai-coach] Hallucinated workout UUID:", args.id);
          return null;
        }
        return { type: "recommend_workout", payload: { id: args.id, name: args.name } };
      }
      case "recommend_recipe": {
        if (typeof args.id !== "string" || !validRecipeIds.has(args.id)) {
          console.warn("[ai-coach] Hallucinated recipe UUID:", args.id);
          return null;
        }
        return { type: "recommend_recipe", payload: { id: args.id, name: args.name } };
      }
      case "body_scan_prompt":
        return { type: "body_scan_prompt" };
      default:
        console.warn("[ai-coach] Unknown tool call:", tc.name);
        return null;
    }
  } catch (err) {
    console.error("[ai-coach] Tool call parse error:", tc.name, err);
    return null;
  }
}

function buildStructuredStream(
  gatewayBody: ReadableStream<Uint8Array>,
  validWorkoutIds: Set<string>,
  validRecipeIds: Set<string>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = gatewayBody.getReader();
      let buffer = "";
      // Map of tool call index → accumulated data
      const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();

      const emit = (chunk: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;
              if (!delta) continue;

              // Text content — emit immediately as it streams
              if (delta.content) {
                emit({ type: "text", delta: delta.content });
              }

              // Tool call deltas — accumulate until the stream ends
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const tcIdx = typeof tc.index === "number" ? tc.index : 0;
                  if (!toolCalls.has(tcIdx)) {
                    toolCalls.set(tcIdx, { id: "", name: "", arguments: "" });
                  }
                  const existing = toolCalls.get(tcIdx)!;
                  if (tc.id) existing.id = tc.id;
                  if (tc.function?.name) existing.name += tc.function.name;
                  if (tc.function?.arguments) existing.arguments += tc.function.arguments;
                }
              }
            } catch {
              // Malformed SSE chunk — skip
            }
          }
        }

        // Emit validated tool calls as action chunks after text has fully streamed
        for (const [, tc] of toolCalls) {
          const action = mapToolCallToAction(tc, validWorkoutIds, validRecipeIds);
          if (action) {
            emit({ type: "action", action });
          }
        }

        emit({ type: "done" });
        controller.close();
      } catch (err) {
        console.error("[ai-coach] Stream transform error:", err);
        // Ensure done is always emitted so the client doesn't hang
        try { emit({ type: "done" }); } catch { /* ignore */ }
        controller.close();
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const useStructuredFormat = req.headers.get("x-response-format") === "structured-v1";

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;
    console.log(`AI Coach request from authenticated user: ${userId}`);

    const quota = await checkAIQuota(supabaseAdmin, userId, {
      dailyCap: DEFAULT_QUOTAS.ai_coach,
      generationType: "ai_coach",
    });
    if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);

    // Log the call so it counts against the next quota check. We don't store
    // the full conversation here — prompts can contain PII.
    await supabaseAdmin.from("ai_generation_log").insert({
      user_id: userId,
      generation_type: "ai_coach",
      model: "gemini-2.5-flash",
      prompt: { redacted: true },
    });

    // ─── Fetch user context for personalisation ───
    const [
      { data: profile },
      { data: workoutPrefs },
      { data: nutritionProfile },
      { data: streaks },
      { data: recentCheckin },
      { data: recentCheckins },
      { data: recentSleep },
      { data: recentWorkouts },
      { data: activityGoals },
      { data: latestWeight },
      { data: latestHeartRate },
      { data: latestSteps },
      { data: userWorkoutPrefs },
      { data: workoutsCatalogue },
      { data: recipesCatalogue },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('workout_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('nutrition_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_streaks').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('daily_checkins').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('daily_checkins').select('mood, energy, date').eq('user_id', userId).order('date', { ascending: false }).limit(7),
      supabase.from('sleep_logs').select('*').eq('user_id', userId).order('sleep_date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('workout_progress').select('*').eq('user_id', userId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(5),
      supabase.from('activity_goals').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('health_metrics').select('*').eq('user_id', userId).eq('metric_type', 'weight').order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('health_metrics').select('*').eq('user_id', userId).eq('metric_type', 'heart_rate').order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('health_metrics').select('value').eq('user_id', userId).eq('metric_type', 'steps').order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('user_workout_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('workouts').select('id, title, category, difficulty, duration_minutes, body_areas, equipment').limit(50),
      supabase.from('recipes').select('id, name, category, meal_type, calories, protein_g, carbs_g, fat_g').limit(50),
    ]);

    // Build user context string
    let userContext = "\n\n═══ USER PROFILE CONTEXT ═══\n";
    
    // Lifted out of the if(profile) block so it's available when building the message array below
    let nameForReminder = 'there';
    if (profile) {
      nameForReminder = (profile.display_name || 'there').split(' ')[0];
      userContext += `\nUSER NAME INSTRUCTION:\nThe user's first name is "${nameForReminder}". ALWAYS address them as "${nameForReminder}". NEVER use their email address, username, full name, or any other variation. If you don't know the user's name, address them as "there".\n`;
      userContext += `Fitness Goal: ${profile.fitness_goal || 'Not set'}\n`;
    }

    if (workoutPrefs) {
      userContext += `\nWorkout Preferences:\n`;
      userContext += `• Fitness Level: ${workoutPrefs.fitness_level || 'Not set'}\n`;
      userContext += `• Goal: ${workoutPrefs.workout_goal || 'Not set'}\n`;
      userContext += `• Days per week: ${workoutPrefs.days_per_week || 'Not set'}\n`;
      userContext += `• Session duration: ${workoutPrefs.session_duration || 'Not set'} minutes\n`;
      userContext += `• Equipment: ${workoutPrefs.available_equipment?.join(', ') || 'Not specified'}\n`;
      userContext += `• Target body areas: ${workoutPrefs.target_body_areas?.join(', ') || 'Not specified'}\n`;
    }

    if (nutritionProfile) {
      userContext += `\nNutrition Profile:\n`;
      userContext += `• Daily calorie target: ${nutritionProfile.daily_calorie_target || 'Not set'}\n`;
      userContext += `• Diet preferences: ${nutritionProfile.food_preferences?.join(', ') || 'Not specified'}\n`;
      userContext += `• Allergies: ${nutritionProfile.allergies?.join(', ') || 'None'}\n`;
      userContext += `• Protein intake: ${nutritionProfile.protein_intake || 'Not set'}\n`;
    }

    if (streaks) {
      userContext += `\nStreaks & Progress:\n`;
      userContext += `• Current streak: ${streaks.current_streak} days\n`;
      userContext += `• Longest streak: ${streaks.longest_streak} days\n`;
      userContext += `• Total workouts: ${streaks.total_workouts}\n`;
      userContext += `• Last workout: ${streaks.last_workout_date || 'Never'}\n`;
    }

    if (recentCheckin) {
      userContext += `\nToday's Check-in:\n`;
      userContext += `• Mood: ${recentCheckin.mood}\n`;
      userContext += `• Energy: ${recentCheckin.energy || 'Not reported'}/5\n`;
    }

    if (recentCheckins && recentCheckins.length > 1) {
      userContext += `\nMood History (last ${recentCheckins.length} days):\n`;
      for (const c of recentCheckins) {
        userContext += `• ${c.date}: mood=${c.mood}, energy=${c.energy || '?'}/5\n`;
      }
      // Detect patterns
      const moodCounts: Record<string, number> = {};
      const energyValues: number[] = [];
      for (const c of recentCheckins) {
        moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
        if (c.energy) energyValues.push(c.energy);
      }
      const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const avgEnergy = energyValues.length > 0 ? (energyValues.reduce((a, b) => a + b, 0) / energyValues.length).toFixed(1) : null;
      userContext += `• Dominant mood this week: ${dominantMood || 'unknown'}\n`;
      if (avgEnergy) userContext += `• Average energy this week: ${avgEnergy}/5\n`;
      userContext += `\n⚠️ IMPORTANT: Use this mood/energy data to adapt your coaching. If user is tired/stressed/low energy, suggest lighter workouts, recovery, and encouragement. If fired up/strong/high energy, push them harder.\n`;
    }

    if (recentSleep) {
      userContext += `\nLatest Sleep:\n`;
      userContext += `• Duration: ${recentSleep.duration_minutes ? Math.round(recentSleep.duration_minutes / 60 * 10) / 10 : 'Unknown'} hours\n`;
      userContext += `• Quality: ${recentSleep.sleep_quality || 'Not rated'}/10\n`;
    }

    if (recentWorkouts && recentWorkouts.length > 0) {
      userContext += `\nRecent Workouts (last ${recentWorkouts.length}):\n`;
      for (const w of recentWorkouts) {
        const mins = w.duration_seconds ? Math.round(w.duration_seconds / 60) : '?';
        userContext += `• ${w.completed_at?.split('T')[0]} — ${mins} min, ${w.calories_burned || '?'} cal\n`;
      }
    }

    if (activityGoals) {
      userContext += `\nWeekly Goals:\n`;
      if (activityGoals.weekly_activities) userContext += `• Activities: ${activityGoals.weekly_activities}/week\n`;
      if (activityGoals.weekly_calories) userContext += `• Calories: ${activityGoals.weekly_calories}/week\n`;
      if (activityGoals.weekly_duration_minutes) userContext += `• Duration: ${activityGoals.weekly_duration_minutes} min/week\n`;
    }

    // Health metrics context
    if (latestWeight) {
      userContext += `\nBody Metrics:\n`;
      userContext += `• Current weight: ${latestWeight.value} ${latestWeight.unit}\n`;
      const weightKg = latestWeight.unit === 'lbs' ? latestWeight.value * 0.453592 : latestWeight.value;
      const maintenance = Math.round(weightKg * 32);
      userContext += `• Estimated maintenance calories: ~${maintenance} kcal/day\n`;
      userContext += `• Protein target (2g/kg): ~${Math.round(weightKg * 2)}g/day\n`;
    }
    if (latestHeartRate) {
      userContext += `• Resting heart rate: ${Math.round(latestHeartRate.value)} bpm\n`;
    }
    if (latestSteps) {
      userContext += `• Latest step count: ${Math.round(latestSteps.value).toLocaleString()} steps\n`;
    }

    // Workout type preferences
    if (userWorkoutPrefs) {
      userContext += `\nWorkout Type Preferences:\n`;
      if (userWorkoutPrefs.preferred_workout_types?.length) {
        userContext += `• Preferred types: ${userWorkoutPrefs.preferred_workout_types.join(', ')}\n`;
      }
      if (userWorkoutPrefs.preferred_equipment?.length) {
        userContext += `• Available equipment: ${userWorkoutPrefs.preferred_equipment.join(', ')}\n`;
      }
      if (userWorkoutPrefs.preferred_duration_minutes) {
        userContext += `• Preferred duration: ${userWorkoutPrefs.preferred_duration_minutes} min\n`;
      }
      if (userWorkoutPrefs.preferred_time) {
        userContext += `• Preferred workout time: ${userWorkoutPrefs.preferred_time}\n`;
      }
    }

    if (workoutsCatalogue && workoutsCatalogue.length > 0) {
      userContext += `\n═══ WORKOUTS CATALOGUE — only recommend workouts from this exact list ═══\n`;
      for (const w of workoutsCatalogue) {
        const bodyAreas = Array.isArray(w.body_areas) ? w.body_areas.join('/') : (w.body_areas ?? 'general');
        userContext += `[${w.id}] ${w.title} — ${w.category ?? 'general'}, ${w.difficulty ?? 'all levels'}, ${w.duration_minutes ?? '?'} min, targets: ${bodyAreas}\n`;
      }
    }

    if (recipesCatalogue && recipesCatalogue.length > 0) {
      userContext += `\n═══ RECIPES CATALOGUE — only recommend recipes from this exact list ═══\n`;
      for (const r of recipesCatalogue) {
        userContext += `[${r.id}] ${r.name} — ${r.meal_type}, ${r.category}, ${r.calories}cal, ${r.protein_g}g protein\n`;
      }
    }

    userContext += "\nUse this context to personalise your responses. Address the user by name when appropriate. Reference their goals, fitness level, and recent activity. If data is missing, ask them about it naturally.\n";
    userContext += "\n⚠️ WORKOUT CALIBRATION: When recommending workouts, consider the user's weight for calorie calculations (MET × weight_kg × duration_hours). Recommend workout types that match their preferences and fitness level.\n";
    userContext += "\n⚠️ CATALOGUE RULE: When you mention a specific workout or recipe by name, it MUST come from the WORKOUTS CATALOGUE or RECIPES CATALOGUE above. Never invent workout or recipe names. If the catalogue doesn't contain something suitable, say so honestly rather than making one up.\n";

    // ─── Process request ───
    const reqBody = await req.json();
    const { messages, imageData, hasImage } = reqBody;
    // Accept both field names: customResponse (JarvisMode/useAIChat) and customResponseStyle (useAI hook)
    const customResponse: string = reqBody.customResponse || reqBody.customResponseStyle || '';
    const customMemory: string = reqBody.customMemory || '';
    const healthProfile: string = reqBody.healthProfile || '';

    let extraContext = '';
    if (healthProfile && healthProfile.trim()) {
      extraContext += `\n\n📊 LIVE BIOMETRIC PROFILE (from HealthKit — use this to personalise every response):\n${healthProfile.trim()}`;
    }
    if (customMemory && customMemory.trim()) {
      extraContext += `\n\n📋 PERSONAL CONTEXT (always remember this):\n${customMemory.trim()}`;
    }
    if (customResponse && customResponse.trim()) {
      extraContext += `\n\n🎯 RESPONSE STYLE (always follow this):\n${customResponse.trim()}`;
    }

    const personalizedPrompt = SYSTEM_PROMPT + userContext + extraContext;

    // Build the messages array for the API
    let apiMessages: any[] = [{ role: "system", content: personalizedPrompt }];

    // Process messages, handling any with image data
    for (const msg of messages) {
      if (msg.imageData && msg.role === "user") {
        apiMessages.push({
          role: "user",
          content: [
            { type: "image_url", image_url: { url: msg.imageData } },
            { type: "text", text: msg.content || IMAGE_ANALYSIS_PROMPT },
          ],
        });
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // Insert a name reminder as a system message immediately before the final user turn.
    // This positions the directive after the chat history where it carries the most weight,
    // defeating contamination from old messages that used the wrong name.
    if (nameForReminder !== 'there' && apiMessages.length > 1) {
      apiMessages.splice(apiMessages.length - 1, 0, {
        role: "system",
        content: `REMINDER: The user's name is "${nameForReminder}". ALWAYS address them as "${nameForReminder}". NEVER use their email address or username.`,
      });
    }

    // Backwards compatibility for top-level imageData
    if (imageData && hasImage) {
      const lastUserMsgIndex = apiMessages.findLastIndex((m: any) => m.role === "user");
      if (lastUserMsgIndex !== -1 && typeof apiMessages[lastUserMsgIndex].content === "string") {
        const textContent = apiMessages[lastUserMsgIndex].content;
        apiMessages[lastUserMsgIndex] = {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageData } },
            { type: "text", text: textContent || IMAGE_ANALYSIS_PROMPT },
          ],
        };
      }
    }

    // ─── Structured response path (X-Response-Format: structured-v1) ───
    if (useStructuredFormat) {
      const validWorkoutIds = new Set<string>((workoutsCatalogue ?? []).map((w: any) => w.id));
      const validRecipeIds = new Set<string>((recipesCatalogue ?? []).map((r: any) => r.id));

      // Append tool-usage override to the system prompt, then re-inject the log_food
      // estimation mandate as a standalone system message just before the last user turn
      // so it carries maximum positional weight against the model's cautious defaults.
      const baseStructured = [
        { role: "system", content: (apiMessages[0] as any).content + STRUCTURED_MODE_OVERRIDE },
        ...apiMessages.slice(1),
      ];
      const lastUserIdx = baseStructured.findLastIndex((m: any) => m.role === "user");
      const structuredMessages = lastUserIdx !== -1
        ? [
            ...baseStructured.slice(0, lastUserIdx),
            { role: "system", content: "CRITICAL: When the user describes a food they've eaten and asks to log it, you MUST call the log_food tool. Do NOT ask the user for nutrition information. Estimate calories, protein, carbs, fat, and fiber yourself based on typical serving sizes. Always pick a category (breakfast/lunch/dinner/snack) — infer from time of day or default to snack. The user expects you to know typical food values; asking them defeats the purpose of the tool." },
            baseStructured[lastUserIdx],
          ]
        : baseStructured;

      const gatewayResponse = await aiChatCompletion({
        model: "gemini-2.5-flash",
        messages: structuredMessages,
        stream: true,
        tools: STRUCTURED_TOOLS,
        tool_choice: "auto",
      });

      if (!gatewayResponse.ok) {
        if (gatewayResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (gatewayResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errText = await gatewayResponse.text();
        console.error("[ai-coach] Gateway error (structured):", gatewayResponse.status, errText);
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const structuredStream = buildStructuredStream(
        gatewayResponse.body!,
        validWorkoutIds,
        validRecipeIds
      );
      return new Response(structuredStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ─── Marker path (existing behaviour — unchanged) ───
    const response = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: apiMessages,
      stream: true,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Gemini ${response.status}: ${errorText.slice(0, 400)}` }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
