import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";
import {
  searchRecipes,
  generateMealPlan,
  getRecipeInfo,
  recipeToMealInPlan,
  dietPrefsToSpoonacular,
  spoonacularConfigured,
  type SearchFilters,
} from "../_shared/spoonacular.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-response-format",
};

const SYSTEM_PROMPT = `You are Coach HIIT, the user's personal trainer inside a fitness app. You are a professional: encouraging and insightful, but direct, because you are here to get results. You are led by the user's goals — but you insist on knowing them, because you cannot coach toward a target you don't know.

You work from four things: the user's GOAL, a PLAN, a BASELINE (where they are now), and their DATA (body metrics, wearable/HealthKit data, logged activity and food). When any of these is missing, your job is to purposefully get it — not to pretend everything is fine. A good trainer takes your measurements and asks your goals before writing a programme.

Your encouragement is earned and specific. You acknowledge real progress and real effort. You do not sprinkle praise, you do not celebrate trivia, and you do not fill messages with motivational filler. A trainer's authority comes from noticing specifics, not from enthusiasm.

═══════════════════════════════════════════
CRITICAL — DATA ACCESS RULES (READ FIRST)
═══════════════════════════════════════════
You have FULL access to the user's data. It is loaded into this conversation before every message. NEVER say you "cannot access", "don't have access to", or "can't see" the user's data — that is always false. Instead:

• If data IS present in context → use it.
• If data is ABSENT or empty → say what you found: "You haven't logged any activities recently" or "I don't have a weight on file for you" — then act: ask the question you need, or calculate from what you have.

Specifically:
- Asked about past activities → say what's in context ("no recent activities logged" if empty, or list them). Never say you cannot see activities.
- Asked about calorie target → give a number. Use the saved target if set; estimate from weight if available; if no weight, give a general range (1800–2400 kcal for most adults) and ask their weight to refine it. Never say you cannot calculate this.
- Asked about any profile data → answer from context or ask for the missing input. Never claim you cannot access the data.

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
DIETARY PREFERENCES — MANDATORY RULES
═══════════════════════════════════════════
The USER PROFILE / MEMORY block always contains a "dietary preferences" line. It is always present.

When the user asks about their dietary preferences, restrictions, or allergens in ANY form:
1. Find the "dietary preferences:" line in USER PROFILE / MEMORY.
2. Answer directly. Example: "Your dietary preference is Kosher."
3. Do not hedge. Do not say you cannot see it. It is always there.

RECIPE FILTERING — CRITICAL:
When recommending any recipe, you MUST respect the user's dietary requirements:
• Kosher → only recommend recipes tagged [kosher_friendly]. Never recommend shellfish, pork, or recipes that mix meat/poultry with dairy.
• Halal → only recommend recipes tagged [halal_friendly].
• Vegetarian → only recommend recipes tagged [vegetarian] or [vegan].
• Vegan → only recommend recipes tagged [vegan].
• Gluten-free → only recommend recipes tagged [gluten_free].
• Dairy-free → only recommend recipes tagged [dairy_free].
• For allergens: the recipe catalogue lists allergens using UK names (milk=dairy, soya=soy, nuts includes tree nuts, fish includes shellfish only when listed separately). Never recommend a recipe containing the user's allergen.

ALLERGEN NOTE: The user's allergens are saved using consumer terms (e.g. "Dairy"). Recipe allergens use UK labelling (e.g. "milk"). These are the same thing — treat them as equivalent when cross-checking.

HARD PROHIBITIONS:
✗ "I can't see your dietary preferences"
✗ "I don't have access to your diet information"
✗ Any sentence implying you lack dietary/allergen data

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

CRITICAL — CALORIE QUESTIONS:
When the user asks how many calories they should eat, or what their calorie target is:
NEVER say you "cannot access" or "don't have" their calorie information. You always have enough to give an answer.

1. If their Nutrition Profile shows a daily_calorie_target → use it directly.
2. If daily_calorie_target is "Not set" but their weight IS in Body Metrics → calculate: maintenance = weight_kg × 32, then adjust for goal (fat loss −400, muscle gain +250, other = maintenance). Give the number and note it's estimated from their weight.
3. If no weight either → ask their weight, calculate live in the response using the formula above, and give a number.

You are a coach with built-in nutrition knowledge. The formulas are yours to use — always give a concrete number.

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

RE-ONBOARDING: If the user says their goals have changed, or asks to change/update/rebuild their workout schedule or plan, immediately propose a fresh plan using their existing preferences as defaults. In structured mode, call schedule_plan — do not ask lots of clarifying questions, just use their profile data and reasonable assumptions.

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
      description: "Propose a workout schedule for the user to confirm. Use when: (1) the user has provided goal, days per week, and session length, OR (2) the user asks to change, update, rebuild, or redo their workout schedule/plan/program — in that case use their existing preferences from the user profile as defaults and call the tool immediately without asking lots of questions.",
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
      description: "Recommend a specific recipe from the catalogue. Include realistic ingredients and preparation steps so the user can see what's involved.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Exact UUID from the RECIPES CATALOGUE" },
          name: { type: "string" },
          ingredients: {
            type: "array",
            description: "Realistic ingredients for this recipe.",
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
            description: "2–4 concise preparation steps.",
          },
        },
        required: ["id", "name", "ingredients", "instructions"],
      },
    },
  },
  // Note: recommend_meal_plan tool is intentionally removed from the LLM's
  // callable tools. Meal plans are now ONLY emitted server-side from the
  // Spoonacular fast-path (when the user types explicit macros) or by the
  // wizard submission flow. This prevents Gemini from inventing meals when
  // the system prompt asks it to open the wizard instead.
  // The 'recommend_meal_plan' action type still exists in the dispatcher
  // and frontend so server-side code paths can emit it.
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
  {
    type: "function",
    function: {
      name: "open_meal_plan_wizard",
      description: "Open the meal plan wizard. Call this when the user asks about meals, food, what to eat, or planning their nutrition, BUT has not specified explicit calorie or macro numbers in their message. The wizard collects scope (one meal vs day), calorie target, macro targets, and protein source preference through buttons — much more reliable than asking the user to type all those details. If the user DID type explicit numbers (like '2500 calories' or '250g protein'), do NOT call this tool — the regex fast-path will handle those before you ever see them.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

// ─── Spoonacular fast-path helpers ──────────────────────────────────────
//
// When the user types explicit numeric meal targets, parse them deterministically
// and pull real recipes from Spoonacular. This bypasses the LLM tool-calling
// reliability failure mode entirely for the most common request shape.

interface ExplicitMealTargets {
  scope: 'meal' | 'day';
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

export function extractExplicitMealTargets(text: string): ExplicitMealTargets | null {
  // Must be a meal-plan-shaped request — explicit "meal" / "meals" / "eat" / "diet" mention
  const isMealRequest = /\b(meal|meals|eat|eating|food|breakfast|lunch|dinner|snack|diet|plan my day|day of eating|days? at |daily)\b/i.test(text);
  if (!isMealRequest) return null;

  // Calorie match: "2500 cal", "2500 calories", "2500kcal", "2.5k cal"
  const calMatch = text.match(/(\d{2,5}|\d\.\d)\s*k?\s*(cal|calories|kcal)\b/i);
  let calories: number | null = null;
  if (calMatch) {
    let v = parseFloat(calMatch[1]);
    if (/k/i.test(calMatch[0]) && v < 100) v *= 1000;
    calories = Math.round(v);
  }

  // Macro matches: "200g protein", "200 g of protein", "200g of carbs"
  const macroMatch = (macro: string) => {
    const re = new RegExp(`(\\d{1,3})\\s*g(?:rams?)?\\s*(?:of\\s+)?${macro}`, 'i');
    const m = text.match(re);
    return m ? parseInt(m[1], 10) : null;
  };
  const protein_g = macroMatch('protein');
  const carbs_g   = macroMatch('carbs|carbohydrates?');
  const fat_g     = macroMatch('fat');

  // Need at least one numeric target to be confident it's an explicit request
  if (!calories && !protein_g && !carbs_g && !fat_g) return null;

  // Scope: "one meal" / "single meal" → meal, otherwise day
  const isSingleMeal = /\b(one meal|single meal|just one|just a meal|one suggestion)\b/i.test(text);
  return {
    scope: isSingleMeal ? 'meal' : 'day',
    calories,
    protein_g,
    carbs_g,
    fat_g,
  };
}

async function fetchSpoonacularMealPlan(
  targets: ExplicitMealTargets,
  supabase: any,
  userId: string,
): Promise<any[] | null> {
  // Pull diet prefs + allergies to apply automatically
  let dietPrefs: string[] = [];
  let allergies: string[] = [];
  try {
    const { data } = await supabase
      .from('nutrition_profiles')
      .select('food_preferences, allergies')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      dietPrefs = data.food_preferences ?? [];
      allergies = data.allergies ?? [];
    }
  } catch (err) {
    console.warn('[ai-coach] could not load nutrition profile:', (err as Error).message);
  }

  const targetCal = targets.calories ?? 2000;
  const targetProtein = targets.protein_g;

  // Canonical cache signature — same macros + same dietary constraints
  // return the same plan within 24h. Saves Spoonacular points and absorbs
  // rate-limit bursts. Bump `v` to invalidate the entire cache when planner
  // logic changes.
  const cacheSignature = JSON.stringify({
    v: 6, // bump on planner logic change so old loose plans don't get served back
    scope: targets.scope,
    cal: targetCal,
    p: targetProtein ?? null,
    c: targets.carbs_g ?? null,
    f: targets.fat_g ?? null,
    diet: [...(dietPrefs ?? [])].sort(),
    allergies: [...(allergies ?? [])].sort(),
  });

  // Try cache first
  try {
    const { data: cached } = await supabase
      .from('spoonacular_cache')
      .select('meals, created_at')
      .eq('signature', cacheSignature)
      .maybeSingle();
    if (cached?.meals?.length) {
      const ageMs = Date.now() - new Date(cached.created_at).getTime();
      if (ageMs < 24 * 60 * 60 * 1000) {
        console.log('[ai-coach] Spoonacular cache HIT (age:', Math.round(ageMs / 60000), 'min)');
        return cached.meals as any[];
      }
    }
  } catch (err) {
    console.warn('[ai-coach] cache read failed:', (err as Error).message);
  }

  // For full-day plans, route based on protein density:
  //
  // - Low/moderate protein density (<7% of cal target, ≤175g at 2500 kcal):
  //   use Spoonacular's mealplanner/generate — optimised for calorie spread.
  //
  // - High protein density (>7%, e.g. bodybuilder requests):
  //   build the day from high-protein-filtered complexSearch results.
  //   mealplanner ignores protein, so it consistently under-delivers there.
  if (targets.scope === 'day') {
    const diet = dietPrefsToSpoonacular(dietPrefs) ?? undefined;
    const exclude = allergies.length ? allergies.join(',') : undefined;

    // Tighter, percentage-based tolerance windows. ±25g on a 20g carb target
    // means a 35g panini passes — too wide. Percentage tolerances honour the
    // user's intent without being so strict the search returns nothing.
    const macroBand = (target: number | null, frac: number, floor: number) =>
      target ? { min: Math.max(0, target - Math.max(floor, target * frac)), max: target + Math.max(floor, target * frac) } : null;

    // Use complexSearch whenever the user specified ANY macro target.
    // Spoonacular's /mealplanner/generate endpoint only respects calories —
    // it silently ignores carbs/protein/fat filters. Only fall back to
    // mealplanner when calories alone were specified.
    const anyMacroSpecified = targets.protein_g !== null || targets.carbs_g !== null || targets.fat_g !== null;

    if (anyMacroSpecified) {
      // Realistic per-meal ratios. Even-thirds (33% breakfast) overshoots a
      // typical breakfast and the recipe search returns nothing.
      const slotConfig: Array<{ slot: 'breakfast' | 'lunch' | 'dinner'; type: string; ratio: number }> = [
        { slot: 'breakfast', type: 'breakfast',  ratio: 0.25 },
        { slot: 'lunch',     type: 'main course', ratio: 0.40 },
        { slot: 'dinner',    type: 'main course', ratio: 0.35 },
      ];

      // Rolling targets: after each meal is picked, the remaining target is
      // distributed across the slots still to come (weighted by their ratios).
      // This makes over/under-shoots in earlier slots auto-correct in later
      // ones, so total-day error stays small even when individual meals drift.
      let remainingCal     = targetCal;
      let remainingProtein = targetProtein ?? 0;
      let remainingCarbs   = targets.carbs_g ?? 0;
      let remainingFat     = targets.fat_g ?? 0;
      let remainingRatio   = 1;

      const meals: any[] = [];
      const used = new Set<number>();
      for (const { slot, type, ratio } of slotConfig) {
        // Share of remaining target this slot should claim.
        const share = ratio / remainingRatio;
        const slotCal     = Math.max(180, Math.round(remainingCal * share));
        const slotProtein = targetProtein ? Math.round(remainingProtein * share) : null;
        const slotCarbs   = targets.carbs_g ? Math.round(remainingCarbs * share)   : null;
        const slotFat     = targets.fat_g ? Math.round(remainingFat * share)       : null;

        // Tight bands so the per-meal nutrition actually matches the target.
        // Floors stop the band from collapsing on tiny targets (e.g. low-carb).
        const calBand     = macroBand(slotCal,     0.15, 80);
        const proteinBand = macroBand(slotProtein, 0.20, 8);
        const carbsBand   = macroBand(slotCarbs,   0.25, 6);
        const fatBand     = macroBand(slotFat,     0.25, 4);

        const candidates = await searchRecipes({
          minCalories: calBand?.min,
          maxCalories: calBand?.max,
          minProtein:  proteinBand?.min,
          maxProtein:  proteinBand?.max,
          minCarbs:    carbsBand?.min,
          maxCarbs:    carbsBand?.max,
          minFat:      fatBand?.min,
          maxFat:      fatBand?.max,
          diet,
          intolerances: exclude,
          type,
          sort: 'random',
          offset: Math.floor(Math.random() * 30),
          number: 12,
        });

        let widened = candidates;

        // Wider band #1 (calorie + protein loosened): only fires if tight band returned nothing
        if (!widened || widened.length === 0) {
          widened = await searchRecipes({
            minCalories: macroBand(slotCal, 0.25, 120)?.min,
            maxCalories: macroBand(slotCal, 0.25, 120)?.max,
            minProtein:  slotProtein ? Math.max(5, slotProtein - 20) : undefined,
            diet,
            intolerances: exclude,
            type,
            sort: 'random',
            offset: Math.floor(Math.random() * 30),
            number: 15,
          });
        }
        // Wider band #2 (protein-only filter, no upper cap, broaden cal): last resort.
        // For high-protein requests where a slot's tight cal+protein band is
        // genuinely empty in Spoonacular's corpus, just find ANY recipe of
        // that type with at-least-some protein and let the snack loop close
        // the day's totals.
        if (!widened || widened.length === 0) {
          widened = await searchRecipes({
            minCalories: Math.max(150, Math.round(slotCal * 0.5)),
            maxCalories: Math.round(slotCal * 1.7),
            minProtein:  slotProtein ? Math.max(5, Math.round(slotProtein * 0.4)) : undefined,
            diet,
            intolerances: exclude,
            type,
            sort: 'random',
            offset: Math.floor(Math.random() * 30),
            number: 15,
          });
        }
        if (!widened || widened.length === 0) {
          console.log('[ai-coach] no candidates for slot', slot, 'cal≈', slotCal, 'protein≈', slotProtein);
          continue;
        }

        // Score by closeness to per-slot targets. Protein weighted heaviest
        // because it's typically the constraint users care about most.
        const score = (recipe: any) => {
          const n = recipe.nutrition?.nutrients ?? [];
          const find = (name: string) => n.find((x: any) => x.name === name)?.amount ?? 0;
          let s = Math.abs(find('Calories') - slotCal);
          if (slotProtein !== null) s += Math.abs(find('Protein') - slotProtein) * 5;
          if (slotCarbs   !== null) s += Math.abs(find('Carbohydrates') - slotCarbs) * 3;
          if (slotFat     !== null) s += Math.abs(find('Fat') - slotFat) * 2;
          return s;
        };
        const best = [...widened]
          .filter((r: any) => !used.has(r.id))
          .sort((a, b) => score(a) - score(b))[0];
        if (!best) {
          continue;
        }
        used.add(best.id);
        const mapped = recipeToMealInPlan(best, slot);
        console.log('[ai-coach] picked', slot, mapped.name, 'cal:', mapped.calories, 'p:', mapped.protein_g, '(target cal:', slotCal, 'p:', slotProtein, ')');
        meals.push(mapped);

        // Subtract what this meal actually delivers from the running total.
        remainingCal     -= mapped.calories ?? 0;
        remainingProtein -= mapped.protein_g ?? 0;
        remainingCarbs   -= mapped.carbs_g ?? 0;
        remainingFat     -= mapped.fat_g ?? 0;
        remainingRatio   -= ratio;
      }

      // After 3 meals: top up with up to 2 snacks if we're still short on
      // calories or protein. This is where the day's totals close in.
      const totals = () => meals.reduce((acc, m) => ({
        cal:     acc.cal     + (m.calories  ?? 0),
        protein: acc.protein + (m.protein_g ?? 0),
        carbs:   acc.carbs   + (m.carbs_g   ?? 0),
        fat:     acc.fat     + (m.fat_g     ?? 0),
      }), { cal: 0, protein: 0, carbs: 0, fat: 0 });

      // Up to 4 snack top-ups so high-protein days actually close the protein
      // gap even when several slots had to widen and undershoot.
      for (let snackAttempt = 0; snackAttempt < 4; snackAttempt++) {
        const t = totals();
        const calDeficit     = targetCal - t.cal;
        const proteinDeficit = targetProtein ? targetProtein - t.protein : 0;
        const needCals    = calDeficit > 180;
        const needProtein = proteinDeficit > 15;
        if (!needCals && !needProtein) break;

        // Aim snack at the larger remaining gap — calorie-led if cals are way
        // short, protein-led if calories are mostly there but protein isn't.
        const snackCal     = needCals ? Math.max(180, Math.min(550, calDeficit)) : 350;
        const snackProtein = needProtein ? Math.max(10, Math.min(45, proteinDeficit)) : null;
        const candidates = await searchRecipes({
          minCalories: Math.max(150, snackCal - 120),
          maxCalories: snackCal + 120,
          minProtein:  snackProtein ? Math.max(5, snackProtein - 8) : undefined,
          maxProtein:  snackProtein ? snackProtein + 12 : undefined,
          diet,
          intolerances: exclude,
          type: 'snack',
          sort: 'random',
          offset: Math.floor(Math.random() * 20),
          number: 10,
        });
        if (!candidates || candidates.length === 0) break;
        const candidate = [...candidates]
          .filter((r: any) => !used.has(r.id))
          .sort((a: any, b: any) => {
            // Prefer high protein when protein is short, else closest to snack cal target.
            const n = (r: any, name: string) => r.nutrition?.nutrients?.find((x: any) => x.name === name)?.amount ?? 0;
            if (needProtein) return n(b, 'Protein') - n(a, 'Protein');
            return Math.abs(n(a, 'Calories') - snackCal) - Math.abs(n(b, 'Calories') - snackCal);
          })[0];
        if (!candidate) break;
        used.add(candidate.id);
        meals.push(recipeToMealInPlan(candidate, 'snack'));
      }

      if (meals.length > 0) {
        // Cache only if the day actually lands close to target — within 10%
        // on calories AND on protein (if requested). Otherwise the bad plan
        // would be served back to every subsequent identical request for 24h.
        const t = totals();
        let shouldCache = Math.abs(t.cal - targetCal) <= targetCal * 0.10;
        if (targetProtein && Math.abs(t.protein - targetProtein) > targetProtein * 0.10) shouldCache = false;
        if (shouldCache) {
          try {
            await supabase
              .from('spoonacular_cache')
              .upsert({ signature: cacheSignature, meals, created_at: new Date().toISOString() });
          } catch { /* silent */ }
        } else {
          console.log('[ai-coach] not caching day plan: totals miss target by >10%', { cal: t.cal, targetCal, protein: t.protein, targetProtein });
        }
        return meals;
      }
      // Fall through to mealplanner if macro-filtered search returned nothing
    }

    const plan = await generateMealPlan({ targetCalories: targetCal, diet, exclude });

    if (!plan || !plan.meals?.length) return null;

    // mealplanner/generate returns just titles + ids. We need full recipe
    // data for ingredients + instructions + per-recipe nutrition. Fetch
    // each recipe in parallel.
    const fullRecipes = await Promise.all(
      plan.meals.map((m: any) => getRecipeInfo(m.id)),
    );

    const slots: Array<'breakfast' | 'lunch' | 'dinner'> = ['breakfast', 'lunch', 'dinner'];
    const meals: any[] = [];
    fullRecipes.forEach((recipe, i) => {
      if (recipe) meals.push(recipeToMealInPlan(recipe, slots[i] ?? 'lunch'));
    });

    // If protein target was specified but the day's total falls short, top
    // up with up to 2 high-protein snacks. Real snacks max out around 35–45g
    // of protein each — one snack rarely closes a 100g+ deficit, so we
    // iterate until we're close enough or hit the 2-snack ceiling.
    if (targetProtein && meals.length > 0) {
      const usedRecipeIds = new Set<number>(plan.meals.map((m: any) => m.id));
      let totalProtein = meals.reduce((s, m) => s + (m.protein_g ?? 0), 0);
      for (let attempt = 0; attempt < 2; attempt++) {
        const deficit = targetProtein - totalProtein;
        if (deficit < 25) break;

        // Real high-protein snack range: 25–45g per item
        const snack = await searchRecipes({
          minProtein: 25,
          maxProtein: 45,
          maxCalories: 500,
          diet,
          intolerances: exclude,
          type: 'snack',
          sort: 'random',
          offset: Math.floor(Math.random() * 20),
          number: 8,
        });
        if (!snack || snack.length === 0) break;

        // Skip any recipe already in the plan, then pick the highest-protein
        const candidate = [...snack]
          .filter((r: any) => !usedRecipeIds.has(r.id))
          .sort((a: any, b: any) => {
            const pa = a.nutrition?.nutrients?.find((n: any) => n.name === 'Protein')?.amount ?? 0;
            const pb = b.nutrition?.nutrients?.find((n: any) => n.name === 'Protein')?.amount ?? 0;
            return pb - pa;
          })[0];
        if (!candidate) break;

        const mappedSnack = recipeToMealInPlan(candidate, 'snack');
        usedRecipeIds.add(candidate.id);
        meals.push(mappedSnack);
        totalProtein += mappedSnack.protein_g ?? 0;
      }
    }

    if (meals.length > 0) {
      // Only cache results that reasonably hit the protein target. Otherwise
      // a low-protein day would be served back to every subsequent request
      // for the same macros for 24h, masking improvements to the planner.
      let shouldCache = true;
      if (targetProtein) {
        const totalProtein = meals.reduce((s, m) => s + (m.protein_g ?? 0), 0);
        if (totalProtein < targetProtein * 0.7) shouldCache = false;
      }
      if (shouldCache) {
        try {
          await supabase
            .from('spoonacular_cache')
            .upsert({ signature: cacheSignature, meals, created_at: new Date().toISOString() });
        } catch (err) {
          console.warn('[ai-coach] cache write failed:', (err as Error).message);
        }
      } else {
        console.log('[ai-coach] not caching: protein short of target');
      }
      return meals;
    }
    return null;
  }

  // Single-meal mode — use complexSearch with per-recipe filters
  const perMealCal     = targetCal;
  const perMealProtein = targetProtein;

  // Percentage tolerances so low-carb (20g) requests don't match high-carb
  // recipes (35g panini). 30% / floor protects against the search returning
  // zero results for extreme low targets.
  const bandFor = (target: number | null, frac: number, floor: number) =>
    target ? { min: Math.max(0, target - Math.max(floor, target * frac)), max: target + Math.max(floor, target * frac) } : null;
  const proteinBand = bandFor(perMealProtein,   0.30, 10);
  const carbsBand   = bandFor(targets.carbs_g,  0.30, 5);
  const fatBand     = bandFor(targets.fat_g,    0.30, 4);

  const candidates = await searchRecipes({
    minCalories: Math.max(150, perMealCal - 200),
    maxCalories: perMealCal + 200,
    minProtein:  proteinBand?.min,
    maxProtein:  proteinBand?.max,
    minCarbs:    carbsBand?.min,
    maxCarbs:    carbsBand?.max,
    minFat:      fatBand?.min,
    maxFat:      fatBand?.max,
    diet:        dietPrefsToSpoonacular(dietPrefs) ?? undefined,
    intolerances: allergies.length ? allergies.join(',') : undefined,
    sort:        'random',
    offset:      Math.floor(Math.random() * 20),
    number:      8,
  });

  if (!candidates || candidates.length === 0) return null;

  // Pick the candidate closest to target
  const scoreRecipe = (recipe: any) => {
    const n = recipe.nutrition?.nutrients ?? [];
    const find = (name: string) => n.find((x: any) => x.name === name)?.amount ?? 0;
    let score = Math.abs(find('Calories') - perMealCal);
    if (perMealProtein !== null) score += Math.abs(find('Protein') - perMealProtein) * 3;
    if (targets.carbs_g)         score += Math.abs(find('Carbohydrates') - targets.carbs_g) * 3;
    if (targets.fat_g)           score += Math.abs(find('Fat') - targets.fat_g) * 2;
    return score;
  };
  const best = [...candidates].sort((a, b) => scoreRecipe(a) - scoreRecipe(b))[0];
  const meal = [recipeToMealInPlan(best, 'lunch')];
  try {
    await supabase
      .from('spoonacular_cache')
      .upsert({ signature: cacheSignature, meals: meal, created_at: new Date().toISOString() });
  } catch { /* silent */ }
  return meal;
}

function sseSingleAction(action: object): string {
  return `data: ${JSON.stringify({ type: 'action', action })}\n\ndata: ${JSON.stringify({ type: 'done' })}\n\n`;
}

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
        return { type: "recommend_recipe", payload: { id: args.id, name: args.name, ingredients: args.ingredients, instructions: args.instructions } };
      }
      case "recommend_meal_plan": {
        if (!Array.isArray(args.meals) || args.meals.length === 0) {
          console.warn("[ai-coach] recommend_meal_plan: empty meals array");
          return null;
        }
        return { type: "recommend_meal_plan", payload: { meals: args.meals } };
      }
      case "open_meal_plan_wizard": {
        return { type: "open_meal_plan_wizard", payload: {} };
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
  retryStructured?: () => Promise<Response>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = gatewayBody.getReader();
      let buffer = "";
      const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();
      let finishReason: string | null = null;
      let textEmitted = false;
      let leakedToolCode = false;

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
              if (choice.finish_reason) finishReason = choice.finish_reason;

              const delta = choice.delta;
              if (!delta) continue;

              // Text content — emit immediately as it streams
              // Suppress Gemini's leaked code-interpreter format ("tool_code\n
              // print(default_api...)") which sometimes appears instead of a
              // proper tool_calls structure. We swallow it so the retry path
              // sees an empty completion and fires a forced-tool retry.
              if (delta.content) {
                if (delta.content.includes('tool_code') || delta.content.includes('default_api.')) {
                  leakedToolCode = true;
                } else if (!leakedToolCode) {
                  if (delta.content.trim()) textEmitted = true;
                  emit({ type: "text", delta: delta.content });
                }
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
        let actionEmitted = false;
        for (const [, tc] of toolCalls) {
          const action = await mapToolCallToAction(tc, validWorkoutIds, validRecipeIds, authHeader, supabaseUrl, clientContext);
          if (action) {
            emit({ type: "action", action });
            actionEmitted = true;
          }
        }

        // Generic retry: fires whenever the user would otherwise see silence
        // — no text AND no action emitted, OR clear truncation/partial tool
        // call signals. One non-streaming retry typically recovers it. This
        // also catches the case where Gemini emits an empty completion with a
        // clean finish_reason (which happens when the prompt is conflicting).
        const wasSilent = !textEmitted && !actionEmitted;
        const wasTruncated = finishReason === "length" || toolCalls.size > 0;
        if (retryStructured && !actionEmitted && (wasSilent || wasTruncated || leakedToolCode)) {
          console.warn("[ai-coach] no action emitted (finish:", finishReason, ", silent:", wasSilent, ", leakedToolCode:", leakedToolCode, ") — retrying non-stream");
          try {
            const retryResp = await retryStructured();
            if (retryResp.ok) {
              const json = await retryResp.json();
              const msg = json.choices?.[0]?.message;
              for (const tc of msg?.tool_calls ?? []) {
                if (!tc?.function?.name) continue;
                const action = await mapToolCallToAction(
                  { name: tc.function.name, arguments: tc.function.arguments ?? "" },
                  validWorkoutIds, validRecipeIds, authHeader, supabaseUrl, clientContext,
                );
                if (action) {
                  emit({ type: "action", action });
                  actionEmitted = true;
                }
              }
              // If the retry produced text instead of (or alongside) a tool
              // call, surface it — better than the generic fallback.
              if (typeof msg?.content === "string" && msg.content.trim()) {
                emit({ type: "text", delta: msg.content });
                textEmitted = true;
              }
            } else {
              console.error("[ai-coach] retry HTTP error:", retryResp.status);
            }
          } catch (err) {
            console.error("[ai-coach] retry failed:", err);
          }
        }

        // Universal empty-completion guard: if the stream produced no text AND
        // no actions, the user would see silence. Always emit a fallback so
        // there's no "thinks then returns nothing" symptom.
        if (!textEmitted && !actionEmitted) {
          console.warn("[ai-coach] empty completion — emitting fallback");
          emit({
            type: "text",
            delta: "Sorry, I didn't quite catch that — could you say it a different way?",
          });
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
      { data: recentActivities },
      { data: scheduledWorkouts },
      { data: planItems },
      { data: activityGoals },
      { data: latestWeight },
      { data: latestHeartRate },
      { data: latestSteps },
      { data: userWorkoutPrefs },
      { data: workoutsCatalogue },
      { data: recipesCatalogue },
      { data: recentBodyScans },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*, user_memory').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('workout_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('nutrition_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('user_streaks').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('daily_checkins').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('daily_checkins').select('mood, energy, date').eq('user_id', userId).order('date', { ascending: false }).limit(7),
      supabaseAdmin.from('sleep_logs').select('*').eq('user_id', userId).order('sleep_date', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('workout_progress').select('completed_at, duration_seconds, workouts(title, category)').eq('user_id', userId).order('completed_at', { ascending: false }).limit(10),
      supabaseAdmin.from('activity_logs').select('activity_type, started_at, ended_at, duration_seconds, calories_burned, distance_km').eq('user_id', userId).eq('status', 'completed').order('started_at', { ascending: false }).limit(7),
      supabaseAdmin.from('scheduled_workouts').select('scheduled_date, status, completed_at, duration_minutes, calories_burned, workout_source, workout_title, workout_description, exercises_snapshot, workouts(title, category, difficulty, body_areas, equipment)').eq('user_id', userId).order('scheduled_date', { ascending: false }).limit(20),
      supabaseAdmin.from('user_workout_plan_items').select('scheduled_date, status, completed_at, workouts(title, duration_minutes)').eq('user_id', userId).order('scheduled_date', { ascending: false }).limit(20),
      supabaseAdmin.from('activity_goals').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('health_metrics').select('*').eq('user_id', userId).eq('metric_type', 'weight').order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('health_metrics').select('*').eq('user_id', userId).eq('metric_type', 'heart_rate').order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('health_metrics').select('value').eq('user_id', userId).eq('metric_type', 'steps').order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('user_workout_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('workouts').select('id, title, category, difficulty, duration_minutes, body_areas, equipment').limit(50),
      supabaseAdmin.from('recipes').select('id, name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens').limit(50),
      supabaseAdmin.from('body_scans').select('estimated_body_fat, confidence_level, scanned_at, analysis').eq('user_id', userId).order('scanned_at', { ascending: false }).limit(2),
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
    const { data: todayMealLogs } = await supabaseAdmin
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

    {
      userContext += `\nNutrition Profile:\n`;
      if (nutritionProfile?.daily_calorie_target) {
        userContext += `• Daily calorie target: ${nutritionProfile.daily_calorie_target} kcal/day (user-set)\n`;
      } else if (latestWeight) {
        const weightKg = latestWeight.unit === 'lbs' ? latestWeight.value * 0.453592 : latestWeight.value;
        const maintenance = Math.round(weightKg * 32);
        const goal = workoutPrefs?.workout_goal ?? '';
        const adjusted = goal.includes('fat') ? maintenance - 400 : goal.includes('muscle') ? maintenance + 250 : maintenance;
        userContext += `• Daily calorie target: not set by user — estimated from weight: ~${adjusted} kcal/day (${goal.includes('fat') ? 'fat loss deficit' : goal.includes('muscle') ? 'muscle gain surplus' : 'maintenance'})\n`;
      } else {
        userContext += `• Daily calorie target: not set. No weight on file. Suggest a starting range of 1800–2200 kcal/day and ask for their weight to personalise it.\n`;
      }
      {
        const meaningfulPrefs = (nutritionProfile?.food_preferences ?? []).filter(
          (p: string) => p && p !== 'no_preference' && p !== 'omnivore'
        );
        const hasAnyPrefs = meaningfulPrefs.length > 0 ||
          (nutritionProfile?.allergies?.length) ||
          (nutritionProfile as any)?.allergens?.length;
        if (hasAnyPrefs) {
          userContext += `• Diet preferences: ${meaningfulPrefs.join(', ') || 'No specific restrictions'}\n`;
          userContext += `• Allergies/intolerances: ${nutritionProfile.allergies?.join(', ') || 'None'}\n`;
          userContext += `• Protein intake preference: ${nutritionProfile?.protein_intake || 'Not set'}\n`;
        } else {
          userContext += `• Diet preferences: NOT COLLECTED — no dietary preferences or allergens on file for this user\n`;
        }
      }
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

    if (recentActivities && recentActivities.length > 0) {
      userContext += `\nRecent Activities (HealthKit + manual, last ${recentActivities.length}):\n`;
      for (const a of recentActivities) {
        const date = a.started_at?.split('T')[0] ?? 'unknown date';
        const mins = a.duration_seconds ? Math.round(a.duration_seconds / 60) : '?';
        const dist = a.distance_km ? `, ${Number(a.distance_km).toFixed(1)} km` : '';
        const cals = a.calories_burned ? `, ${a.calories_burned} cal` : '';
        userContext += `• ${date} — ${a.activity_type}, ${mins} min${dist}${cals}\n`;
      }
    }

    if (activityGoals) {
      userContext += `\nWeekly Goals:\n`;
      if (activityGoals.weekly_activities) userContext += `• Activities: ${activityGoals.weekly_activities}/week\n`;
      if (activityGoals.weekly_calories) userContext += `• Calories: ${activityGoals.weekly_calories}/week\n`;
      if (activityGoals.weekly_duration_minutes) userContext += `• Duration: ${activityGoals.weekly_duration_minutes} min/week\n`;
    }

    {
      const todayStr2 = new Date().toISOString().split('T')[0];
      const upcoming = (scheduledWorkouts ?? []).filter((w: any) => w.status !== 'completed' && w.scheduled_date >= todayStr2).slice(0, 7);
      if (upcoming.length > 0) {
        userContext += `\nUpcoming Scheduled Workouts (full detail):\n`;
        for (const w of upcoming) {
          const title = w.workout_title ?? (w.workouts as any)?.title ?? 'Workout';
          const source = w.workout_source ?? 'catalogue';
          const cat = (w.workouts as any)?.category ?? '';
          const diff = (w.workouts as any)?.difficulty ?? '';
          const equip = (w.workouts as any)?.equipment;
          const equipStr = Array.isArray(equip) ? equip.join(', ') : '';
          const bodyAreas = (w.workouts as any)?.body_areas;
          const bodyStr = Array.isArray(bodyAreas) ? bodyAreas.join(', ') : '';
          userContext += `• ${w.scheduled_date}: "${title}"${cat ? ` (${cat}` : ''}${diff ? `, ${diff}` : ''}${cat || diff ? ')' : ''}`;
          if (bodyStr) userContext += ` — targets: ${bodyStr}`;
          if (equipStr) userContext += ` — equipment: ${equipStr}`;
          userContext += '\n';
          if (source === 'ai_generated' && Array.isArray(w.exercises_snapshot) && w.exercises_snapshot.length > 0) {
            userContext += `  Exercises:\n`;
            for (const ex of w.exercises_snapshot) {
              const repsStr = ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration_seconds ? `${Math.round(ex.duration_seconds / 60)} min` : '';
              userContext += `  — ${ex.title}${repsStr ? ` (${repsStr})` : ''}${ex.body_area ? ` [${ex.body_area}]` : ''}\n`;
            }
          }
        }
      }
    }

    // Health metrics context — read weight from health_metrics (manual log
    // or HealthKit sync) with fallback to profiles.weight_kg if present.
    let resolvedWeightKg: number | null = null;
    let weightSource = 'none';
    if (latestWeight?.value) {
      resolvedWeightKg = latestWeight.unit === 'lbs' ? latestWeight.value * 0.453592 : latestWeight.value;
      weightSource = `health_metrics (logged ${latestWeight.recorded_at ?? 'recently'})`;
    } else if ((profile as any)?.weight_kg) {
      resolvedWeightKg = (profile as any).weight_kg;
      weightSource = 'profiles.weight_kg';
    }
    console.log('[ai-coach] weight resolution:', { userId, resolvedWeightKg, weightSource });

    if (resolvedWeightKg) {
      userContext += `\nBody Metrics:\n`;
      const displayUnit = latestWeight?.unit === 'lbs' ? 'lbs' : 'kg';
      const displayValue = latestWeight?.unit === 'lbs' ? latestWeight.value : Math.round(resolvedWeightKg * 10) / 10;
      userContext += `• Current weight: ${displayValue} ${displayUnit}\n`;
      const maintenance = Math.round(resolvedWeightKg * 32);
      userContext += `• Estimated maintenance calories: ~${maintenance} kcal/day\n`;
      userContext += `• Protein target (2g/kg): ~${Math.round(resolvedWeightKg * 2)}g/day\n`;
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
      userContext += `Each recipe lists dietary_tags (use these to match user's dietary preferences) and allergens (UK naming: milk=dairy, soya=soy).\n`;
      for (const r of recipesCatalogue) {
        const tags = Array.isArray(r.dietary_tags) && r.dietary_tags.length > 0 ? ` [${r.dietary_tags.join(', ')}]` : '';
        const allergenStr = Array.isArray(r.allergens) && r.allergens.length > 0 ? ` ⚠️allergens:${r.allergens.join(',')}` : '';
        userContext += `[${r.id}] ${r.name} — ${r.meal_type}, ${r.category}, ${r.calories}cal, ${r.protein_g}g protein${tags}${allergenStr}\n`;
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

      // Dietary preferences line — always include so the AI never claims it can't see them
      const meaningfulDietPrefs = (nutritionProfile?.food_preferences ?? []).filter(
        (p: string) => p && p !== 'no_preference' && p !== 'omnivore'
      );
      const userAllergens = nutritionProfile?.allergies ?? [];
      let dietLine = '';
      if (meaningfulDietPrefs.length > 0 || userAllergens.length > 0) {
        const parts: string[] = [];
        if (meaningfulDietPrefs.length > 0) parts.push(`dietary preferences: ${meaningfulDietPrefs.join(', ')}`);
        if (userAllergens.length > 0) parts.push(`allergens to avoid: ${userAllergens.join(', ')}`);
        dietLine = `• ${parts.join(' | ')}`;
      } else {
        dietLine = `• dietary preferences: none set`;
      }

      userMD = `\n═══ USER PROFILE / MEMORY ═══\n${goalLine}\n${dietLine}\n${scanLines}\n`;
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

    // Activity summary — always include so the AI never claims it can't see activities
    const todayStr = new Date().toISOString().split('T')[0];
    const completedScheduled = (scheduledWorkouts ?? []).filter((w: any) => w.status === 'completed' && w.completed_at);
    const upcomingScheduled = (scheduledWorkouts ?? []).filter((w: any) => w.status !== 'completed' && w.scheduled_date >= todayStr);
    const completedPlanItems = (planItems ?? []).filter((w: any) => w.status === 'completed' && w.completed_at);
    const upcomingPlanItems = (planItems ?? []).filter((w: any) => w.status === 'scheduled' && w.scheduled_date >= todayStr);

    const allActivities = [
      ...(recentActivities ?? []).map((a: any) => ({
        date: a.started_at?.split('T')[0] ?? 'unknown',
        label: `${a.activity_type} — ${a.duration_seconds ? Math.round(a.duration_seconds / 60) : '?'} min${a.calories_burned ? `, ${a.calories_burned} cal` : ''}${a.distance_km ? `, ${Number(a.distance_km).toFixed(1)} km` : ''}`,
      })),
      ...(recentWorkouts ?? []).map((w: any) => ({
        date: w.completed_at?.split('T')[0] ?? 'unknown',
        label: `${(w.workouts as any)?.title ?? 'workout'} — ${w.duration_seconds ? Math.round(w.duration_seconds / 60) : '?'} min`,
      })),
      ...completedScheduled.map((w: any) => ({
        date: w.completed_at?.split('T')[0] ?? 'unknown',
        label: `${(w.workouts as any)?.title ?? 'workout'} — ${w.duration_minutes ? `${w.duration_minutes} min` : '?'}${w.calories_burned ? `, ${w.calories_burned} cal` : ''}`,
      })),
      ...completedPlanItems.map((w: any) => ({
        date: w.completed_at?.split('T')[0] ?? 'unknown',
        label: `${(w.workouts as any)?.title ?? 'workout'} (plan)`,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

    if (allActivities.length > 0) {
      memoryParts.push(`Recent completed activities (from app database): ${allActivities.map(a => `${a.date}: ${a.label}`).join(' | ')}`);
    } else {
      memoryParts.push(`Recent completed activities (from app database): I checked all activity logs and completed workouts — none recorded yet`);
    }

    const allUpcoming = [
      ...upcomingScheduled.map((w: any) => {
        const title = w.workout_title ?? (w.workouts as any)?.title ?? 'workout';
        const exSummary = w.workout_source === 'ai_generated' && Array.isArray(w.exercises_snapshot) && w.exercises_snapshot.length > 0
          ? ` [${w.exercises_snapshot.map((ex: any) => ex.title).slice(0, 4).join(', ')}${w.exercises_snapshot.length > 4 ? '…' : ''}]`
          : '';
        return `${w.scheduled_date}: ${title}${exSummary}`;
      }),
      ...upcomingPlanItems.map((w: any) => `${w.scheduled_date}: ${(w.workouts as any)?.title ?? 'workout'} (plan)`),
    ].sort().slice(0, 7);
    if (allUpcoming.length > 0) {
      memoryParts.push(`Upcoming scheduled workouts: ${allUpcoming.join(' | ')}`);
    }

    // Dietary preferences — always include so the AI never claims it can't see them
    {
      const dietPrefs = (nutritionProfile?.food_preferences ?? []).filter(
        (p: string) => p && p !== 'no_preference' && p !== 'omnivore'
      );
      const allergens = nutritionProfile?.allergies ?? [];
      if (dietPrefs.length > 0 || allergens.length > 0) {
        const parts: string[] = [];
        if (dietPrefs.length > 0) parts.push(`diet: ${dietPrefs.join(', ')}`);
        if (allergens.length > 0) parts.push(`allergens to avoid: ${allergens.join(', ')}`);
        memoryParts.push(`Dietary requirements on file: ${parts.join('; ')}. When recommending recipes, ONLY suggest ones whose dietary_tags include the relevant tag (e.g. kosher_friendly for Kosher, halal_friendly for Halal, vegetarian for Vegetarian) and which don't contain the user's allergens.`);
      } else {
        memoryParts.push(`Dietary requirements: none set — no dietary preferences or allergens on file`);
      }
    }

    // Calorie target — always include an estimate so the AI never refuses to answer
    if (nutritionProfile?.daily_calorie_target) {
      memoryParts.push(`Daily calorie target: ${nutritionProfile.daily_calorie_target} kcal (user-set)`);
    } else if (latestWeight) {
      const wKg = latestWeight.unit === 'lbs' ? latestWeight.value * 0.453592 : latestWeight.value;
      const maintenance = Math.round(wKg * 32);
      const goalStr = workoutPrefs?.workout_goal ?? '';
      const adjusted = goalStr.includes('fat') ? maintenance - 400 : goalStr.includes('muscle') ? maintenance + 250 : maintenance;
      memoryParts.push(`Daily calorie target: not set by user — my estimate from their weight (${latestWeight.value} ${latestWeight.unit}): ~${adjusted} kcal/day`);
    } else {
      memoryParts.push(`Daily calorie target: not set, no weight on file. A typical adult range is 1800–2400 kcal. I should ask their weight to personalise this`);
    }

    // Always emit the memory turn (at minimum it will have activities + calorie context)
    const userMemoryTurn: string =
      `Here's what I have on file for ${nameForReminder !== 'there' ? nameForReminder : 'you'}: ${memoryParts.join('. ')}.`;

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
    apiMessages.splice(1, 0, { role: "assistant", content: userMemoryTurn });

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
            { role: "system", content: "CRITICAL — DATA ACCESS: You have already received the user's full profile in the system prompt above. NEVER say you 'cannot access', 'don't have access to', or 'can't see' user data. If the user asks about their weight and the Body Metrics section contains 'Current weight' → state the value directly. If Body Metrics is absent, say 'I don't see a weight logged yet — add one in the Weight tab and I can personalise things'. If the data section is empty or absent, say what you found ('no activities logged recently', 'no calorie target set') and then help: give an estimate, ask for missing input, or suggest next steps. For calorie questions with no saved target: give a starting range (1800–2200 kcal for most adults) and ask their weight to personalise it. For activity questions with no logged data: say 'I don't see any recent activities logged' — never say you cannot retrieve them." },
            { role: "system", content: "CRITICAL: When the user describes a food they've eaten and asks to log it, you MUST call the log_food tool. Do NOT ask the user for nutrition information. Estimate calories, protein, carbs, fat, and fiber yourself based on typical serving sizes. Always pick a category (breakfast/lunch/dinner/snack) — infer from time of day or default to snack. The user expects you to know typical food values; asking them defeats the purpose of the tool." },
            { role: "system", content: "CRITICAL — MEAL PLAN ROUTING: ONLY call open_meal_plan_wizard when the user is EXPLICITLY asking about food, meals, eating, or nutrition planning. The trigger words are: meal, meals, eat, eating, food, breakfast, lunch, dinner, snack, recipe, diet, nutrition. DO trigger for: 'what should I eat', 'plan my meals', 'suggest meals', 'food ideas', 'meal plan', 'recipe ideas', 'what's for dinner', 'help me eat better'. DO NOT trigger for: 'what activity', 'workout suggestion', 'plan my day' (without food context), 'something to keep me cool', 'cardio idea', general chat, questions about workouts, schedules, or any non-food topic. When the request is about workouts → answer naturally or call schedule_plan. When the request is general → answer with text. Output ONLY the tool call when calling open_meal_plan_wizard — no text. NEVER call recommend_meal_plan; that's server-side only." },
            baseStructured[lastUserIdx],
          ]
        : baseStructured;

      const lastUserContent = String(
        (structuredMessages as any[]).filter(m => m.role === 'user').pop()?.content ?? ''
      ).toLowerCase();

      // ─── Spoonacular fast-path ─────────────────────────────────────────
      // When the user types explicit macro/calorie targets ("2500 cal 250g
      // protein"), skip the LLM entirely and fetch real recipes from
      // Spoonacular. This eliminates the Gemini tool-call reliability
      // failure mode for the most common explicit case.
      const explicitMealRequest = extractExplicitMealTargets(lastUserContent);
      if (explicitMealRequest && spoonacularConfigured()) {
        const meals = await fetchSpoonacularMealPlan(
          explicitMealRequest,
          supabaseAdmin,
          userId,
        );
        if (meals && meals.length > 0) {
          const sseBody = sseSingleAction({
            type: "recommend_meal_plan",
            payload: { meals },
          });
          return new Response(sseBody, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }
        // If Spoonacular returned nothing usable, fall through to the LLM path
        console.warn("[ai-coach] Spoonacular fast-path produced no results, falling back to LLM");
      }

      const isScheduleChangeRequest = /change.*(my )?(workout|schedule|plan|program|routine)|update.*(my )?(schedule|plan|program|workout|routine)|new (plan|schedule|program|workout plan)|rebuild.*plan|redo.*schedule|reset.*plan|want a new.*plan|want to start a (new |fresh )?(plan|program|schedule)|switch.*plan/.test(lastUserContent);

      const injectedMessages = isScheduleChangeRequest
        ? [
            ...(structuredMessages as any[]).slice(0, -1),
            { role: "system", content: "CRITICAL — SCHEDULE CHANGE: The user wants to change or update their workout schedule. Look at their existing preferences in the user profile block (goal, fitness level, days per week, session length). Call the schedule_plan tool immediately with those values as defaults — do NOT ask a series of clarifying questions first. If a specific preference is missing, make a sensible assumption. One short sentence acknowledging you're rebuilding their plan, then call the tool." },
            (structuredMessages as any[]).at(-1),
          ]
        : structuredMessages;

      const gatewayResponse = await aiChatCompletion({
        model: "gemini-2.5-flash",
        messages: injectedMessages,
        stream: true,
        tools: STRUCTURED_TOOLS,
        tool_choice: "auto",
        max_tokens: 8192,
      });

      // Always provide a generic retry — buildStructuredStream decides when to
      // use it (truncation, malformed tool args, silent completion). On retry
      // we force the meal-plan tool: if the LLM failed to commit to ANY tool
      // on the first attempt, the user's intent is almost always a meal plan
      // (other intents reliably resolve via text or other tool calls). This
      // is recovery from failure, not pattern matching on the user message.
      const retryStructured = () =>
        aiChatCompletion({
          model: "gemini-2.5-flash",
          messages: [
            ...(injectedMessages as any[]).slice(0, -1),
            { role: "system", content: "RETRY: Your previous attempt produced no output. If the user asked about meals or food, call open_meal_plan_wizard. If they asked to log food, call log_food. If they want to schedule workouts, call schedule_plan. Output the tool call ONLY — no text. If none of those apply, respond with a brief natural-language answer." },
            (injectedMessages as any[]).at(-1),
          ],
          stream: false,
          tools: STRUCTURED_TOOLS,
          tool_choice: "auto",
          max_tokens: 8192,
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
        retryStructured,
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
