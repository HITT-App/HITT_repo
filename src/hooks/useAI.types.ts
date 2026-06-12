export type StreamStatus = 'idle' | 'streaming' | 'error';

export type AIMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  actions?: Action[];
  // In-memory only — consumer-injected confirmation messages.
  // Visible in UI, but excluded from AI context and not persisted to DB.
  synthetic?: boolean;
};

export type Action =
  | { type: 'schedule_plan'; payload: SchedulePlanPayload }
  | { type: 'log_food'; payload: LogFoodPayload }
  | { type: 'set_goals'; payload: SetGoalsPayload }
  | { type: 'recommend_workout'; payload: RecommendWorkoutPayload }
  | { type: 'recommend_workout_plan'; payload: RecommendWorkoutPlanPayload }
  | { type: 'recommend_recipe'; payload: RecommendRecipePayload }
  | { type: 'recommend_meal_plan'; payload: RecommendMealPlanPayload }
  | { type: 'body_scan_prompt' };

export type SchedulePlanPayload = {
  goal: string;
  daysPerWeek: number;
  selectedDays: number[]; // 0=Sun..6=Sat
  sessionMinutes: number;
};

export type LogFoodPayload = {
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type RecommendWorkoutPayload =
  | { source: 'catalogue'; id: string; name: string }
  | {
      source: 'ai_generated'
      title: string
      description: string
      exercises_snapshot: ExerciseSnapshot[]
      estimated_duration_minutes: number
      estimated_calories: number
    }

export type ExerciseSnapshot = {
  title: string
  description: string | null
  duration_seconds: number | null
  sets: number | null
  reps: number | null
  order_index: number
  body_area: string | null
  thumbnail_url: null
  video_url: null
}

export type WorkoutInPlan = {
  scheduled_date: string
  title: string
  description: string
  estimated_duration_minutes: number
  estimated_calories: number
  exercises: ExerciseSnapshot[]
}

export type RecommendWorkoutPlanPayload = {
  title: string
  goal: string
  start_date: string
  workouts: WorkoutInPlan[]
}

export type SetGoalsPayload = {
  goal_type: string;
  target_text: string;
  target_date?: string | null; // YYYY-MM-DD or null/omitted
};

export type RecommendRecipePayload = {
  id: string;
  name: string;
};

export type MealInPlan = {
  meal_type: string
  name: string
  emoji: string | null
  description: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  ingredients: Array<{ amount: string; unit: string; name: string }>
  instructions: string[]
}

export type RecommendMealPlanPayload = {
  meals: MealInPlan[]
}

// SSE chunk format emitted by the structured edge function path
export type StreamChunk =
  | { type: 'text'; delta: string }
  | { type: 'action'; action: Action }
  | { type: 'done' };

export type UseAIReturn = {
  messages: AIMessage[];
  status: StreamStatus;
  error: Error | null;
  // Partial assistant text while streaming; cleared and moved to messages on completion
  streamingText: string;
  // Actions emitted during the latest stream; cleared when a new send() begins
  pendingActions: Action[];
  // True once the mount-time conversation + history load has resolved
  isInitialized: boolean;
  send: (text: string) => Promise<void>;
  // Like send(), but the prompt is not added as a visible user message or persisted.
  // Use for system-driven triggers (greeting, goals flow) where the prompt is internal.
  greet: (prompt: string) => Promise<void>;
  abort: () => void;
  dismissAction: (actionIndex: number) => void;
  // Inserts an assistant message into the conversation (DB + state).
  // synthetic defaults to true (schedule/recipe confirmations); pass false for food/goal confirmations.
  appendAssistantMessage: (text: string, synthetic?: boolean) => Promise<void>;
  // Exposed for confirmation handlers — write only after user taps Confirm.
  logFoodSilent: (payload: LogFoodPayload) => Promise<void>;
  setGoalsSilent: (payload: SetGoalsPayload) => Promise<void>;
  directAnswer: (userText: string, answerText: string) => Promise<void>;
};
