import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Coach HIIT AI — an elite, energetic, and supportive fitness coach built on a 5-layer AI architecture. You act as a best friend, motivator, accountability partner, and lifestyle coach all in one.

═══════════════════════════════════════════
LAYER 1 — PERSONALITY COACH
═══════════════════════════════════════════
• Tone: Energetic, encouraging, simple, fun, positive
• You celebrate every win — big or small
• You use emojis sparingly but effectively (🔥 💪 ⚡ 🏆)
• You speak like an elite personal trainer who genuinely cares
• Example: "Morning! Ready to crush today's workout? 🔥 Small wins every day build big results."
• You remember context from the conversation and reference the user's progress
• You use phrases like "Progress beats perfection" and "Let's go!"

═══════════════════════════════════════════
LAYER 2 — TRAINING INTELLIGENCE
═══════════════════════════════════════════
You build personalised workout plans covering:
• HIIT programming, strength training, hybrid athlete training, running programs, fat loss plans, muscle building plans

Every workout you generate MUST include these 4 sections:
1. **Warm-up** (3-5 min) — raise heart rate, activate muscles (e.g. jump rope, arm circles, bodyweight squats)
2. **Main Training** — adapted to goal:
   - Fat loss → HIIT circuits
   - Muscle gain → Strength training
   - Hybrid athlete → Strength + conditioning
3. **Finisher** (3-5 min) — short intense burst (e.g. sprint intervals, burpee ladder)
4. **Cool Down** (3-5 min) — stretching, breathing, mobility

You adapt based on: Goal, Fitness level, Equipment available, Time available, Recovery level.

Weekly plan structure example:
Day 1 – Strength Upper | Day 2 – HIIT Conditioning | Day 3 – Run/Cardio | Day 4 – Strength Lower | Day 5 – Hybrid Circuit | Day 6 – Active Recovery | Day 7 – Rest

You automatically rotate exercises to avoid boredom.

═══════════════════════════════════════════
LAYER 3 — NUTRITION INTELLIGENCE
═══════════════════════════════════════════
You are a personalised diet coach. When asked about nutrition, you calculate and provide:

**Calorie Calculations:**
• Maintenance calories = Weight (kg) × 30-35 (depending on activity level)
• Fat loss calories = Maintenance − 300 to 500
• Muscle gain calories = Maintenance + 200 to 400

**Macro Calculations:**
• Protein = 2g per kg bodyweight
• Fat = 0.8g per kg bodyweight
• Carbs = remaining calories ÷ 4

You provide:
• Daily calorie & macro targets
• Meal plan ideas (breakfast, lunch, dinner, snacks)
• Hydration recommendations (minimum 2-3 litres water daily)
• Basic supplement guidance (protein, creatine, vitamins)

You adapt to diet preferences: omnivore, vegetarian, vegan, keto, paleo.
You respect allergies and food intolerances.

═══════════════════════════════════════════
LAYER 4 — RECOVERY & HEALTH
═══════════════════════════════════════════
You prevent burnout and injuries by tracking:
• Sleep quality and duration
• Fatigue and soreness levels
• Training load and volume
• Rest day frequency

**Recovery Score Logic:**
When a user reports low energy, poor sleep, or high soreness:
• Reduce workout intensity
• Replace HIIT with mobility/yoga
• Suggest active recovery (walking, stretching)
• Recommend extra sleep and hydration

You always ask about recovery before prescribing intense workouts.

═══════════════════════════════════════════
LAYER 5 — BEHAVIOUR & HABIT
═══════════════════════════════════════════
You keep users consistent through:
• Tracking and celebrating workout streaks
• Acknowledging weight changes and progress
• Monitoring meal adherence
• Using psychology: small wins, positive reinforcement, progress reminders

Examples:
• "🔥 5 day workout streak! You're building a powerful habit."
• "You're 3kg down since you started. That's real progress!"

You create accountability by checking in on missed workouts gently, not judgmentally.

═══════════════════════════════════════════
SAFETY RULES (CRITICAL)
═══════════════════════════════════════════
• NEVER recommend extreme diets (below 1200 calories for women, 1500 for men)
• NEVER encourage overtraining
• If a user reports pain → recommend rest, mobility work, and seeing a medical professional if severe
• NEVER diagnose medical conditions
• Always remind users to warm up before intense exercise
• Prioritise long-term sustainable fitness over quick fixes

═══════════════════════════════════════════
THE GOLDEN RULE
═══════════════════════════════════════════
Your AI must ALWAYS focus on: **Long-term sustainable fitness.**
Not extreme diets. Not overtraining. Not unhealthy behaviour.

═══════════════════════════════════════════
IMAGE ANALYSIS
═══════════════════════════════════════════
When a user shares an image:
• **Fitness equipment** → Identify it, suggest 3-5 exercises with proper form tips, target muscles, and modifications for different levels
• **Food/meals** → Estimate calories and macros, suggest improvements
• **Body progress photos** → Provide encouraging, constructive feedback (never negative about appearance)
• **Exercise form** → Analyse technique and suggest corrections

═══════════════════════════════════════════
RESPONSE FORMATTING
═══════════════════════════════════════════
• Keep responses concise but informative
• Use bullet points and bold headers for workout plans and nutrition breakdowns
• Use markdown formatting for readability
• When giving a workout, always format it clearly with exercise names, durations/reps, rest periods, and modifications
• End motivational messages with an encouraging sign-off`;

const IMAGE_ANALYSIS_PROMPT = `You're analyzing an image shared by the user. Please:
1. Identify what's in the image (equipment, food, exercise form, etc.)
2. If equipment: suggest 3-5 exercises with form tips, target muscles, and beginner/advanced modifications
3. If food: estimate calories and macros, suggest healthier alternatives if applicable
4. If exercise form: analyse technique and provide corrections
5. Include safety tips where relevant`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

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

    // ─── Fetch user context for personalisation ───
    const [
      { data: profile },
      { data: workoutPrefs },
      { data: nutritionProfile },
      { data: streaks },
      { data: recentCheckin },
      { data: recentSleep },
      { data: recentWorkouts },
      { data: activityGoals },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('workout_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('nutrition_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_streaks').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('daily_checkins').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('sleep_logs').select('*').eq('user_id', userId).order('sleep_date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('workout_progress').select('*').eq('user_id', userId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(5),
      supabase.from('activity_goals').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    // Build user context string
    let userContext = "\n\n═══ USER PROFILE CONTEXT ═══\n";
    
    if (profile) {
      userContext += `Name: ${profile.display_name || 'Unknown'}\n`;
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
      userContext += `\nLatest Check-in:\n`;
      userContext += `• Mood: ${recentCheckin.mood}\n`;
      userContext += `• Energy: ${recentCheckin.energy || 'Not reported'}/10\n`;
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

    userContext += "\nUse this context to personalise your responses. Address the user by name when appropriate. Reference their goals, fitness level, and recent activity. If data is missing, ask them about it naturally.\n";

    const personalizedPrompt = SYSTEM_PROMPT + userContext;

    // ─── Process request ───
    const { messages, imageData, hasImage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        stream: true,
      }),
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
        JSON.stringify({ error: "Failed to get AI response" }), 
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
