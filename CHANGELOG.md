# HITT App Changelog

## [2026-06-16] — Daily AI insight card on home screen

- **AI Coach card wired up** — generates one personal sentence per day from real activity data; rule-based fallbacks for new users (no schedule, no sleep logs, no meals logged, no activity yet); cached in Supabase so the home screen never waits on an AI call
- **Stale-while-revalidate** — shows yesterday's insight instantly then refreshes in the background when a new day starts
- **Jarvis link removed** — the "See in Detail" button and fake "0:25 ago" timestamp are gone; card is now informational only

## [2026-06-16] — Fix stats grid: include GPS activities in weekly totals

- **Stats grid data fix** — GPS activities (runs, walks, cycling) were missing from the weekly stats because they go to `activity_logs` not `workout_progress`; now queries both tables and merges the results

## [2026-06-16] — Stats grid: multi-colour quadrant (ember · crimson · teal · gold)

- **Stats grid redesigned** — each card now has its own colour: ember (kcal), crimson (workouts), teal (minutes), gold (active days); softer per-card glow, white highlight line, dark semi-transparent icon chips

## [2026-06-16] — Build 183: Fix stats grid showing zero data

- **Stats grid data fix** — weekly stats (calories, workouts, minutes, active days) were always showing zero because the query filtered on `status = "completed"`, but neither GymTimer nor WorkoutPlayer write that field to `workout_progress`; now filters on `completed_at` not null, matching the pattern used by WeeklySummaryCard

## [2026-06-16] — Fix hold-to-finish on all activities

- **Hold to finish — iOS interruption fix** — tapping "hold to finish" no longer gets stuck if a call, notification, or system gesture interrupts the touch; applies to all gym timer sports (boxing, HIIT, yoga, etc.) and GPS activities (run, walk, cycling)

## [2026-06-16] — Build 182: Charged Orange Quadrant stats cards

- **Stats grid — Charged Orange** — all four weekly stats cards now use a full HIIT-orange gradient with the "Float" treatment: dark halo ring, orange glow shadow, golden top-highlight line, and white text throughout; value text size up to 30 px; labels now near-white (not muted grey)
- **Stats grid — card sizing** — gap widened to 20 px, min-height 108 px, matches the design spec exactly
- **GymTimer dep fix** — `ready` added to the interval effect dependency array so the countdown doesn't tick before the timer is initialised

## [2026-06-16] — Build 175: Hydration card, home reorder, sleep overhaul, Import Plan

- **Hydration home card** — moved out of health metrics into its own card with a progress ring and +250/500/750 ml quick-log buttons
- **Home page reordered** — Next Up → Nutrition → Recommended Meals → Hydration
- **Chat settings** (AI personalisation, voice, personal context) moved to the Jarvis header cog; removed from HIIT menu
- **Sleep home card** — now shows real HealthKit/logged data; manual bedtime/wake/quality log form for users without HealthKit; wizard CTA for first-time setup
- **Sleep dashboard** — sticky header, "Log Sleep" CTA correctly positioned above the nav bar, compact single-screen layout
- **Import Plan** — weekly repeat scheduling from start to end date, conflict modal (Replace / Add alongside / Cancel), Replace now wipes all sessions from today onwards, start date defaults to current Monday, date pickers no longer overlap on iOS

## [2026-06-14] — Hydration redesign: ring hero, vessel quick-add, weekly streak, today timeline

- **Progress ring** — large SVG ring shows daily intake vs. 2500 ml goal with a pacing chip (green = on track, orange = behind)
- **2×2 vessel quick-add grid** — tap Glass (250 ml), Mug (350 ml), Bottle (500 ml), or Flask (700 ml) to log instantly; + Custom opens a bottom sheet for any amount
- **Weekly streak chart** — 7-column bar chart with goal-hit highlights and consecutive-day streak counter
- **Today timeline** — chronological list of today's logs with vessel icon, time, and amount
- **Goal footer** — shows total log count + daily total with an Adjust link

## [2026-06-15] — Home screen refinement, activity detail page, triathlon share card

- **Stats grid updated** — cards are now dark graphite with warm-neon accents (orange, red, pink, amber) instead of coloured glass
- **Schedule card is now a hero card** — shows your next session with a Start button and Reschedule option; empty state has a full-width "Plan my week with AI" CTA
- **Recent Activity is now a swipeable carousel** — horizontal cards replace the stacked list; includes weekly progress bar
- **Activity detail page** — tapping an activity in the dashboard now opens a full detail screen showing duration, distance, calories, heart rate, intensity, route addresses, and notes (wherever data exists)
- **Triathlon Share button now works** — opens the same share card designer as all other sports, showing total time, distance, and calories
- **GPS denied on triathlon bike/run legs** — shows an "Open Settings" overlay instead of just a status badge
- **GPS denied on Routes Explorer** — banner with "Open Settings" button replaces silent London fallback
- **Ready? screen on all activities** — every sport, gym timer, workout player, and triathlon now shows a pre-start overlay before the session begins

## [2026-06-15] — Jarvis collects dietary preferences before generating meal plan

- **Jarvis now asks for your dietary requirements** before generating a meal plan if none are on file — no more generic plans
- Asks two questions: food allergies/intolerances and dietary style (vegan, vegetarian, pescatarian, etc.)
- Your answer is saved to your profile and the meal plan is generated immediately after
- If dietary prefs are already set, Jarvis goes straight to generating the plan

## [2026-06-11] — Schedule card selection; hold-to-finish text fix; completion screen exit

- **Tapping a workout in the schedule now selects it** (orange highlight) and reveals a play button — tapping play starts the workout; tapping again deselects
- **Hold-to-finish text no longer gets selected** when pressing and holding the button
- **Completion screen now has a sticky header** with an X button to close, plus a swipe-down gesture to dismiss

## [2026-06-10] — Fix: schedule daily view removed; hold-to-finish now saves AI workouts

- **Daily view removed from Workout Schedule** — weekly view is the only view now; simpler and always shows AI-generated workouts
- **Tapping a workout card now navigates correctly** — AI workouts route to GymTimer, catalogue workouts to the workout player
- **Hold to finish now works for AI workouts** — was a stale closure bug: the save function was frozen at mount before the workout data had loaded, so the AI save path was never reached; fixed

## [2026-06-10] — Fix: home screen crash on AI-generated workouts

- **ScheduleCard and WorkoutPlanCard no longer crash** when AI-generated scheduled workouts are present — both were accessing `workout.id/title` without null-checking; AI workouts have `workout_id: null` so the join returns null
- Both cards now use `workout_title` and `estimated_duration_minutes` as fallbacks
- Tapping an AI workout on the home screen now routes to GymTimer correctly

## [2026-06-10] — Fix: "View my schedule" 404 and plan insert RLS

- **"View my schedule" now navigates correctly** — was routing to `/schedule` (404); fixed to `/workout-schedule`
- **RLS INSERT policies added** for `user_workout_plans` and `user_workout_plan_items` — original migration only had SELECT/UPDATE/DELETE, blocking plan saves entirely

## [2026-06-10] — Fix: plan save failure, button rename, wizard exit

- **"Could not save your plan" fixed** — `user_workout_plans` insert was including a `workout_source` column that doesn't exist on that table; removed
- **"Start training" renamed to "Add to schedule"** — more accurate label for what the button does
- **X button added to GoalSetup and ScheduleSetup headers** — exits the wizard and returns to the previous screen at any step
- **Confirm error now shows the actual message** — instead of always "Could not save your plan", the real DB error is shown

