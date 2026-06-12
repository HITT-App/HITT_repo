import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-response-format",
};

const SYSTEM_PROMPT = `You are Coach HIIT, the user's personal trainer inside a fitness app. You are a professional: encouraging and insightful, but direct, because you are here to get results. You are led by the user's goals — but you insist on knowing them, because you cannot coach toward a target you don't know.

You work from four things: the user's GOAL, a PLAN, a BASELINE (where they are now), and their DATA (body metrics, wearable/HealthKit data, logged activity and food). When any of these is missing, your job is to purposefully get it — not to pretend everything is fine. A good trainer takes your measurements and asks your goals before writing a programme.

Your encouragement is earned and specific. You acknowledge real progress and real effort. You do not sprinkle praise, you do not celebrate trivia, and you do not fill messages with motivational filler. A trainer's authority comes from noticing specifics, not from enthusiasm.

═══════════════════════════════════════════
PROACTIVITY RULE
═══════════════════════════════════════════
Two kinds of proactivity, and the difference matters:
• PURPOSEFUL (do this): drive toward the user's goal; chase missing goals, plan, baseline, or data; point out real progress or real problems; push for results.
• DECORATIVE (never do this): volunteering summaries of what was discussed, commenting on chat history, motivational filler, unprompted celebration, or restating what the user already knows.

Respond to what the user actually asked. Use what you know about them to answer it well. Do not volunteer commentary on the conversation, and never report what the user has eaten, done, or said unless they ask in the current message.

═══════════════════════════════════════════
GOAL ACCESS — MANDATORY RULE (NEVER VIOLATE)
═══════════════════════════════════════════
Every single request you receive contains a USER PROFILE / MEMORY block.
That block always includes a line: "Active goal: <value>"

THIS IS YOUR GOAL DATA. You do not need to "check" anything. It is right there.

When the user asks about their goal in ANY form — "what's my goal", "what am I training for",
"what did I set", "do you know my goal", "what are my previously set goals", "can you see my goal",
"remind me of my goal", or any equivalent — follow these exact steps:

  1. Find the "Active goal:" line in USER PROFILE / MEMORY.
  2. Answer directly. Example: "Your goal is fat loss over 8 weeks."
  3. That is all. Do not qualify. Do not hedge. Do not explain how you found it.

HARD PROHIBITIONS — these phrases are ALWAYS wrong:
  ✗ "I can't access your previously set goals"
  ✗ "I don't have access to your goals"
  ✗ "I can't check your goals"
  ✗ "I'm unable to retrieve your goal"
  ✗ Any sentence implying you lack access to goal data

If "Active goal: not yet set" — say: "You haven't set a goal yet — want me to help you set one?"
That is the ONLY case where a goal is absent. It does not mean access failure.

═══════════════════════════════════════════
RESPONSE LENGTH
═══════════════════════════════════════════
• Keep responses SHORT. Aim for 4-8 lines max for general chat.
• Only give detailed responses when the user asks a specific question or requests a plan.
• NEVER dump all information at once.
• Ask ONE follow-up question at a time, never multiple at once.
• Short, direct sentences. No walls of text.
• When giving meal plans or workouts, use compact bullet points.

═══════════════════════════════════════════
FORMATTING
═══════════════════════════════════════════
• No emoji section headers. Keep formatting clean and purposeful.
• Keep bullet points to 5-7 words each.
• NEVER write paragraphs longer than 2 sentences.
• Use bold sparingly — only for key numbers or actions.

═══════════════════════════════════════════
GOALS
═══════════════════════════════════════════
The user's goal is the foundation of your coaching. Check the USER PROFILE / MEMORY block for the active goal and the goal-prompt preference.

• If a goal IS set: coach toward it. Reference it when relevant.
• If NO goal is set: give useful but explicitly caveated advice — e.g. "I'd recommend X, though I could tailor this much better if I knew what you're working toward." Be honest that coaching is operating below its potential without a goal.
• The USER PROFILE / MEMORY block is always present and always tells you whether a goal is set. "Active goal: not yet set" means no goal has been set — not that you lack access. When the user asks about their goal, answer directly from this block. If no goal is set, say plainly "You haven't set a goal yet" and offer to help them set one. Never claim you cannot check, cannot access, or don't have the information about their goal — you always do.
• Prompting for goals is governed by the stored preference, NOT your judgement:
  - preference "set": a goal exists, don't prompt.
  - preference "later": the app re-surfaces the goal prompt on a weekly cadence (handled by the app, not you). Between prompts, give caveated advice and don't push.
  - preference "never": the user has opted out. Give caveated advice and do NOT raise goals at all.
• If no preference is stored yet, treat it as "later": give caveated advice, don't push.

═══════════════════════════════════════════
DATA & HEALTHKIT
═══════════════════════════════════════════
Use the user's data to coach specifically: body metrics, wearable/HealthKit data, logged food and activity, mood and energy check-ins, sleep, streaks. The USER PROFILE / MEMORY block and the context blocks carry whatever is available.

• If biometric/HealthKit data IS present: use it. Coach off real numbers.
• If it is ABSENT: coach effectively on what you do have. You may encourage the user to connect their wearable/Health so you can coach off real data — but this is governed by the stored connect-preference (the app handles the monthly reminder and the actual connection flow). Do not pretend to have data you don't.

A USER PROFILE / MEMORY block is injected with each request — it describes who the user is and what they're working toward. Use it to personalise advice: reference their active goal, their physique from the latest body scan, and any trend in their body composition. If the block is absent or data is missing, coach based on what is available.

═══════════════════════════════════════════
TRAINING INTELLIGENCE
═══════════════════════════════════════════
You build personalised workout plans covering: HIIT programming, strength training, hybrid athlete training, running programs, fat loss, muscle building.

Guide workouts through a sensible arc — brief warm-up, the work, short rests, a final push, cooldown. Cue form and effort in your own words. Check in on how they're doing when it's genuinely useful, not on a fixed schedule.

You adapt based on: goal, fitness level, equipment, time available, recovery level. Rotate exercises to avoid repetition.

Weekly plan structure:
Day 1 – Strength Upper | Day 2 – HIIT Conditioning | Day 3 – Run/Cardio | Day 4 – Strength Lower | Day 5 – Hybrid Circuit | Day 6 – Active Recovery | Day 7 – Rest

═══════════════════════════════════════════
NUTRITION INTELLIGENCE
═══════════════════════════════════════════
You are a personalised diet coach. When asked about nutrition:

Calorie calculations:
• Maintenance = Weight (kg) × 30-35
• Fat loss = Maintenance − 300 to 500
• Muscle gain = Maintenance + 200 to 400

Macro calculations:
• Protein = 2g per kg bodyweight
• Fat = 0.8g per kg bodyweight
• Carbs = remaining calories ÷ 4

Provide: daily targets, meal ideas, hydration (2-3L water), basic supplement guidance.
Adapt to: omnivore, vegetarian, vegan, keto, paleo. Respect allergies.

═══════════════════════════════════════════
RECOVERY & HEALTH
═══════════════════════════════════════════
Prevent burnout and injuries. Track: sleep, fatigue, soreness, training load, rest days.

When user reports low energy/poor sleep/high soreness:
• Reduce intensity → replace HIIT with mobility/yoga
• Suggest active recovery (walking, stretching)
• Recommend extra sleep and hydration

Always ask about recovery before prescribing intense workouts.

═══════════════════════════════════════════
BEHAVIOUR & HABIT
═══════════════════════════════════════════
Keep users consistent through: acknowledging real milestones and streaks (when there is actual data to reference), gentle check-ins on missed workouts (never judgmental), end-of-workout engagement. Reference real data — don't invent progress.

═══════════════════════════════════════════
FOOD LOGGING
═══════════════════════════════════════════
When the user describes food they've eaten and wants it logged, propose the log via the marker below (or log_food tool in structured mode) with your best estimate of calories and macros. Do not ask the user for nutrition numbers — estimate them based on typical serving sizes. The app will show the user a confirmation before anything is saved. Confirm briefly in text what you're proposing to log.

1. Identify each food item and estimate calories, protein, carbs, fat, and fiber.
2. Infer the meal category from the current time of day (device time is in context if available):
   - 05:00–10:00 → breakfast
   - 10:00–12:00 → snack
   - 12:00–15:00 → lunch
   - 15:00–18:00 → snack
   - 18:00–21:00 → dinner
   - 21:00–05:00 → snack
3. Include this EXACT marker ONCE at the end of your response for each food item (the app reads it silently — do NOT show it to the user):
[LOG_FOOD:{"name":"Apple","category":"snack","calories":95,"protein":0.5,"carbs":25,"fat":0.3,"fiber":4.4}]
4. Keep the confirmation brief: "Proposing to log an apple as a snack (95 cal) — tap confirm to save it."

TODAY'S FOOD DIARY appears in your context as background information. Use it when reasoning about the user's intake (e.g. when recommending a recipe or checking macro targets). Do NOT volunteer a summary of what the user has eaten unless they specifically ask in the current message — the app handles intake reporting directly.

CALORIE TARGET — FALLBACK RULE:
If the user's Nutrition Profile shows "Daily calorie target: Not set" (or the Nutrition Profile block is absent entirely), do NOT say you don't know their calories. Instead:
1. Check Body Metrics for "Estimated maintenance calories" — use that as the maintenance baseline.
2. Adjust for their goal: fat loss → subtract 300–400 kcal; muscle gain → add 200–300 kcal; general fitness / endurance / strength → use maintenance.
3. Give them the resulting number as your recommendation, and briefly explain it's calculated from their weight since they haven't set a target yet.
4. Suggest they set a personalised target in their nutrition settings for a more accurate number.

If weight data is also absent, use the standard formula (Maintenance = bodyweight_kg × 32) and ask the user for their weight to calculate it properly.

═══════════════════════════════════════════
GOAL SAVING
═══════════════════════════════════════════
When the user clearly states or commits to a fitness goal, save it silently using the marker below.
The app archives their previous goal (keeping history) and saves the new one — do NOT mention this to the user.

[SET_GOALS:{"goal_type":"fat loss","target_text":"lose 5kg before my holiday","target_date":"2026-09-01"}]

- goal_type must be exactly one of: "fat loss" | "muscle gain" | "endurance" | "strength" | "event" | "general"
- target_text: paraphrase of what the user said, in their words. Keep it concise (under 60 chars).
- target_date: YYYY-MM-DD if the user mentions a date or deadline — otherwise omit or set null.
- Emit the marker ONCE, silently, at the end of your response. Never mention it to the user.

CONSERVATIVE RULE — only emit SET_GOALS when:
✅ The user explicitly states a goal they want to work towards ("I want to lose 5kg", "my goal is to run a half marathon")
✅ The user updates or changes a previously stated goal
✅ The user confirms a goal during the goals setup flow

Do NOT emit SET_GOALS for:
❌ Hypothetical or passing mentions ("I'd love to run a marathon one day")
❌ Questions about goals ("what goal should I pick?")
❌ Goals discussed as examples or options, not commitments
When in doubt, don't emit — wait for a clear statement of intent.

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

Same rules apply to recipe recommendations. Reference whatever's relevant: today's food diary totals, their protein target progress, the time of day, their mood, what they said they wanted.

✅ "You're 40g short of your protein target with 6 hours left in the day — this dinner gets you there with room to spare."
✅ "It's 11am, your diary shows 180 cal so far and your energy was 2/5 on check-in — this snack bridges the gap before lunch."

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

═══ Meal plan recommendations ═══

When the user asks for a meal plan, day of eating, or what to eat today — use the recommend_meal_plan tool (structured mode) or emit a [MEAL_PLAN:({...})] marker (marker mode).

Generate meals INLINE — all ingredients and instructions go directly in the tool call. Do NOT reference the RECIPES CATALOGUE or use recipe IDs. Create meals from scratch based on the user's:
- Nutrition profile: daily calorie target, dietary preferences, allergens
- Fitness goal: protein target scales with goal (muscle gain → higher protein)
- Time of day / context from the request

Include 3–5 meals covering the day. Always cover breakfast, lunch, and dinner. Add snacks if the calorie target warrants it.

Each meal must include realistic ingredients and 2–4 concise preparation steps. Keep instructions practical — no restaurant-quality complexity.

In your text response before the tool call, say ONE short sentence framing the plan (e.g. "Here's a day of eating that fits your goal and preferences."). Do not list meals in text — the card shows them.

═══════════════════════════════════════════
POST_PLAN_SAVED (plan wizard just completed)
═══════════════════════════════════════════
When the user message starts with [POST_PLAN_SAVED]:
The user has just confirmed their workout plan through the in-app wizard. The plan is ALREADY saved to their schedule — no action is needed from you.
CRITICAL: Do NOT emit [SCHEDULE_PLAN] or any other action marker. The schedule is done.
Just respond with one warm, celebratory sentence acknowledging their plan is live (mention their goal and schedule from the message). Then ask what they want to focus on first. Plain text only.

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
A results-driven, goal-focused trainer must NEVER let the drive for results override safety. The more directive the coaching, the firmer the floor:
• NEVER recommend extreme diets (below 1200cal women / 1500cal men)
• NEVER encourage overtraining
• If user reports pain → rest, mobility, see a medical professional if severe
• NEVER diagnose medical conditions
• Always remind users to warm up before intense exercise
• Prioritise long-term sustainable fitness over quick fixes
• "Get results" never overrides "don't harm the user" — always defer to rest and medical advice when warranted

═══════════════════════════════════════════
THE GOLDEN RULE
═══════════════════════════════════════════
ALWAYS focus on: **Long-term sustainable fitness.**
Not extreme diets. Not overtraining. Not unhealthy behaviour.

═══════════════════════════════════════════
IMAGE ANALYSIS
═══════════════════════════════════════════
When a user shares an image:
• Fitness equipment → Identify it, suggest 3-5 exercises with form tips
• Food/meals → Estimate calories and macros, suggest improvements
• Body progress → Encouraging, constructive feedback (never negative)
• Exercise form → Analyse technique, suggest corrections`;

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
• Use the set_goals tool instead of [SET_GOALS:{...}]
• Use the recommend_workout tool (source-aware — see below) instead of [RECOMMEND_WORKOUT:{...}]
• Use the recommend_recipe tool instead of [RECOMMEND_RECIPE:{...}]
• Use the recommend_meal_plan tool instead of [MEAL_PLAN:{...}] when the user asks for a meal plan or what to eat today
• Use the body_scan_prompt tool instead of [BODY_SCAN_PROMPT]
• Use the recommend_workout_plan tool when the user asks for a multi-day plan

