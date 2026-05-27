import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { aiChatCompletion } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch user's workout preferences
    const { data: preferences } = await supabase
      .from('workout_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch user's recent workout history
    const { data: recentWorkouts } = await supabase
      .from('workout_progress')
      .select('workout_id, completed_at')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(10);

    // Fetch all available workouts
    const { data: allWorkouts } = await supabase
      .from('workouts')
      .select('*')
      .order('rating', { ascending: false });

    if (!allWorkouts || allWorkouts.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const recentWorkoutIds = recentWorkouts?.map(w => w.workout_id) || [];

    // Score each workout based on user preferences
    const scoredWorkouts = allWorkouts.map(workout => {
      let score = 0;

      // Prefer workouts not recently done
      if (!recentWorkoutIds.includes(workout.id)) {
        score += 20;
      }

      // Match fitness level
      if (preferences?.fitness_level) {
        if (workout.difficulty === preferences.fitness_level) {
          score += 30;
        } else if (
          (preferences.fitness_level === 'intermediate' && workout.difficulty === 'beginner') ||
          (preferences.fitness_level === 'advanced' && workout.difficulty !== 'beginner')
        ) {
          score += 15;
        }
      }

      // Match target body areas
      if (preferences?.target_body_areas?.length > 0 && workout.body_areas?.length > 0) {
        const matchingAreas = workout.body_areas.filter((area: string) => 
          preferences.target_body_areas.includes(area)
        );
        score += matchingAreas.length * 10;
      }

      // Match available equipment
      if (preferences?.available_equipment?.length > 0 && workout.equipment?.length > 0) {
        const hasEquipment = workout.equipment.every((eq: string) => 
          preferences.available_equipment.includes(eq) || eq === 'none'
        );
        if (hasEquipment) {
          score += 20;
        }
      }

      // Match session duration preference
      if (preferences?.session_duration) {
        const durationDiff = Math.abs(workout.duration_minutes - preferences.session_duration);
        if (durationDiff <= 5) {
          score += 15;
        } else if (durationDiff <= 10) {
          score += 10;
        }
      }

      // Boost featured workouts
      if (workout.is_featured) {
        score += 5;
      }

      // Add rating bonus
      score += (workout.rating || 0) * 2;

      return { ...workout, score };
    });

    // Sort by score and take top recommendations
    const recommendations = scoredWorkouts
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // Generate AI message based on recommendations
    let aiMessage = "Here are some personalized workout recommendations based on your preferences and history.";

    if (preferences) {
      try {
        const aiResponse = await aiChatCompletion({
          model: "gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a friendly fitness coach. Generate a short, encouraging message (max 2 sentences) recommending workouts based on user preferences."
            },
            {
              role: "user",
              content: `User preferences: Goal: ${preferences.workout_goal}, Fitness level: ${preferences.fitness_level}, Days per week: ${preferences.days_per_week}. Top recommended workout: ${recommendations[0]?.title}. Generate an encouraging message.`
            }
          ],
          max_tokens: 1000,
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiMessage = aiData.choices?.[0]?.message?.content || aiMessage;
        }
      } catch (e) {
        console.error('AI message generation error:', e);
      }
    }

    return new Response(JSON.stringify({ 
      recommendations,
      message: aiMessage,
      preferences: preferences || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