## [2026-06-10] — Fix: plan generation timeout and type coercion

- **AI timeout raised to 110 seconds** — 55s was sometimes not enough for large multi-week plans; increased to prevent silent failures
- **Numeric fields coerced before validation** — Gemini occasionally returns sets/reps/duration as strings; these are now normalised before validation runs
- **Real error message shown in toast** — instead of always "Could not build your plan", the toast now shows what actually went wrong to aid debugging

## [2026-06-10] — Fix: plan generation used wrong timeline and ignored body scan

- **Timeline now read correctly from the user's saved goal** — was always defaulting to 4 weeks due to a data extraction bug; now reflects 8 weeks / 3 months / 6 months / event date as set in the goal wizard
- **Body scan summary now passed to plan generator** — physique data from the body scan will feed into the AI prompt as intended
- **Daily plan generation quota raised** — internal limit increased from 10 to 50 per day to accommodate testing

## [2026-06-10] — Fix: GoalSetup step 2 next button and date input styling

- **Next arrow now enables when a specific target date is set** — previously required a timeline option to also be selected; now either is sufficient
- **Date input width and corner radius match the timeline cards** — consistent `rounded-2xl` and padding across the whole step

## [2026-06-10] — Plan confirmation screen

- **"Your plan is in your schedule" confirmation** — after tapping "Start training", a clear success screen shows how many sessions were added, with buttons to view the schedule or chat with the coach; no more silently landing on Jarvis

## [2026-06-10] — AI-generated workout plans with full exercise breakdowns

- **Plans are now fully AI-generated** — no more picking from a static catalogue; the AI builds bespoke sessions based on your goal, fitness level, equipment, preferred days, and session length
- **Body scan prompt after goal setup** — after completing the goal wizard, you're asked to do a quick body scan before building your plan; skip button available; scan result feeds directly into the AI plan generation
- **Each session shows intensity (Low/Moderate/High), duration, calories, and a "why" explanation** on the preview card
- **Regenerate individual days** — tap the refresh icon on any preview card to ask the AI for a different session for that day; rest of the plan untouched
- **Plan is saved to DB on confirm** — written to user_workout_plans + user_workout_plan_items (with full exercise snapshot) + scheduled_workouts (with plan_item back-link for future editing)
- **Playing a scheduled AI workout now works** — fixed the "Start now" button on the Schedule page routing to the GymTimer with the session data

## [2026-06-09] — LogMeal redesign: food picker with budget strip and AI describe

- **LogMeal is now a food picker** — replaces the manual form with a search-and-select flow matching the design spec
- **Calorie budget strip** — live bar showing today's consumed vs daily target, with an orange projected overlay as items are queued
- **Quick add chips** — Describe (AI), Snap (→ meal scanner), Barcode (→ barcode scanner), Voice (placeholder)
- **Describe chip** — bottom sheet where you type a meal description; AI estimates calories/protein/carbs/fat via `smart-insights`; confirm to add to the selection tray
- **Food history** — pulls last 100 meal_logs and shows Recent (last 4 distinct meals) and Frequent (top 6 by count) sections with macro pips
- **+/− stepper** on each food row; multiple items can be queued before logging
- **Selection tray** — slides up from the bottom when items are selected; "Add to diary" inserts all queued rows to `meal_logs` in one go
- **Success overlay** — orange circle check with blur, then auto-navigates to the nutrition dashboard
- **Nav bar hidden on `/log-meal`** — added to `HIDDEN_NAV_ROUTES` so the selection tray isn't obscured
- Recipe prefill still works — navigating from a recipe pre-loads it into the selection tray

## [2026-06-09] — Fix: plan confirmation no longer shows a duplicate "Add to schedule" card

- **Plan is saved when you tap "Start training"** — confirmed and working; no extra step needed
- **Fixed Jarvis showing a confusing "3 x 45 mins / Add to my schedule" card** after the plan wizard — that was the AI re-proposing a schedule it didn't need to; AI now just gives a warm welcome when the plan is already saved

## [2026-06-09] — Editable plan preview + reassuring loading messages

- **Plan preview is now editable**: tap the swap icon on any session to choose a different workout from the full catalogue, or tap X to remove a session entirely
- **Cycling loading messages** while your plan generates — "Coach is reviewing your goals…", "Balancing your training load…" etc. — with a note that it takes 15–20 seconds
- **"Start training" disabled** if you remove all sessions from the plan
- Log meal: category pre-filled from URL query param

## [2026-06-09] — Plan preview step + fix plan generation token crash

- **"Build my plan" now works**: Fixed a crash where Gemini's thinking tokens were eating the entire token budget, truncating the plan JSON
- **Plan preview before confirming**: After generating, you see all your scheduled workouts — date, category, duration, and equipment — before committing
- **"Start training" confirms the plan** and drops you into a Jarvis welcome message
- Log meal and nutrition dashboard minor updates

## [2026-06-09] — Goal wizard UX polish + fix plan generation crash

- **Goal wizard**: Next arrow now shows on every step — tap a choice to select it, then tap the arrow to move forward
- **Goal wizard step 2**: Optional specific target date field added alongside the timeline picker
- **Goal wizard step 4**: Heading updated to "What's your go to?"
- **Fix "Build my plan" doing nothing**: Removed invalid API parameter that was causing every workout plan generation to silently fail with a 400 error
- **Schedule setup**: Now shows an error message if plan generation fails instead of silently resetting

## [2026-06-09] — Fix onboarding flow: goal wizard returns to Jarvis plan card

- **Goal wizard now returns to Jarvis**, which automatically shows the "You don't have a workout plan yet" card — no more skipping straight into the schedule wizard
- **Cleaner two-step onboarding**: set goal → Jarvis shows plan card → set schedule → Jarvis welcome message; each step clearly prompted

## [2026-06-09] — Persistent user memory + state-driven Jarvis greeting

- **Jarvis now remembers you across sessions** — goal, physique, injuries, preferences, and lifestyle are stored in a persistent `user_memory` field and injected as Jarvis's own recall on every request; no more "I can't access your goals"
- **Goal and body scan write to memory on save** — goal wizard writes goal + fitness level + equipment; body scan writes physique summary; both survive chat history wipes
- **Jarvis can learn and remember soft facts** — via a new `update_memory` tool, Jarvis persists injuries, training preferences, and lifestyle context (shift work, travel, etc.) across sessions
- **Greeting is now state-driven** — Jarvis checks whether a goal and workout plan are set before opening; shows the right card (set goal / build plan) without triggering the AI unnecessarily
- **Goal questions answered directly** — "what's my goal" type questions are intercepted client-side and answered from the database instantly, bypassing the AI entirely

## [2026-06-09] — Fix Jarvis goal context + suppress goal card reliably

- **AI now sees goal even when user_goals query returns null** — userMD falls back to workout_preferences.workout_goal so "Active goal: not yet set" never appears when a goal has been saved
- **Goal card no longer re-appears after wizard** — profiles update now uses (supabase as any) so goal_prompt_preference column (missing from generated types) is always written; card also checks workout_preferences.workout_goal as a second suppression gate
- **All profiles goal-column updates cast as any** — covers GoalSetup, handleGoalPromptLater, handleGoalPromptNever, and the last_at stamp

## [2026-06-08] — Fix Jarvis goal access

- **Edge function now reads user_goals with admin client** — switched from user-JWT client to supabaseAdmin for the user_goals query; eliminates any RLS edge case that could return null even when a goal is set
- **GoalSetup throws on insert failure** — goal insert errors are no longer swallowed silently; the save button will surface the failure instead of navigating to Jarvis with no goal stored