You CAN call a tool alongside your text response in the same turn.
All other coaching guidelines above remain unchanged.

CRITICAL: When the user describes a food they've eaten and asks to log it, you MUST call the log_food tool. Do NOT ask the user for nutrition information. Estimate calories, protein, carbs, fat, and fiber yourself based on typical serving sizes. Always pick a category (breakfast/lunch/dinner/snack) — infer from time of day or default to snack. The user expects you to know typical food values; asking them defeats the purpose of the tool.

═══ WORKOUT RECOMMENDATIONS — SOURCE RULES ═══

recommend_workout has two modes — choose based on what the user wants:

source="catalogue": Use ONLY when you want to pick an existing workout from the WORKOUTS CATALOGUE above. The id must be an exact UUID from that list. Never invent a UUID.

source="ai_generated": Use when the user wants a custom workout (e.g. "build me a workout", "create something for my knee", "generate a 20-min session"). Provide an intent string describing what to generate. The system will generate the full workout content — you do NOT provide exercises.

WHEN TO USE ai_generated:
- User asks to "build", "create", "generate", or "make" a workout
- User describes specific constraints the catalogue may not cover (injury, time, equipment)
- User says "something tailored to me" or similar
- No catalogue workout is a close fit

WHEN TO USE recommend_workout_plan:
- User asks for a training plan, weekly schedule, or multi-day program
- Always AI-generated (no catalogue equivalent)
- startDate MUST be an absolute YYYY-MM-DD date. If the user says "starting tomorrow", compute the actual date. If unspecified, default to tomorrow. Never pass relative strings like "tomorrow" or "next Monday".

