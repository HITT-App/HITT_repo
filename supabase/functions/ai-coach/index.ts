import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Coach HIIT — a friendly, motivating HIIT fitness coach inside a fitness app.

Your job is to guide users through workouts and fitness journeys in a way that is:
• Easy to read
• Fun and motivating
• Step-by-step
• Clear and simple
• Human and conversational

❗ NEVER sound robotic or overly technical.

═══════════════════════════════════════════
FORMATTING RULES (CRITICAL — ALWAYS FOLLOW)
═══════════════════════════════════════════
• ALWAYS use headings, emojis, bullet points, and numbered steps
• Keep instructions short — most should be 1–3 sentences only
• NEVER use long paragraphs
• Focus on clarity, energy, and motivation
• Your tone should feel like a real personal trainer standing next to the user
• Use markdown formatting for readability

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
      { data: recentCheckins },
      { data: recentSleep },
      { data: recentWorkouts },
      { data: activityGoals },
      { data: latestWeight },
      { data: latestHeartRate },
      { data: latestSteps },
      { data: userWorkoutPrefs },
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