## [2026-06-08] — Suppress repeated Jarvis greeting within a session

- **No more "welcome back" every open** — Jarvis now skips the greeting if the user was last in the chat within 10 minutes; conversation history shows immediately without an additional message

## [2026-06-08] — Jarvis post-goal acknowledgement fixes

- **AI now names the actual goal** — prefill prompt includes goal name, timeline, fitness level, and equipment so Jarvis acknowledges what the user chose specifically rather than responding generically
- **Prefill no longer shows as a user message** — switched from ai.send() to ai.greet() so the programmatic prompt is invisible; only Jarvis's response appears
- **X button goes home, not back to the wizard** — navigate('/') when closing a prefill-triggered session prevents the wizard re-mounting; used replace:true on the wizard's navigate so it's removed from history too

## [2026-06-08] — Hide Jarvis FAB during goal wizard

- **Jarvis FAB hidden on /goal-setup** — the floating orange + button (z-40) was rendering above the wizard and blocking the "Set my goal" button on the final step; added /goal-setup to the hidden-nav and hidden-FAB route lists

## [2026-06-08] — Jarvis scroll fix + wizard UX polish

- **Jarvis auto-scroll fixed** — new messages and the thinking indicator now scroll into view reliably on iOS using direct container scrollTop instead of scrollIntoView
- **Goal wizard auto-advances** — selecting a goal type, timeline, or fitness level immediately moves to the next step without needing to tap a button
- **Wizard FAB removed** — replaced the full-width Continue button with a small circular ">" arrow for steps that require manual advance (event details, exercise types); only the final "Set my goal" submit retains the full button

## [2026-06-08] — Goal setup wizard

- **5-screen goal wizard at /goal-setup** — captures goal type (fat loss / muscle gain / endurance / strength / event prep), timeline or event date, fitness level, exercise types, and equipment
- **Wizard writes to user_goals + workout_preferences** — feeds directly into the AI coach's user context on every subsequent Jarvis session
- **Returns to Jarvis with acknowledgement** — when reached from the Jarvis goal card, completes and re-opens the chat with the new goal pre-loaded in context
- **Static link in Profile** — "Set up with wizard" button in the Fitness Goal section; returns to profile on completion
- **Goal card now navigates to wizard** — "Set my goal" on the Jarvis popup opens the wizard instead of a broken AI chat flow

## [2026-06-08] — Fix goal card: invert suppression logic to show-by-default

- **Goal card now shows unless we can positively confirm it should be hidden** — previously the card defaulted to hidden and only showed if all DB checks succeeded; now it defaults to visible and is only suppressed if the user has opted out or the 7-day cadence hasn't elapsed
- **A failing DB check no longer silently hides the card** — if the profiles query throws or returns nothing, the card shows rather than disappearing

## [2026-06-08] — Fix goal card suppressed by catch-block contamination

- **Goal card now reliably appears** — schedule and goal-prompt queries are now in separate try/catch blocks; previously a failure in either would silently reset hasSchedule and prevent the card from ever showing
- **No more "returns a thought" greeting when card should appear** — the goal-prompt check can now fail gracefully without affecting which greeting branch runs

## [2026-06-08] — Fix goal card always hidden on iOS

- **Goal card now appears correctly on iOS** — Supabase timestamp format was causing the weekly cadence check to silently fail on device, suppressing the card on every open

## [2026-06-08] — Goal card reliability fixes

- **Onboarding and goal card are now mutually exclusive** — brand-new users get the conversational onboarding greeting; the goal card only shows to returning users with no active goal and cadence due
- **Goal card is now the first visible thing on open** — moved above the streaming response so it's never hidden below the fold
- **Jarvis "I can't check" fix** — prompt now targets the behaviour (claiming inaccessibility) rather than a specific phrase, so synonyms can't slip through

## [2026-06-08] — Goal-prompt pop-up (reusable multi-choice primitive)

- **Goal-prompt card** — Jarvis now asks "What are you training toward?" on open when no goal is set; appears once then re-surfaces weekly on "Remind me later", never again on "Don't ask again"
- **Set my goal** routes into the existing goal-setting conversation; confirmed goals stop the prompt naturally
- **Reusable MultiChoiceCard component** — generic N-choice card (icon, heading, choices array) for goal prompt and future prompts (HealthKit connect, onboarding steps, etc.)
- **Profile schema** — two new nullable columns (`goal_prompt_preference`, `goal_prompt_last_at`) track the user's choice and cadence
- **Jarvis prompt fix** — "not set" goal now correctly described as unset rather than inaccessible

## [2026-06-04] — Dismissed log fix + Jarvis prompt redesign

- **Dismissed food/goal proposals no longer re-proposed** — tapping Dismiss on a log or goal confirmation card now leaves a resolution in the conversation, so Jarvis doesn't re-propose the same item on next open
- **Jarvis identity redesigned** — results-driven professional replacing the praise-dispensing best friend; encouragement is earned and specific, not sprinkled
- **Proactivity rule** — Jarvis now distinguishes purposeful proactivity (chasing goals, data, real progress) from decorative filler (chat summaries, motivational noise); filler is explicitly prohibited
- **Goals section** — Jarvis gives caveated advice when no goal is set, and respects a stored preference (set/later/never) for whether to prompt
- **Food diary instruction fixed** — removed the "answer intake questions from diary" instruction that was driving volunteering bugs; diary stays as background context for macro reasoning only
- **Safety floor strengthened** — results-driven persona explicitly cannot override safety rules

## [2026-06-04] — Branded share templates (6 designs, post + story)

- **6 branded share card templates** — Duration, Full Stats, Personal Bests, New Route, Triathlon, and Challenge; each available in post (1080×1080) and story (1080×1920) format
- **Live SVG previews** — the template picker shows each design as a live thumbnail so you can see exactly what it looks like before generating; thumbnail switches between post and story as you toggle
- **Auto-filled from session** — stats (distance, time, pace, heart rate, calories, elevation) are read from the completed workout and injected into the right fields automatically
- **Smart availability** — Full Stats requires GPS data, Personal Bests requires a new PR this session, New Route requires route positions, Triathlon is only shown for triathlon activities; unavailable templates are greyed out with a reason
- **Integrated into existing share flow** — "Templates" appears as a new option in the share card grid alongside Map Card, Stats Card, Story Card, AI Cinematic, and Quick Photo

## [2026-06-04] — Jarvis food/goal card redesign (Build 129)

- **Food confirmation card redesigned** — replaced the plain emoji-titled block with a "Calorie Hero" card: an orange calorie ring (filled to show how much of your daily target this meal adds), food name, macro composition bars for Protein/Carbs/Fat with proportional fill, and an "Add to diary" button
- **Goal confirmation card redesigned** — "Timeline" card: Target icon chip, goal text, and a runway bar showing today → target date with week count; degrades cleanly when no target date is set
- **Both cards live daily context** — the calorie ring queries today's logged kcal at the moment the card appears and fills accordingly; the timeline runway computes the week count from the current date

## [2026-06-04] — A27: fix greet() volunteering stale food-recall answers (Build 128)

- **Jarvis no longer answers old food questions on app open** — the greeting now just welcomes you and asks what you want to work on; it will never pick up or continue a prior conversation thread
- **Food-recall questions are now fully hidden from AI context** — both the question and its deterministic answer are marked synthetic, so no LLM path (greeting or otherwise) can see an apparently-unanswered food question

## [2026-06-03] — A26: deterministic food-recall answers (Build 127)