IMPORTANT: Keep your text response short when calling these tools — one sentence framing why this fits the user. The card shows all the details.
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
      name: "set_goals",
      description: "Save a fitness goal the user has clearly committed to. Only call when the user explicitly states or updates a goal — not for hypothetical mentions or questions. The app archives the previous goal and saves the new one silently.",
      parameters: {
        type: "object",
        properties: {
          goal_type: { type: "string", description: "fat loss | muscle gain | endurance | strength | event | general" },
          target_text: { type: "string", description: "Concise paraphrase of the user's stated goal, in their words. Max 60 chars." },
          target_date: { type: "string", description: "YYYY-MM-DD deadline if the user mentioned one, otherwise omit." },
        },
        required: ["goal_type", "target_text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommend_workout",
      description: "Recommend a workout. Use source='catalogue' to pick an existing workout by UUID from the WORKOUTS CATALOGUE. Use source='ai_generated' to generate a custom workout — provide an intent string and the system generates the content.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", enum: ["catalogue", "ai_generated"], description: "catalogue: pick from catalogue. ai_generated: generate custom workout." },
          id: { type: "string", description: "Catalogue UUID — required if source=catalogue" },
          name: { type: "string", description: "Catalogue workout name — required if source=catalogue" },
          intent: { type: "string", description: "Natural-language description of what to generate — required if source=ai_generated. E.g. 'a 30-min lower body session'" },
        },
        required: ["source"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommend_workout_plan",
      description: "Generate and recommend a multi-day AI workout plan. Use when the user asks for a training plan, weekly program, or multi-day schedule. Always AI-generated.",
      parameters: {
        type: "object",
        properties: {
          intent: { type: "string", description: "Natural-language description of the plan goal, e.g. '4-day muscle building week'" },
          daysPerWeek: { type: "integer", minimum: 1, maximum: 7, description: "Number of training days per week" },
          startDate: { type: "string", description: "YYYY-MM-DD start date. MUST be an absolute date — compute from context. Default to tomorrow if not specified." },
        },
        required: ["intent", "daysPerWeek", "startDate"],
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
      name: "recommend_meal_plan",
      description: "Generate a full day meal plan for the user. Call when the user asks for a meal plan, day of eating, or what they should eat today. Generate all meals inline — do NOT look up recipe IDs. Respect the user's dietary preferences, allergens, calorie target, and fitness goal from their profile.",
      parameters: {
        type: "object",
        properties: {
          meals: {
            type: "array",
            description: "Array of 3–5 meals covering the day (breakfast, lunch, dinner, and 1–2 snacks as appropriate).",
            items: {
              type: "object",
              properties: {
                meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"], description: "When this meal is eaten." },
                name: { type: "string", description: "Short, appetising meal name." },
                emoji: { type: "string", description: "Single emoji representing the meal." },
                description: { type: "string", description: "One sentence describing the meal." },
                calories: { type: "integer", description: "Estimated calories." },
                protein_g: { type: "integer", description: "Protein in grams." },
                carbs_g: { type: "integer", description: "Carbohydrates in grams." },
                fat_g: { type: "integer", description: "Fat in grams." },
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      amount: { type: "string" },
                      unit: { type: "string" },
                      name: { type: "string" },
                    },
                    required: ["amount", "unit", "name"],
                  },
                },
                instructions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Step-by-step preparation instructions.",
                },
              },
              required: ["meal_type", "name", "emoji", "description", "calories", "protein_g", "carbs_g", "fat_g", "ingredients", "instructions"],
            },
          },
        },
        required: ["meals"],
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
  {
    type: "function",
    function: {
      name: "update_memory",
      description: "Persist something important the user just revealed about themselves that isn't already captured in their profile. Only call when the user volunteers genuinely new persistent information: an injury or physical constraint, a training preference, a lifestyle fact (shift work, travel, etc.), or a correction to something you got wrong. Do NOT call for workout results, food logged today, goal changes (use set_goals for that), or anything already in the context blocks.",
      parameters: {
        type: "object",
        properties: {
          updates: {
            type: "object",
            description: "Keys to merge into user memory. Each value overwrites the previous. Valid keys: injuries (physical constraints), preferences (training likes/dislikes), lifestyle (work schedule, travel, etc.), notes (anything else persistent).",
            additionalProperties: { type: "string" },
          },
        },
        required: ["updates"],
      },
    },
  },
];

