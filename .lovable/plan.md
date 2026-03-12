

## Update HIIT AI Coach System Prompt & Context

### What we're building
Rewrite the AI coach's system prompt to implement the full 5-layer AI architecture (Personality Coach, Training Intelligence, Nutrition Intelligence, Recovery & Health, Behaviour & Habit) with all the rules from your document. Also enhance the edge function to fetch user profile/assessment data so the AI can personalize responses.

### Changes

#### 1. Edge function system prompt (`supabase/functions/ai-coach/index.ts`)
- Replace the current basic `SYSTEM_PROMPT` with the comprehensive 5-layer prompt covering:
  - **Personality**: Best friend/motivator tone, energetic, encouraging, celebrating wins
  - **Training Intelligence**: Structured workout generation (warm-up → main → finisher → cool down), adaptive to goal/level/equipment/time, weekly plan rotation
  - **Nutrition Intelligence**: Calorie/macro calculations (weight×30-35, protein 2g/kg, fat 0.8g/kg), meal plan generation, hydration/supplement basics
  - **Recovery & Health**: Recovery scoring, adjusting intensity when fatigued, sleep/soreness awareness
  - **Behaviour & Habit**: Streak tracking, accountability, small wins psychology, progress reminders
- Add safety rules: no extreme diets, no overtraining advice, recommend medical help for pain
- Add the golden rule: long-term sustainable fitness focus
- Keep existing image analysis prompt

#### 2. Fetch user context in edge function
- Before calling the AI gateway, query the user's profile, assessment data, and recent activity from the database to inject as context into the system prompt
- This enables truly personalized responses (knowing their weight, goals, fitness level, equipment, etc.)

#### 3. Update welcome screen suggestions (`src/components/chat/ChatContainer.tsx`)
- Update the quick-start suggestions to better reflect the 5-layer capabilities:
  - "Create my weekly training plan"
  - "Calculate my daily calories & macros"
  - "Check my recovery score"
  - "What should I eat today?"

### Technical details
- Main change is the system prompt text — no DB changes needed
- User context query uses existing tables: `profiles`, `user_assessments`, `workout_progress`, `activity_logs`
- Edge function already has auth + Supabase client set up, just need to add queries before the AI call