- **"What have I eaten today?" answered directly from your diary** — Jarvis no longer asks the AI for food-recall questions; it reads your meal_logs directly and answers instantly with the exact list and totals
- **Calorie and macro totals are always accurate** — "How many calories today?" returns a live calculation from the database, not the AI's recollection of the conversation
- **Works for voice and text** — both the mic and the text input route food-recall questions to the direct answer path
- **Answer is synthetic** — the direct answer isn't fed back into the AI's context window, so it can't anchor to it for non-food questions

## [2026-06-02] — MD Stage 1b + activity goals fix (Build 123)

- **Activity goals now save reliably** — fixed a bug where saving goals a second time failed silently; goals now update in place correctly
- **Jarvis saves stated fitness goals** — when you clearly commit to a goal ("I want to lose 5kg by September"), Jarvis saves it durably; previous goal is archived not deleted
- **Goal history preserved** — each new goal archives the old one so no goal is ever lost, only superseded

## [2026-06-02] — MD Stage 1a: full body-scan analysis persisted (Build 122)

- **Body scan results now saved in full** — the complete AI analysis (body type, muscle development, symmetry, posture, observations, recommendations) is stored in a new `body_scans` table, not just the body-fat percentage
- **History chart unaffected** — the existing body-fat trend data in `health_metrics` is unchanged; `body_scans` is additive alongside it
- **Foundation for user memory** — persisted scans will feed the future user-MD so Jarvis can reference your body composition history

## [2026-06-02] — A23: Jarvis reads food diary correctly (Build 121)

- **Jarvis no longer reports yesterday's meals** — chat receipts ("Food logged: super noodles") are now excluded from the AI context window; Jarvis reads only the live diary, not stale chat history
- **No more double-logging on reload** — before logging any food, Jarvis checks the live diary first; if the item was already logged moments ago it won't log it again
- **"What have I eaten today?" now accurate** — the live food diary is the single source of truth; Jarvis answers from it directly regardless of what's in the chat thread

## [2026-06-01] — A23: Jarvis food-diary reads live data

- **Jarvis now sees everything you've eaten today** — foods logged via the diary, barcode scanner, or meal scanner all appear in Jarvis's context; previously Jarvis could only see items logged through chat
- **Deleted foods disappear from Jarvis immediately** — the live query filters soft-deleted rows; asking "what have I eaten today" after deleting an entry no longer mentions the deleted item
- **Accurate calorie and macro totals** — Jarvis answers from the live diary block (with running totals) rather than from chat message history, eliminating double-counting
- **Edge-function-only change** — no app update required; takes effect immediately on next Jarvis conversation

## [2026-06-01] — A21 fixes: edit drawer input and keyboard behaviour

- **Numeric fields can be cleared** — calories, protein, carbs, fat, fiber, and servings no longer snap back to 0 when cleared; you can delete the value and type a fresh number cleanly
- **Keyboard no longer covers the edit fields** — the edit drawer now lifts above the on-screen keyboard when a field is focused, so you can always see what you're typing

## [2026-06-01] — A21: Edit and delete logged foods in diary

- **Edit a logged entry** — tap the three-dot icon on any diary entry to open an action sheet, then choose Edit; a bottom drawer opens pre-filled with the entry's name, category, calories, servings, protein, carbs, fat, and fiber — save writes back to the database instantly
- **Delete a logged entry** — choose Delete from the same action sheet; a confirmation dialog names the entry before soft-deleting it; the diary and macro totals refresh automatically
- **Per-entry actions** — the three-dot icon now lives on each individual food item (not the category header) so you can act on exactly the entry you want

## [2026-06-01] — A18: Nutrition preferences + Home meals carousel

- **Recommended meals carousel on Home** — horizontal scroll of meals appears below the Schedule card; tapping any card opens a detail sheet with macros, ingredients, and a one-tap log button
- **Nutrition preferences capture** — a 2–5 step flow collects allergens, dietary requirements, and a daily calorie target (either calculated via activity level and goals, or entered manually)
- **Inline onboarding card** — first item in the carousel prompts preferences setup; disappears once completed or skipped
- **Meal logging integration** — "Log this meal" pre-fills the existing log-meal screen with the meal's name and macros
- **Allergen and dietary filtering** — meals matching the user's allergens are hidden; dietary preferences narrow the carousel further (filtering is client-side; tag backfill for existing meals is a follow-up task)
- **DB extended** — `nutrition_profiles` gains calorie_method, weight_goal, activity_level, and onboarding_skipped columns; `meals` gains allergens and dietary_tags arrays

## [2026-05-31] — A5: 24-hour rolling chat history

- **Chat history capped at 24 hours** — messages older than a day no longer appear in the chat view; Jarvis starts fresh each day
- **AI prompt context trimmed** — the AI only sees the last 24 hours of conversation, preventing stale or incorrect context from old sessions contaminating responses
- **Automatic cleanup on write** — sending a new message silently deletes any messages older than 24 hours from the database in the background
- **Performance index** — new database index on `(conversation_id, created_at)` makes time-windowed history queries efficient

## [2026-05-29] — Fix: Home FAB navigates to AI surface

- **Home FAB** — the floating "+" button on the home screen now opens the AI Coach surface (/ai) instead of the quick-add log sheet; Quick Add in the bottom nav remains the entry point for logging

## [2026-05-29] — A2: Three-tab AI surface + bottom nav restructure

- **New AI surface** — /ai route hosts a three-tab shell: Chat (Jarvis), Coach (4 upcoming tools, "Coming next"), and Settings (placeholder)
- **Bottom nav restructured** — now shows Home | Quick Add | HIIT centre button | Schedule | Social; Nutrition tab removed
- **Quick Add from nav** — tapping Quick Add in the nav bar opens the log sheet directly (meal, water, weight)
- **All Jarvis entry points unified** — "Ok HIIT" pill, wake word, HIITMenu AI Coach, and hitt:open-jarvis all navigate to /ai; post-workout share nudge remains a full-screen overlay

## [2026-05-29] — A1 + 5F: AI workout planner + catalogue hidden

- **AI workout generation** — Jarvis can now generate a single custom workout or a full multi-day training plan on demand; workouts are built by Gemini 2.5 Flash using your health metrics, goals, and recent activity as context
- **"Do it now" mode** — AI-generated workouts can be started immediately from Jarvis; GymTimer supports ad-hoc AI workouts alongside scheduled ones
- **Add to schedule** — AI workouts and plans can be scheduled directly from Jarvis cards with an optimistic "Added to [date]" confirmation
- **Workout catalogue hidden** — catalogue entry points removed from bottom nav, home dashboard, FAB, and schedule page for v1.0; routes preserved for future use
- **Schedule page → Jarvis** — "Add" buttons on the schedule now open Jarvis with a pre-filled message so you can ask for a workout recommendation naturally

## [2026-05-28] — Build 108: 5E — AI-generated workout schema foundation

- **Exercise snapshot on completion** — completing a catalogue workout now saves the full exercise list (title, description, duration, sets, reps, order, media) to `workout_progress`, so history is durable even if the catalogue changes
- **AI workout support in schedule and progress tables** — `scheduled_workouts`, `workout_progress`, and `user_workout_plan_items` now hold inline workout content (title, description, exercises, estimated duration and calories) alongside the optional catalogue FK
- **Schedule view null-safe** — workout cards read from inline fields first, falling back to the catalogue join; navigate calls guarded against null `workout_id` so AI workouts won't crash the view
- **TypeScript types updated** — new `ExerciseSnapshot` type; six new columns added to all three table types; `workout_id` correctly typed as nullable

