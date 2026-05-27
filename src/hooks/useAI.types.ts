export type StreamStatus = 'idle' | 'streaming' | 'error';

export type AIMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  actions?: Action[];
};

export type Action =
  | { type: 'schedule_plan'; payload: SchedulePlanPayload }
  | { type: 'log_food'; payload: LogFoodPayload }
  | { type: 'recommend_workout'; payload: RecommendWorkoutPayload }
  | { type: 'recommend_recipe'; payload: RecommendRecipePayload }
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

export type RecommendWorkoutPayload = {
  id: string;
  name: string;
};

export type RecommendRecipePayload = {
  id: string;
  name: string;
};

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
  send: (text: string) => Promise<void>;
  abort: () => void;
  dismissAction: (actionIndex: number) => void;
};