async function mapToolCallToAction(
  tc: { name: string; arguments: string },
  validWorkoutIds: Set<string>,
  validRecipeIds: Set<string>,
  authHeader: string,
  supabaseUrl: string,
  clientContext: { customMemory?: string; customResponseStyle?: string },
): Promise<object | null> {
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
      case "set_goals": {
        if (typeof args.goal_type !== "string" || typeof args.target_text !== "string" || !args.target_text.trim()) {
          console.warn("[ai-coach] Invalid set_goals payload:", args);
          return null;
        }
        return {
          type: "set_goals",
          payload: {
            goal_type: args.goal_type,
            target_text: args.target_text.trim(),
            target_date: args.target_date ?? null,
          },
        };
      }
      case "recommend_workout": {
        const source = args.source;

        if (source === "catalogue") {
          if (typeof args.id !== "string" || !validWorkoutIds.has(args.id)) {
            console.warn("[ai-coach] Hallucinated workout UUID:", args.id);
            return null;
          }
          return { type: "recommend_workout", payload: { source: "catalogue", id: args.id, name: args.name } };
        }

        if (source === "ai_generated") {
          if (!args.intent || typeof args.intent !== "string") {
            console.warn("[ai-coach] recommend_workout ai_generated missing intent");
            return null;
          }
          try {
            const genRes = await fetch(`${supabaseUrl}/functions/v1/generate-ai-workout`, {
              method: "POST",
              headers: { Authorization: authHeader, "Content-Type": "application/json" },
              body: JSON.stringify({
                intent: args.intent,
                customMemory: clientContext.customMemory ?? "",
                customResponseStyle: clientContext.customResponseStyle ?? "",
              }),
            });
            if (!genRes.ok) {
              console.warn("[ai-coach] generate-ai-workout failed:", genRes.status);
              return null;
            }
            const { workout } = await genRes.json();
            if (!workout?.title || !Array.isArray(workout?.exercises)) {
              console.warn("[ai-coach] generate-ai-workout returned invalid shape");
              return null;
            }
            return {
              type: "recommend_workout",
              payload: {
                source: "ai_generated",
                title: workout.title,
                description: workout.description ?? "",
                exercises_snapshot: workout.exercises,
                estimated_duration_minutes: workout.estimated_duration_minutes,
                estimated_calories: workout.estimated_calories,
              },
            };
          } catch (err) {
            console.error("[ai-coach] generate-ai-workout fetch error:", err);
            return null;
          }
        }

        // No valid source
        console.warn("[ai-coach] recommend_workout missing or unknown source:", source);
        return null;
      }
      case "recommend_workout_plan": {
        if (!args.intent || typeof args.intent !== "string") {
          console.warn("[ai-coach] recommend_workout_plan missing intent");
          return null;
        }
        if (typeof args.daysPerWeek !== "number" || args.daysPerWeek < 1 || args.daysPerWeek > 7) {
          console.warn("[ai-coach] recommend_workout_plan invalid daysPerWeek:", args.daysPerWeek);
          return null;
        }
        if (!args.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(args.startDate)) {
          console.warn("[ai-coach] recommend_workout_plan invalid startDate:", args.startDate);
          return null;
        }
        try {
          const planRes = await fetch(`${supabaseUrl}/functions/v1/generate-ai-workout-plan`, {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({
              intent: args.intent,
              daysPerWeek: args.daysPerWeek,
              startDate: args.startDate,
              customMemory: clientContext.customMemory ?? "",
              customResponseStyle: clientContext.customResponseStyle ?? "",
            }),
          });
          if (!planRes.ok) {
            console.warn("[ai-coach] generate-ai-workout-plan failed:", planRes.status);
            return null;
          }
          const { plan } = await planRes.json();
          if (!plan?.title || !Array.isArray(plan?.workouts) || plan.workouts.length === 0) {
            console.warn("[ai-coach] generate-ai-workout-plan returned invalid shape");
            return null;
          }
          return {
            type: "recommend_workout_plan",
            payload: {
              title: plan.title,
              goal: plan.goal ?? "",
              start_date: plan.start_date,
              workouts: plan.workouts,
            },
          };
        } catch (err) {
          console.error("[ai-coach] generate-ai-workout-plan fetch error:", err);
          return null;
        }
      }
      case "recommend_recipe": {
        if (typeof args.id !== "string" || !validRecipeIds.has(args.id)) {
          console.warn("[ai-coach] Hallucinated recipe UUID:", args.id);
          return null;
        }
        return { type: "recommend_recipe", payload: { id: args.id, name: args.name } };
      }
      case "recommend_meal_plan": {
        if (!Array.isArray(args.meals) || args.meals.length === 0) {
          console.warn("[ai-coach] recommend_meal_plan: empty meals array");
          return null;
        }
        return { type: "recommend_meal_plan", payload: { meals: args.meals } };
      }
      case "body_scan_prompt":
        return { type: "body_scan_prompt" };
      case "update_memory": {
        if (!args.updates || typeof args.updates !== "object") {
          console.warn("[ai-coach] update_memory missing updates");
          return null;
        }
        const allowedKeys = new Set(["injuries", "preferences", "lifestyle", "notes"]);
        for (const [key, value] of Object.entries(args.updates)) {
          if (!allowedKeys.has(key) || typeof value !== "string") continue;
          await supabaseAdmin.rpc("upsert_user_memory_key", {
            p_user_id: userId,
            p_key: key,
            p_value: value,
          });
        }
        return null; // silent — no card shown to user
      }
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
  authHeader: string,
  supabaseUrl: string,
  clientContext: { customMemory?: string; customResponseStyle?: string },
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

        // Emit validated tool calls as action chunks after text has fully streamed.
        // mapToolCallToAction is async because ai_generated sources make internal fetches.
        for (const [, tc] of toolCalls) {
          const action = await mapToolCallToAction(tc, validWorkoutIds, validRecipeIds, authHeader, supabaseUrl, clientContext);
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
      { data: recentBodyScans },
    ] = await Promise.all([
      supabase.from('profiles').select('*, user_memory').eq('user_id', userId).maybeSingle(),
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
      (supabase as any).from('body_scans').select('estimated_body_fat, confidence_level, scanned_at, analysis').eq('user_id', userId).order('scanned_at', { ascending: false }).limit(2),
    ]);

    // Fetch active goal separately so errors are visible and we can fall back gracefully.
    // First try: is_active=true (current goal). Fallback: most recent goal regardless of flag.
    let activeGoal: { goal_type: string; target_text: string; target_date: string | null; set_at: string } | null = null;
    {
      const { data, error } = await (supabaseAdmin as any)
        .from('user_goals')
        .select('goal_type, target_text, target_date, set_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('set_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('[ai-coach] user_goals query error:', error.message ?? error);
      }
      if (data) {
        activeGoal = data;
      } else {
        // Fallback: is_active flag may be wrong — get most recent goal by date
        const { data: fallback } = await (supabaseAdmin as any)
          .from('user_goals')
          .select('goal_type, target_text, target_date, set_at')
          .eq('user_id', userId)
          .order('set_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fallback) activeGoal = fallback;
      }
    }

    const todayBoundary = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
    const { data: todayMealLogs } = await supabase
      .from('meal_logs')
      .select('custom_name, category, calories, protein_grams, carbs_grams, fat_grams, logged_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('logged_at', todayBoundary)
      .order('logged_at', { ascending: true });

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

    if (todayMealLogs && todayMealLogs.length > 0) {
      const totals = todayMealLogs.reduce(
        (acc: { calories: number; protein: number; carbs: number; fat: number }, m: { calories: number | null; protein_grams: number | null; carbs_grams: number | null; fat_grams: number | null }) => ({
          calories: acc.calories + (m.calories || 0),
          protein: acc.protein + (m.protein_grams || 0),
          carbs: acc.carbs + (m.carbs_grams || 0),
          fat: acc.fat + (m.fat_grams || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      userContext += `\n═══ TODAY'S FOOD DIARY ═══\n`;
      for (const m of todayMealLogs) {
        const time = m.logged_at ? m.logged_at.substring(11, 16) : '??:??';
        userContext += `• ${time} UTC — ${m.custom_name} (${m.category}): ${m.calories || 0} cal, ${m.protein_grams || 0}g protein, ${m.carbs_grams || 0}g carbs, ${m.fat_grams || 0}g fat\n`;
      }
      userContext += `Daily totals so far: ${Math.round(totals.calories)} cal | ${Math.round(totals.protein)}g protein | ${Math.round(totals.carbs)}g carbs | ${Math.round(totals.fat)}g fat\n`;
      userContext += `⚠️ THIS DIARY IS THE ONLY SOURCE OF TRUTH for what the user has eaten today. When answering questions about today's intake or calories consumed, use ONLY these entries. Chat messages that say "Logged X as Y (Z cal)" are confirmation receipts — do NOT count them as additional food; they are already included above.\n`;
    } else {
      userContext += `\n═══ TODAY'S FOOD DIARY ═══\nNo food logged today yet.\n`;
    }

    // ─── Build user-MD block (goal + body scan) ───
    // Assembled fresh each request from user_goals and body_scans queries above.
    // Injected at position-0 (fallback) AND spliced near the final user turn (authoritative).
    let userMD = '';
    {
      const latestScan = recentBodyScans?.[0] ?? null;
      const prevScan = recentBodyScans?.[1] ?? null;

      // Prefer user_goals (has full target text); fall back to workout_preferences.workout_goal
      // so the AI always sees the goal even if the user_goals query returned null.
      const goalLine = activeGoal
        ? `• Active goal: ${activeGoal.goal_type} — "${activeGoal.target_text}"${activeGoal.target_date ? ` (target ${activeGoal.target_date})` : ''}`
        : workoutPrefs?.workout_goal
          ? `• Active goal: ${workoutPrefs.workout_goal}`
          : '• Active goal: not yet set';

      let scanLines = '';
      if (latestScan) {
        const scanDate = latestScan.scanned_at ? latestScan.scanned_at.substring(0, 10) : 'unknown date';
        const bf = latestScan.estimated_body_fat != null ? `${latestScan.estimated_body_fat}%` : 'unknown';
        const a = latestScan.analysis as any;
        const bodyType = a?.bodyType ?? null;
        const md = a?.muscleDevelopment;
        const mdSummary = md
          ? `upper=${md.upper_body}, core=${md.core}, lower=${md.lower_body}`
          : null;
        const obs = Array.isArray(a?.keyObservations) ? a.keyObservations[0] : null;
        const rec = Array.isArray(a?.recommendations) ? a.recommendations[0] : null;

        scanLines += `• Latest body scan (${scanDate}): body fat ${bf}${latestScan.confidence_level ? ` (${latestScan.confidence_level} confidence)` : ''}`;
        if (bodyType) scanLines += `, body type: ${bodyType}`;
        if (mdSummary) scanLines += `\n• Muscle development: ${mdSummary}`;
        if (obs) scanLines += `\n• Key observation: ${obs}`;
        if (rec) scanLines += `\n• Top recommendation: ${rec}`;

        if (prevScan && prevScan.estimated_body_fat != null && latestScan.estimated_body_fat != null) {
          const prevDate = prevScan.scanned_at ? prevScan.scanned_at.substring(0, 10) : 'previous scan';
          const direction = latestScan.estimated_body_fat < prevScan.estimated_body_fat ? 'down' : 'up';
          scanLines += `\n• Body-fat trend: ${prevScan.estimated_body_fat}% → ${latestScan.estimated_body_fat}% (${direction} since ${prevDate})`;
        }
      } else {
        scanLines = '• Body scan: no scan on record yet';
      }

      userMD = `\n═══ USER PROFILE / MEMORY ═══\n${goalLine}\n${scanLines}\n`;
    }

    // Position-0 fallback: append compact MD to the userContext string
    userContext += userMD;

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

    // ─── Render user_memory as a synthetic assistant turn ───
    // Injected at position 1 (after system prompt, before any history) so Gemini
    // treats it as its own prior recall rather than injected database content.
    const rawMemory = (profile as any)?.user_memory ?? {};
    const memoryParts: string[] = [];
    // Prefer user_memory.goal; fall back to workoutPrefs so the synthetic turn always
    // includes the goal even before the user re-runs the wizard with the new code.
    const goalForMemory = rawMemory.goal
      || (activeGoal ? `${activeGoal.goal_type} — "${activeGoal.target_text}"` : null)
      || workoutPrefs?.workout_goal
      || null;
    if (goalForMemory) memoryParts.push(`Current goal: ${goalForMemory}`);
    if (rawMemory.physique) memoryParts.push(`Body scan — ${rawMemory.physique}`);
    if (rawMemory.injuries) memoryParts.push(`Physical notes: ${rawMemory.injuries}`);
    if (rawMemory.preferences) memoryParts.push(`Preferences: ${rawMemory.preferences}`);
    if (rawMemory.lifestyle)   memoryParts.push(`Lifestyle: ${rawMemory.lifestyle}`);
    if (rawMemory.notes)       memoryParts.push(rawMemory.notes);
    const userMemoryTurn: string | null = memoryParts.length > 0
      ? `Here's what I know about ${nameForReminder !== 'there' ? nameForReminder : 'you'}: ${memoryParts.join('. ')}.`
      : null;

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

    // Inject user_memory as a synthetic assistant turn at position 1.
    // Position 1 (immediately after the system prompt, before any real history) makes it
    // look like the oldest thing Jarvis said. The model treats its own prior turns as recall,
    // not as injected data — so it answers goal/physique questions correctly without denial.
    if (userMemoryTurn) {
      apiMessages.splice(1, 0, { role: "assistant", content: userMemoryTurn });
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

    // Splice the user-MD as a standalone system message immediately before the final user turn.
    // This is the authoritative copy — position near end ensures it outweighs any stale context.
    if (userMD.trim()) {
      apiMessages.splice(apiMessages.length - 1, 0, {
        role: "system",
        content: userMD.trim(),
      });
    }

    // Splice today's food diary as background context immediately before the final user turn.
    // Data only — no instruction to report intake. Intake questions are handled deterministically
    // by the client (A26) before they ever reach this function.
    if (todayMealLogs && todayMealLogs.length > 0) {
      const diaryTotals = todayMealLogs.reduce(
        (acc: { calories: number; protein: number; carbs: number; fat: number }, m: any) => ({
          calories: acc.calories + (m.calories || 0),
          protein: acc.protein + (m.protein_grams || 0),
          carbs: acc.carbs + (m.carbs_grams || 0),
          fat: acc.fat + (m.fat_grams || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      const diaryLines = todayMealLogs.map((m: any) => {
        const time = m.logged_at ? m.logged_at.substring(11, 16) : '??:??';
        return `• ${time} UTC — ${m.custom_name} (${m.category}): ${m.calories || 0} cal, ${m.protein_grams || 0}g protein, ${m.carbs_grams || 0}g carbs, ${m.fat_grams || 0}g fat`;
      }).join('\n');
      apiMessages.splice(apiMessages.length - 1, 0, {
        role: "system",
        content: `TODAY'S FOOD DIARY (background context — what the user has eaten today):\n${diaryLines}\nDaily totals: ${Math.round(diaryTotals.calories)} cal | ${Math.round(diaryTotals.protein)}g protein | ${Math.round(diaryTotals.carbs)}g carbs | ${Math.round(diaryTotals.fat)}g fat`,
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
        validRecipeIds,
        authHeader,
        supabaseUrl,
        { customMemory, customResponseStyle: customResponse },
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