## [2026-05-27] — Build 107: 5C — JarvisMode migrated to useAI hook

- **JarvisMode refactor** (5C) — JarvisMode is now a pure UI surface over the `useAI` hook; ~500 lines of local streaming, conversation history, message persistence, and regex marker parsing deleted
- **Conversation lifecycle simplified** — `VoiceController` no longer does an async DB lookup on every Jarvis open; the hook manages conversation creation and history loading on mount
- **Synthetic message architecture** — action confirmation messages (schedule created, workout added, recipe logged) now persist to the `messages` table with a `synthetic` flag so they survive across sessions, but are excluded from the AI context window so the model never misreads them as its own prior responses
- **`messages` schema migration** — new `synthetic boolean DEFAULT false` column added

## [2026-05-27] — Build 106: 5A+5B — unified AI hook + structured action streaming

- **New `useAI` hook** (5A) — single hook manages the Jarvis conversation: loads history, streams responses, exposes typed `Action` objects to consumers, and writes `meal_logs` silently on `log_food` actions without user confirmation
- **Structured response branch** (5B) — `ai-coach` edge function now branches on `X-Response-Format: structured-v1`; new path uses tool calling with 5 tools (`log_food`, `schedule_plan`, `recommend_workout`, `recommend_recipe`, `body_scan_prompt`) and emits structured SSE `{type:text/action/done}` chunks; existing marker path completely unchanged
- **AI food estimation** — model now estimates macros for casual food-log prompts ("I just ate a caesar salad") instead of asking the user for nutrition data; restores behaviour from the original marker system
- **Debug route** at `/debug-ai` (Profile → Debug AI) for on-device verification of streaming, action chunks, and meal_logs writes — temporary, removed before next release

## [2026-05-20] — Build 93: T14 Workouts/Sports tab + trademark compliance

- **Workouts/Sports tab system** — the Workouts page now has a tab switcher at the top; "Workouts" (default) shows the existing library, "Sports" shows three tappable tiles: Triathlon, Routes, Gym Timer — rescuing three orphaned features
- Renamed triathlon race labels from "Full Ironman" / "Half Ironman" to "Long Course" / "Middle Distance" for trademark compliance

## [2026-05-14] — Fix: Jarvis voice echo when navigating between screens

- **Echo fixed** — tapping Start now, View recipe, Body scan, Share now, or the schedule confirm inside Jarvis now properly stops any in-progress speech before closing; previously the audio kept playing in the background and overlapped with the next greeting

## [2026-05-14] — Phases 6 & 7: PB detection, PB share cards, and push reminders

- **Personal best detection** — after every workout the app checks for three PB types: longest duration, biggest calorie burn, and longest streak. First-ever workouts don't count — you need a previous one to beat
- **PB celebration** — when you hit a PB, the completion screen shows "🏆 New PB" and the share card image switches to a gold "NEW PERSONAL BEST" banner; Jarvis calls out the specific PB by name with a gold card
- **Non-PB workouts unchanged** — generic workouts still get the normal "share your win" prompt, not the gold treatment
- **30-minute push reminder** — if you background the app after a PB workout without sharing, a local push notification fires 30 minutes later nudging you to share while the moment still feels fresh; tapping it opens the workout library
- **Auto-cancel** — if you tap "Share now" inside Jarvis before the 30 minutes are up, the pending notification is cancelled so you're not nudged about something you already did

## [2026-05-14] — Phase 5: Jarvis proactive recommendations and post-workout share nudge

- **Proactive workout suggestion** — on days you have nothing scheduled, Jarvis now opens with a workout recommendation in the greeting rather than a generic welcome
- **Post-workout share nudge** — 8 seconds after finishing a workout, Jarvis automatically opens with a personalised congratulations and a "Share your win" card showing your duration, calories, and workout name
- **Push notification fix** — the completion push notification was sending "You finished undefined" — fixed to use the correct workout title field

## [2026-05-14] — Build 81: Recipe card and nutrition dashboard fixes

- **"View recipe" fixed** — tapping View recipe on a Jarvis suggestion now opens Browse Meals instead of showing "meal not found"
- **Calories update instantly** — logging a meal via Jarvis now refreshes the Nutrition Dashboard in real time; totals no longer stay stale until you leave and return

## [2026-05-14] — Phase 4: Jarvis now shows workout and recipe recommendation cards

- **Workout card** — when Jarvis recommends a workout, a card appears in chat showing the thumbnail (or 💪), name, duration, category and difficulty, with three buttons: Start now (opens the workout), Add to schedule (adds it to tomorrow's schedule and confirms in chat), or Skip
- **Recipe card** — when Jarvis recommends a recipe, a card appears with the recipe emoji, name, meal type, calories and protein, with three buttons: View recipe (opens the recipe detail), Log it (logs the meal now and confirms in chat), or Skip
- **One-tap schedule** — "Add to schedule" on a workout card saves directly for tomorrow — no date picker needed; the workout appears in the Schedule tab immediately

## [2026-05-13] — Build 69: Welcome message fixes, nav restructure, social screen improvements

- **Welcome message reliability** — greeting voice now plays correctly every time you open the app; fixed a bug where it would stay silent after returning from the background, and another where it would echo (play twice) if the screen was tapped at the same moment as the auto-trigger
- **Mic chime on app exit fixed** — wake word listener now stops cleanly when you leave the app and restarts when you return, preventing the iOS mic-off sound from playing on every exit
- **Nav restructure** — the HIIT logo button in the bottom nav now opens Jarvis directly; the old AI tab has been replaced with an Add tab
- **Social onboarding** — tapping Social now shows the community guidelines screen first before taking you to the feed
- **Social feed header** — Chat and Leaderboard buttons added to the top of the community feed
- **Sticky headers** — Social screen, Explore Community screen, and Chat Room all have proper sticky headers with safe-area padding so content no longer hides under the notch

## [2026-05-09] — Build 68: Jarvis onboarding flow

- **First open intake** — if Jarvis opens and you have no schedule yet, it runs a quick goal intake: asks your main fitness goal, what specifically you want to achieve, how many days a week you can train, and how long each session should be — one question at a time
- **Auto schedule proposal** — once Jarvis has your answers it builds a plan and asks "Want me to add this to your schedule?"
- **Body scan offer** — after the schedule step, Jarvis asks if you want a body scan; if you say yes it shows an "Open Body Scan" button in the chat that takes you straight there
- **Re-onboarding awareness** — if you tell Jarvis your goals have shifted, it offers to build a fresh plan based on your new direction

## [2026-05-08] — Build 67: Watch triathlon plan now sticks

- **Race plan persists on Watch** — the triathlon plan is now saved to the Watch's local storage; it survives the Watch app closing and reopening, so "No Race Loaded" no longer appears after the app is restarted
- **Notification timing fixed** — moved the plan-arrival observer to the top level of the Race screen so it's always listening, regardless of which sub-view is active; the plan could previously be missed if it arrived during a view transition

## [2026-05-09] — Build 66: TTS speaks every response + schedule built properly

- **AI coach voice fixed** — the coach now speaks every response, not just the first one; an iOS audio element reuse issue was causing all subsequent responses to play silently
- **Schedule date picker** — now shows 14 days ahead (was 4) and scrolls horizontally; time picker options were previously unreachable due to a CSS overflow bug, now fully selectable
- **Add to Schedule** — new button in the Schedule screen header opens a proper sheet: search the workout library, pick a date and time, save directly; no longer demo-only

## [2026-05-09] — Build 65: Fix WebSocket not connected Sentry error

- **Voice mic stability** — fixed a crash that occurred when tapping the mic button rapidly or when the voice session closed unexpectedly; the app now handles these cases cleanly without errors

## [2026-05-09] — Build 64: Watch opens Race screen automatically when plan is sent

- **No more manual navigation** — removed the pop-up telling you to open the Race tab; the Watch now navigates there automatically when the plan arrives
- **Reliable delivery when Watch is out of range** — triathlon plans are now queued and guaranteed to arrive the next time your Watch connects, instead of being silently dropped or overwritten

## [2026-05-09] — Build 63: Schedule requires user confirmation before saving

- **Confirm before scheduling** — Jarvis now asks before saving anything: after proposing a plan it shows a card in the chat with the goal, days per week, and session length, plus "Add to schedule" and "Maybe later" buttons
- Nothing is written to your schedule until you tap "Add to schedule"
- Food logging is unchanged — still logs immediately when you ask

## [2026-05-09] — Build 62: Voice interrupt + preview fix + schedule live updates

- **Interrupt the coach mid-speech** — tap the mic button at any time while the coach is talking to stop it immediately; button shows a stop icon and "Tap to interrupt" while speaking
- **Voice preview fixed** — sample playback in Settings now works correctly on iOS; was silently failing due to an audio unlock issue
- **Schedule updates instantly** — when Jarvis creates a workout plan, entries now appear in the Schedule tab straight away without needing to reload or navigate away

## [2026-05-08] — Build 61: Voice picker with preview + HIIT pronunciation fix

- **Voice picker redesigned** — voices now appear as individual cards in Settings; tap Preview on any voice to hear a sample clip before choosing it
- **Pronunciation fixed** — "HIIT" now sounds like "hit" everywhere the coach speaks; was being read aloud as individual letters "H I I T"

## [2026-05-08] — Build 60: HealthKit foreground refresh + voice food logging

- **HealthKit refreshes on every app open** — go for a run, open the app, and your activity is there immediately; data now refreshes whenever the app comes to the foreground (was a 24-hour cache)
- **Voice food logging** — tell Jarvis what you ate and it logs it: "Ok HIIT, log I just ate an apple" identifies the food, estimates the calories and macros, picks the right meal slot from the time of day, and saves it to your nutrition tracker
- **Multiple foods at once** — log several items in one message and they all get recorded
- Coach responses are clean — the internal logging instructions are stripped before anything is shown or spoken

## [2026-05-08] — Build 59: Jarvis schedules real workouts + welcome greeting fix + Watch icon

- **Jarvis builds your schedule automatically** — ask the coach for a plan and it now pulls real workouts from the library and saves them directly to your Schedule tab; no more being told to go add it yourself
- **Schedule confirmation in chat** — after creating your plan, Jarvis tells you how many workouts were added and where to find them
- **Welcome greeting fixed** — the spoken greeting on the home screen now reliably plays after your first tap, even when iOS blocks autoplay on load
- **Watch app icon** — the orange circle placeholder in the iPhone Watch app has been replaced with the real HIIT logo

## [2026-05-08] — Build 58: Jarvis logic hardening — 5 bugs fixed

- **No more response bleed** — a new request now kills the previous AI stream instantly; old tokens can no longer spill into a new reply
- **Rapid speech handled correctly** — speaking two phrases quickly no longer causes the second message to overwrite the first in chat history
- **Duplicate message guard** — if the voice engine fires twice for one utterance, the second is now silently ignored
- **Mute toggle is instant** — toggling mute within the first 400ms of opening no longer lets the greeting slip through
- **Single conversation guaranteed** — if duplicate Jarvis threads exist, the app now always picks the original one consistently
- **Clean exit** — closing voice mode mid-response now cancels the fetch cleanly with no dangling network requests

## [2026-05-08] — Build 57: All 9 missing Watch screens + persistent Jarvis chat history

- **Watch: Nothing scheduled** — redesigned open-day screen with Quick start (orange) and Mark as rest (purple moon) buttons
- **Watch: Recovery day** — new screen with purple wind icon and coach-suggested activity
- **Watch: Deliberate rest** — new screen with readiness score card showing sleep and HRV; Override button to pick a sport anyway
- **Watch: Day type from iPhone** — the iPhone app can now tell the Watch which day state to show
- **Watch: End workout confirm** — tapping End now shows a full confirmation screen with elapsed time, distance, calories; End & Save / Discard / Resume
- **Watch: Switch activity** — Switch button opens the sport picker, then a from → to confirmation before switching
- **Watch: Streak completion** — new post-workout screen for streak milestones with flame icon and week pill calendar
- **Watch: Personal best completion** — new post-workout screen for PRs with green gradient, time, and improvement delta
- **Watch: Race loaded** — triathlon tab now shows a pre-race overview (plan name + leg distances) before the race starts
- **Watch: Race summary** — post-race screen upgraded with gold medal, total time, and per-leg time grid
- **Jarvis: Persistent chat history** — voice coach chat is now preserved across sessions; reopening loads the last 40 messages
- **Jarvis: Single conversation thread** — one permanent Jarvis conversation per user, history accumulates forever
- **Jarvis: Welcome back greeting** — returning users get a brief personalised greeting referencing recent chat instead of a cold intro
- **Jarvis: Streaming fix** — text no longer bleeds from one response into the next
- **Home: Welcome greeting** — voice greeting on the home screen now always attempts to play on load

## [2026-05-05] — Build 45: AI coach speaks responses; voice selection; owner handoff docs updated

- **AI coach now speaks** — after each AI response, the coach reads it aloud using ElevenLabs; enable in Chat Settings → Customize → AI Voice Responses
- **Six real voices to choose from** — Brian (American Male), Jessica (American Female), George (British Male), Lily (British Female), Aria (American Female), Chris (American Male)
- **Voice mute toggle in chat** — a small Volume icon above the input bar lets you silence voice mid-conversation without going to settings
- **Voice preference saved** — your choice of voice and on/off state persists across sessions
- **Handoff docs updated** — ElevenLabs API key and APNs push key instructions added for the app owner

## [2026-05-04] — Build 38: Ironman triathlon Watch integration + race setup screen

- **Triathlon race setup screen added** — before starting, choose Full Ironman, Half Ironman, Olympic, Sprint, or set fully custom distances for each leg; distances are editable individually
- **Send race plan to Apple Watch** — new button on the setup screen pushes the plan (name + target distances) to the Watch over Bluetooth so the Watch knows exactly what you're aiming for
- **Apple Watch gets a Race tab** — a 4th tab on the Watch shows the Ironman triathlon screen; each leg displays elapsed time, current distance vs target, a live progress bar, and heart rate
- **Manual leg transitions** — user taps "NOW SWIM / CYCLE / RUN" to start each leg and "NEXT: BIKE →" to advance; each leg records to Apple Health with the correct activity type (swimming, cycling, running)
- **Finish and sync** — tapping "FINISH RACE" on the final leg saves the result and sends totals back to the iPhone

## [2026-05-03] — Build 37: Home workouts section fixes; workout detail sticky header; player layout fixed

- **Workouts section on home screen has proper spacing** — no longer crammed against the stats tiles above it
- **Category filters on home screen now work** — tapping All / HIIT / Strength / Cardio / Yoga filters the real workout library; previously the pills were decorative only
- **Workout detail back button always visible** — header is now sticky so you can go back without scrolling to the top
- **Workout detail no longer scrolls sideways** — horizontal overflow fixed
- **Countdown screen fits on screen** — number scaled down, back button added; no more needing to scroll to exit
- **Workout player controls stay in place** — pause and skip buttons are locked at the bottom of the screen and no longer drift out of view when content scrolls

## [2026-05-03] — Build 36: Camera flip single-tap fix; watch syncs on app open

- **Body scan camera flip now works in one tap** — previously required two taps on iOS due to a timing race when switching cameras; now switches reliably first time
- **Apple Watch / health data syncs automatically on app open** — no longer requires manually pressing the sync button; syncs once per 5 minutes when you open the app

## [2026-05-03] — Build 35: Body scan "expecting ; or )" error fixed

- **Body scan analysis error fixed** — a cryptic "expecting ; or )" error that appeared when analysing a rear-camera photo is now resolved; the session token is fetched safely before the request and the response is parsed with a proper fallback if the server returns an unexpected format

## [2026-05-03] — Build 34: Body scan camera fix; workout library seeded with real exercises

- **Body scan camera no longer fails after switching to rear camera** — the capture button is now disabled until the video stream is delivering frames; previously tapping too quickly sent an empty image to the AI, causing a silent failure
- **Body scan errors now show the real reason** — error messages from the AI service are now surfaced directly instead of always showing a generic "non-2xx" message
- **Workout library now has real content** — 175 exercises seeded across all 28 workouts with descriptions, sets/reps/durations, and muscle groups; thumbnails added to every workout

## [2026-05-03] — Build 33: Body scan improvements — second person, camera flip, warning visible

- **Body scan analysis now speaks directly to you** — results say "your upper body shows…" instead of "the person's body shows…"
- **Camera flip button added** — switch between front and rear camera while scanning; defaults to rear camera for full-body shots
- **AI disclaimer now visible** — warning text has a background and padding so it's no longer hidden behind the bottom navigation bar

## [2026-05-03] — Build 32: Body scan fix; story keyboard fix; duplicate greeting removed

- **Body scan photos no longer fail to upload** — camera and gallery photos are now resized to 900px before sending; previously full-resolution photos exceeded the upload limit and caused an error
- **Caption box no longer hidden by keyboard when creating a story** — text input scrolls into view automatically when the keyboard appears
- **Duplicate welcome message removed from home screen** — the "Hello, name!" line in the header has been removed; the hero already shows the greeting over the video

## [2026-05-03] — Build 31: Recipe images live in Browse Meals; bottom nav fix shipped

- **Browse Meals now shows the real recipe library** — switched from 8 placeholder entries to the full 30-recipe collection with photos; 23 recipes have images, 7 awaiting photos from the owner
- **Tapping a recipe opens a detail sheet** — shows the full-width photo, macros (calories, protein, carbs, fat), allergens, and vegetarian/vegan swap options
- **Bottom nav bar sits closer to the screen edge** — the excess gap below the floating bar has been removed (was committed in Build 30 but hit Apple's daily upload limit)
- **Recipe images and allergens added to database** — 23 photos uploaded and matched to recipes; best-guess allergens set for all 30 recipes pending owner review

## [2026-05-01] — Build 30: Bottom nav bar repositioned closer to screen edge

- **Bottom nav bar now sits lower on screen** — removed excess spacing that was pushing it too far from the edge; it now sits flush with the safe area as intended

## [2026-05-01] — Build 29: Profile screen no longer drifts sideways; back arrow removed

- **Profile screen no longer slides left/right when scrolling** — horizontal overflow was causing the page to drift; locked to vertical scroll only
- **Back arrow removed from profile header** — it was navigating incorrectly and is redundant now that the bottom nav bar handles all navigation

## [2026-05-01] — Build 28: Community feed fixed; AI upgraded to Gemini 2.5 Flash

- **Community feed now loads correctly** — "Failed to load posts" error fixed; the posts query was attempting a database join that had no valid relationship defined, causing every load to fail even when posts exist
- **All AI features upgraded to Gemini 2.5 Flash** — AI coach, food scanner, workout plans, sleep recommendations, and all other AI features now run on Google's latest model, with better response quality

## [2026-05-01] — Build 27: Barcode scanner fixed on iOS; chat now auto-scrolls

- **Barcode scanner now works on iPhone** — iOS doesn't support the browser's native barcode detection API; the scanner now uses the ZXing library as a fallback, decoding barcodes from camera frames directly
- **AI chat now scrolls to the latest message automatically** — the previous scroll method was unreliable in the iOS app; replaced with a more robust approach that consistently keeps the newest message in view

## [2026-05-01] — Build 26: Black camera screen in meal scanner fixed

- **Camera no longer shows a black screen when scanning food** — the live camera feed now appears correctly after granting permission

## [2026-05-01] — Build 25: Watch sync step count fixed

- **Steps, distance, and calories now match the Health app** — the sync window was previously a rolling 24-hour window (yesterday → now), causing it to add yesterday's totals on top of today's; it now runs from midnight today, matching what Apple Health displays for the current day

## [2026-05-01] — Build 24: Google OAuth switched to native SocialLogin plugin

- **Custom OAuthPlugin replaced** — the hand-rolled ASWebAuthenticationSession plugin (`OAuthPlugin.swift`) and its JS bridge wrapper have been removed; replaced with the maintained `@capgo/capacitor-social-login` package (v8.3.20)
- **Simpler, more reliable sign-in flow** — Google sign-in now calls the native Google Sign-In SDK directly, receives an ID token, and exchanges it with Supabase via `signInWithIdToken`; no browser redirect, no deep link, no PKCE code exchange
- **Google reverse client ID URL scheme added to Info.plist** — required by the Google Sign-In SDK; was missing from previous builds
- **Google web client ID moved to `.env`** — no longer hardcoded in source; stored as `VITE_GOOGLE_WEB_CLIENT_ID`
- **Sign-out now clears Google session** — calls `SocialLogin.logout()` so the next sign-in shows the account picker rather than silently reusing the cached account

## [2026-05-01] — Build 21: Welcome screen UX fixed; tutorial no longer navigates away

- **"Welcome back" toast removed** — the welcome screen already says hello; the toast was redundant
- **Phantom navigation to Schedule fixed** — PostLoginWelcome used `onTouchEnd` to dismiss, which left ghost taps active during the 400ms slide-out animation; those ghost taps were reaching the BottomNav's Schedule tab behind the overlay; removed `onTouchEnd` (onClick is sufficient) and added `pointer-events-none` during the dismissal animation
- **Tutorial z-index raised to 100** — ensures the tutorial overlay sits above all navigation elements with no ambiguity

## [2026-05-01] — Build 20: OAuthPlugin properly conforms to CAPBridgedPlugin — Google sign-in working

- **Root cause of all plugin registration failures found** — Capacitor 8 SPM plugins self-register by conforming to the `CAPBridgedPlugin` Swift protocol with `identifier`, `jsName`, and `pluginMethods` properties; our plugin was missing this conformance entirely; the `CAP_PLUGIN` ObjC macro, `registerPluginType()`, and `@objc` auto-discovery all failed because none of them is the correct SPM mechanism; found by reading how `@capacitor/app` itself is implemented

## [2026-05-01] — Build 19: OAuthPlugin registered via Objective-C macro — guaranteed pre-bridge registration

- **Plugin registration moved to `CAP_PLUGIN` ObjC macro** — `bridge?.registerPluginType()` was silently no-oping because the bridge wasn't ready when called; the ObjC `CAP_PLUGIN` macro runs at app load time via the Objective-C runtime, before the Capacitor bridge is even created — this is the registration path used by all npm Capacitor plugins

## [2026-05-01] — Build 18: Show real Google sign-in error for debugging

- Shows the exact error from the OAuth flow instead of the generic "Google sign-in failed" message — needed to diagnose what's failing in ASWebAuthenticationSession

## [2026-05-01] — Build 17: Tutorial Continue button fixed

- **Tutorial "Continue" button now works** — the dimmed overlay was intercepting touches on iOS before they could reach the button; added `pointer-events-none` to the overlay so touches pass through correctly

## [2026-05-01] — Build 15: OAuthPlugin properly registered — Google sign-in should work

- **OAuthPlugin is now registered with Capacitor** — Capacitor 8 does not auto-discover local plugins; the correct API is `registerPluginType()` on `CAPBridgeViewController`, called from `capacitorDidLoad()`; a `ViewController` subclass now calls this at the right moment in the bridge lifecycle
- **Google sign-in error was "plugin not implemented on ios"** — fixed; the plugin is now wired up end-to-end

## [2026-04-30] — Build 13: OAuthPlugin compiled into project — app loads, Google sign-in wired

- **App now loads** — `OAuthPlugin.swift` was written to disk but never added to `project.pbxproj`, so Xcode never compiled it; the plugin didn't exist at runtime and (from Build 11) the storyboard referenced a `ViewController` class that also didn't exist, causing a black screen; fixed by properly registering `OAuthPlugin.swift` in the build and reverting to the standard `CAPBridgeViewController` storyboard entry
- **Google OAuth plugin auto-discovered** — Capacitor finds the plugin via the ObjC runtime from the `@objc(OAuthPlugin)` annotation once the file is compiled into the binary; no explicit registration needed

## [2026-04-30] — Build 12: Auth architecture fixes from code review

- **Google sign-in callback now reliable** — the native plugin was releasing the call reference before ASWebAuthenticationSession could complete; added `call.keepAlive = true` so the bridge holds the reference through the async flow
- **Email sign-up spinner now clears** — when email confirmation is required, the "Account created" toast appeared but the loading spinner never stopped; fixed
- **Sign-out now fully clears state** — both user and session are cleared on sign-out, not just user
- **Password reset email opens HIIT app on iOS** — the reset link was pointing to an internal Capacitor URL; it now uses the `hiitfitness://` deep link scheme so it opens the app correctly
- **Resend verification email fixed the same way** — same URL issue corrected
- **Presentation anchor crash fixed** — the native OAuth sheet now uses the correct window reference on iOS 13+ instead of a bare `UIWindow()` which caused a crash at presentation

## [2026-04-30] — Build 11: Native OAuth plugin properly registered; Google sign-in errors now visible

- **Google sign-in opens the authentication page** — the native OAuth plugin (`OAuthPlugin`) is now correctly registered with Capacitor via a `ViewController` subclass; in Build 10 the plugin was compiled but not wired up, so tapping Google just spun
- **Sign-in failures now show an error message** — any failure in the OAuth flow (plugin error, code exchange failure, etc.) is now caught and displayed instead of leaving the spinner stuck

## [2026-04-30] — Build 10: Google sign-in fixed with native OAuth handler; email sign-up error messaging improved

- **Google sign-in finally fixed** — replaced the in-app browser approach with Apple's dedicated OAuth handler (`ASWebAuthenticationSession`), which is the only iOS mechanism that reliably handles the redirect back to the app after Google authentication; previous builds used `SFSafariViewController` which cannot forward custom URL scheme redirects on iOS 11+
- **Cancelled Google sign-in clears the button** — tapping "Cancel" on the Google sign-in sheet no longer leaves the button spinning
- **Email sign-in: "email not confirmed" now shows a clear message** — instead of "Incorrect email or password", users who haven't confirmed their email now see "Please confirm your email address before signing in"
- **Sign-up toast updated** — after creating an account, the message now correctly tells users to check their email to confirm, rather than implying they're already in

## [2026-04-30] — Build 9: Google sign-in fixed — opens native Safari sheet to preserve auth session

- **Google sign-in root cause fixed** — previous builds lost the PKCE security token because the app's WebView was navigating away to Google, clearing session storage; sign-in now opens in a native Safari sheet instead so the app stays mounted and the auth handshake completes correctly
- **Cancelled sign-in no longer freezes the button** — if you dismiss the Google sheet without completing sign-in, the spinner now clears properly
- **Sign-in failure no longer leaves the app stuck** — error state is now reset correctly if the OAuth callback fails for any reason

## [2026-04-30] — Build 8: Google sign-in spinner fixed — app navigates correctly after OAuth completes

- **Google sign-in now lands on the home screen** — after returning from Google authentication, the app was getting stuck on the sign-in spinner even though the account was successfully created; fixed by explicitly refreshing the session state rather than waiting for an event that wasn't reliably firing on iOS

## [2026-04-30] — Build 7: Google sign-in fixed — handles both OAuth flows, sign-in now completes

- **Google sign-in working** — fixed the root cause: the app was only handling one type of OAuth response (PKCE) but Supabase was sending the other type (implicit, with tokens in the URL). Both are now handled so sign-in completes correctly
- **OAuth configuration hardened** — Supabase client explicitly configured for Capacitor native to prevent any automatic URL interception interfering with the sign-in flow

## [2026-04-30] — Build 6: Google sign-in deep link handler — OAuth now completes correctly on iOS

- **Google sign-in fixed end-to-end** — app now catches the OAuth callback URL when iOS returns from the browser and completes the sign-in session automatically
- **URL scheme registered** — `hiitfitness://` registered in iOS so the system knows to open the app when Google redirects back after authentication

## [2026-04-30] — Build 4: Google sign-in fix, keyboard navigation on signup, location permission string

- **Google sign-in fixed** — OAuth now redirects correctly back into the app on iOS using a deep link; was previously failing with a 400 error on TestFlight
- **Signup keyboard** — "Next" button moves between name → email → password → confirm password; confirm password field scrolls into view when focused so it's never hidden behind the keyboard
- **Signup form scrollable** — form now scrolls with plenty of padding at the bottom so no field is ever obscured by the iOS keyboard
- **Location permission string** — added `NSLocationAlwaysAndWhenInUseUsageDescription` to clear the App Store compliance warning from build 3

## [2026-04-29] — First TestFlight build: monitoring, analytics, account deletion, GPS share cards

- **Push notifications** — production APNs entitlement added; app will now receive push notifications on TestFlight and App Store builds
- **Privacy permissions** — camera, photo library, location, and microphone usage strings added to satisfy App Store review requirements
- **Sentry error monitoring** — crashes and errors now reported to Sentry (EU endpoint, production builds only)
- **PostHog analytics** — 7 key events tracked: sign-up, workout started/completed, meal logged, plan generated, premium feature viewed, subscription checkout started
- **Account deletion** — in-app delete account flow built with 30-day soft-delete and typed confirmation modal; required for App Store approval (Guideline 5.1.1)
- **GPS workout share card** — route card now draws the GPS track directly on canvas (Strava-style); faster, no external dependencies
- **AI provider** — all 10 AI edge functions switched to Gemini direct endpoint; quota enforcement and timeout handling improved
- **Community feed** — realtime updates now use targeted state changes instead of full re-fetch; infinite scroll with cursor pagination added
- **Database** — performance indexes on community and HIIT Score tables; allergens column on recipes; soft-delete columns across 12 user data tables
- **Handoff tracker** — HANDOFF.md added to repo documenting account transfers required at owner handover
