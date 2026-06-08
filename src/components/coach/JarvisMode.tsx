import React, { useState, useCallback, useEffect, useRef } from 'react';
import { HEmoji } from "@/components/HEmoji";
import { useNavigate } from 'react-router-dom';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, X, Loader2, StopCircle, Target, Send, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTTS } from '@/contexts/TTSContext';
import { useAI } from '@/hooks/useAI';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { AIWorkoutCard } from './AIWorkoutCard';
import { AIWorkoutPlanCard } from './AIWorkoutPlanCard';
import { FoodConfirmCard } from './FoodConfirmCard';
import { GoalConfirmCard } from './GoalConfirmCard';
import { MultiChoiceCard } from './MultiChoiceCard';
import type { RecommendWorkoutPayload, RecommendWorkoutPlanPayload, LogFoodPayload, SetGoalsPayload } from '@/hooks/useAI.types';

// Renders AI response text with paragraph spacing, bullet lists, and bold.
// Strips excessive emoji usage (keeps max 1 per paragraph).
function formatResponse(text: string): React.ReactNode[] {
  const emojiRe = /[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}]/gu;

  const stripExcessEmoji = (str: string) => {
    const matches = str.match(emojiRe) ?? [];
    if (matches.length <= 1) return str;
    let kept = 0;
    return str.replace(emojiRe, (m) => (kept++ === 0 ? m : ''));
  };

  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  return paragraphs.map((para, pi) => {
    const lines = para.split('\n');
    const isBulletList = lines.some(l => /^[-•*]\s/.test(l.trim()));

    if (isBulletList) {
      return (
        <ul key={pi} className="space-y-1.5">
          {lines.map((line, li) => {
            const clean = stripExcessEmoji(line.replace(/^[-•*]\s*/, '').trim());
            if (!clean) return null;
            return (
              <li key={li} className="flex items-start gap-2 text-sm leading-relaxed">
                <span className="text-primary mt-0.5 shrink-0 text-xs">•</span>
                <span dangerouslySetInnerHTML={{ __html: bold(clean) }} />
              </li>
            );
          })}
        </ul>
      );
    }

    const cleaned = stripExcessEmoji(para);
    return (
      <p key={pi} className="text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: bold(cleaned.replace(/\n/g, '<br/>')) }} />
    );
  });
}

function bold(str: string): string {
  return str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function isFoodRecallQuestion(text: string): boolean {
  const t = text.trim();
  return (
    /\b(what|show|list|tell me).{0,20}(have i|did i|i'?ve|i have)\s+eaten\b/i.test(t) ||
    /\bhow (many|much)\s+(calories?|kcal|cal)\b.{0,30}(today|eaten|consumed|had|so far)/i.test(t) ||
    /\bhow (many|much).{0,20}(calories?|kcal|cal).{0,20}today/i.test(t) ||
    /\bwhat'?s? my (calorie|food|caloric|macro)\s+(intake|total|count|diary|log)\b/i.test(t) ||
    /\bwhat foods? have i (eaten|had|logged)\b/i.test(t)
  );
}

async function queryTodayDiary(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "I couldn't retrieve your food diary right now.";

  const todayBoundary = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
  const { data: logs, error } = await supabase
    .from('meal_logs')
    .select('custom_name, calories, protein_grams, carbs_grams, fat_grams, fiber_grams')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('logged_at', todayBoundary)
    .order('logged_at', { ascending: true });

  if (error || !logs) return "I couldn't retrieve your food diary right now.";
  if (logs.length === 0) return "You haven't logged any food today yet.";

  const totalCals = logs.reduce((s, r) => s + (r.calories ?? 0), 0);
  const totalProtein = logs.reduce((s, r) => s + (r.protein_grams ?? 0), 0);
  const totalCarbs = logs.reduce((s, r) => s + (r.carbs_grams ?? 0), 0);
  const totalFat = logs.reduce((s, r) => s + (r.fat_grams ?? 0), 0);
  const totalFibre = logs.reduce((s, r) => s + (r.fiber_grams ?? 0), 0);

  const foodList = logs.map(r => r.custom_name).join(', ');
  return `Today you've logged: ${foodList}.\n\nTotal: ${Math.round(totalCals)} kcal · ${Math.round(totalProtein)}g protein · ${Math.round(totalCarbs)}g carbs · ${Math.round(totalFat)}g fat · ${Math.round(totalFibre)}g fibre`;
}

interface JarvisModeProps {
  onClose: () => void;
  healthProfile?: string;
  prefillMessage?: string | null;
  sharePromptDetail?: {
    workoutId: string;
    workoutTitle: string;
    durationMin: number;
    calories: number;
    pbs?: Array<{ kind: 'duration' | 'calories' | 'streak'; label: string; value: number; previousBest: number }>;
  } | null;
}

type RecommendedWorkout = {
  id: string;
  title: string;
  category: string | null;
  difficulty: string | null;
  duration_minutes: number | null;
  body_areas: string[] | null;
  thumbnail_url?: string | null;
};

type RecommendedRecipe = {
  id: string;
  name: string;
  emoji: string | null;
  category: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function JarvisMode({ onClose, healthProfile, sharePromptDetail, prefillMessage }: JarvisModeProps) {
  const navigate = useNavigate();
  const tts = useTTS();
  const ai = useAI();
  const keyboardHeight = useKeyboardHeight();
  const [typedText, setTypedText] = useState('');

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(32).fill(4));
  const [pendingBodyScan, setPendingBodyScan] = useState(false);
  const [pendingSchedule, setPendingSchedule] = useState<{
    goal: string; daysPerWeek: number; selectedDays: number[]; sessionMinutes: number;
  } | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<
    | { type: 'food'; payload: LogFoodPayload }
    | { type: 'goal'; payload: SetGoalsPayload }
    | null
  >(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingGoalPrompt, setPendingGoalPrompt] = useState(false);
  const [todayKcalTotal, setTodayKcalTotal] = useState<number | undefined>(undefined);
  const [recommendedWorkout, setRecommendedWorkout] = useState<RecommendedWorkout | null>(null);
  const [recommendedRecipe, setRecommendedRecipe] = useState<RecommendedRecipe | null>(null);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [aiWorkout, setAIWorkout] = useState<(RecommendWorkoutPayload & { source: 'ai_generated' }) | null>(null);
  const [aiWorkoutPlan, setAIWorkoutPlan] = useState<RecommendWorkoutPlanPayload | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const responseEndRef = useRef<HTMLDivElement | null>(null);
  const isListeningRef = useRef(false);
  const isConnectingRef = useRef(false);
  // Tracks how many pendingActions have been dispatched to prevent re-dispatch on re-render.
  // Reset to 0 when pendingActions is cleared (start of each new send/greet).
  const dispatchedCountRef = useRef(0);
  // Prevents the greeting from firing more than once per JarvisMode mount
  const greetingFiredRef = useRef(false);

  const handleSend = useCallback(async (text: string) => {
    if (isFoodRecallQuestion(text)) {
      const answer = await queryTodayDiary();
      await ai.directAnswer(text, answer);
    } else {
      ai.send(text);
    }
  }, [ai]);

  // ─── Voice (keep unchanged) ──────────────────────────────────────────────

  const updateVisualizer = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      setVisualizerData(Array.from(dataArray.slice(0, 32)));
    }
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  }, []);

  const startListening = useCallback(async () => {
    if (isListeningRef.current || isConnectingRef.current) return;
    isConnectingRef.current = true;
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) {
        console.error('Failed to get scribe token:', error);
        isConnectingRef.current = false;
        return;
      }

      await scribe.connect({
        token: data.token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });

      isListeningRef.current = true;
      isConnectingRef.current = false;
      setIsListening(true);
      setTranscript('');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        source.connect(analyserRef.current);
        updateVisualizer();
      } catch (err) {
        console.error('Visualizer setup failed:', err);
      }
    } catch (error) {
      console.error('Failed to start listening:', error);
      isListeningRef.current = false;
      isConnectingRef.current = false;
      setIsListening(false);
    }
  }, [updateVisualizer]); // scribe added below after declaration

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    isConnectingRef.current = false;
    try { scribe.disconnect(); } catch { /* already disconnected */ }
    setIsListening(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    setVisualizerData(new Array(32).fill(4));
  }, []); // scribe added below after declaration

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      if (!isListeningRef.current) return;
      setTranscript(data.text);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    },
    onCommittedTranscript: async (data) => {
      if (!isListeningRef.current) return;
      const finalTranscript = data.text.trim();
      if (!finalTranscript || ai.status === 'streaming') return;
      setTranscript(finalTranscript);
      stopListening();
      await handleSend(finalTranscript);
    },
  });

  // ─── Schedule helpers ─────────────────────────────────────────────────────

  const mapToScheduleDates = (
    planItems: { workout_id: string }[],
    selectedDays: number[]
  ): { workout_id: string; scheduled_date: string }[] => {
    const sorted = [...selectedDays].sort((a, b) => a - b);
    const today = new Date();
    const todayDow = today.getDay();
    const upcomingDates: Date[] = [];
    for (let week = 0; week < 4; week++) {
      for (const dow of sorted) {
        const diff = ((dow - todayDow + 7) % 7) + week * 7;
        if (diff === 0 && week === 0) continue;
        const d = new Date(today);
        d.setDate(today.getDate() + (diff || 7));
        upcomingDates.push(d);
      }
    }
    upcomingDates.sort((a, b) => a.getTime() - b.getTime());
    return planItems.slice(0, upcomingDates.length).map((item, i) => ({
      workout_id: item.workout_id,
      scheduled_date: upcomingDates[i].toISOString().split('T')[0],
    }));
  };

  const defaultDays = (n: number): number[] => {
    const presets: Record<number, number[]> = {
      1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6],
    };
    return presets[Math.max(1, Math.min(6, n))] ?? [1, 3, 5];
  };

  // ─── DB fetch helpers ─────────────────────────────────────────────────────

  const fetchRecommendedWorkout = async (id: string): Promise<RecommendedWorkout | null> => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, title, category, difficulty, duration_minutes, body_areas, thumbnail_url')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) { console.warn('[Jarvis] Failed to fetch recommended workout:', id, error); return null; }
      return data as RecommendedWorkout;
    } catch (err) { console.error('[Jarvis] fetchRecommendedWorkout error:', err); return null; }
  };

  const fetchRecommendedRecipe = async (id: string): Promise<RecommendedRecipe | null> => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, emoji, category, meal_type, calories, protein_g, carbs_g, fat_g')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) { console.warn('[Jarvis] Failed to fetch recommended recipe:', id, error); return null; }
      return data as RecommendedRecipe;
    } catch (err) { console.error('[Jarvis] fetchRecommendedRecipe error:', err); return null; }
  };

  // ─── Action handlers ──────────────────────────────────────────────────────

  const confirmPendingAction = async () => {
    if (!pendingConfirmation || isConfirming) return;
    setIsConfirming(true);
    try {
      if (pendingConfirmation.type === 'food') {
        await ai.logFoodSilent(pendingConfirmation.payload);
        await ai.appendAssistantMessage(
          `Logged: ${pendingConfirmation.payload.name} (${pendingConfirmation.payload.calories} kcal, ${pendingConfirmation.payload.category})`,
          false,
        );
      } else if (pendingConfirmation.type === 'goal') {
        await ai.setGoalsSilent(pendingConfirmation.payload);
        await ai.appendAssistantMessage(`Goal set: ${pendingConfirmation.payload.target_text}`, false);
      }
      setPendingConfirmation(null);
    } catch (err) {
      console.error('[Jarvis] confirmPendingAction failed:', err);
    } finally {
      setIsConfirming(false);
    }
  };

  const dismissPendingAction = async () => {
    if (!pendingConfirmation) return;
    setPendingConfirmation(null);
    await ai.appendAssistantMessage('No problem, skipped that one.', false);
  };

  const handleGoalPromptSetNow = useCallback(() => {
    setPendingGoalPrompt(false);
    ai.greet(`[ONBOARDING] The user wants to set up their fitness goals. They have no goals set yet. Introduce yourself as Coach HIIT in one warm sentence, then ask: "What's your main fitness goal right now?" — no lists, no options, keep it conversational.`);
  }, [ai]);

  const handleGoalPromptLater = useCallback(async () => {
    setPendingGoalPrompt(false);
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return;
    await supabase.from('profiles').update({
      goal_prompt_preference: 'later',
      goal_prompt_last_at: new Date().toISOString(),
    }).eq('user_id', userId);
  }, []);

  const handleGoalPromptNever = useCallback(async () => {
    setPendingGoalPrompt(false);
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return;
    await supabase.from('profiles').update({ goal_prompt_preference: 'never' }).eq('user_id', userId);
  }, []);

  const confirmSchedule = async () => {
    if (!pendingSchedule || isAddingSchedule) return;
    setIsAddingSchedule(true);
    await createScheduleFromJarvis(pendingSchedule);
    setPendingSchedule(null);
    setIsAddingSchedule(false);
  };

  const createScheduleFromJarvis = async (params: {
    goal: string; daysPerWeek: number; selectedDays: number[]; sessionMinutes: number;
  }) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-workout-plan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            goal: params.goal,
            days: params.daysPerWeek * 4,
            sessions_per_week: params.daysPerWeek,
            duration_minutes: params.sessionMinutes,
            title: `${params.goal} Plan`,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Plan generator returned ${res.status}`);
      }

      const data = await res.json();
      const planItems: { day_index: number; workout_id: string }[] = data.items ?? [];

      const days = params.selectedDays?.length ? params.selectedDays : defaultDays(params.daysPerWeek);
      const rows = mapToScheduleDates(planItems, days);

      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error('No user session');
      if (!rows.length) throw new Error('Plan generator returned no workouts');

      await supabase.from('scheduled_workouts').insert(
        rows.map(r => ({ user_id: userId, workout_id: r.workout_id, scheduled_date: r.scheduled_date }))
      );

      await ai.appendAssistantMessage('✅ Your schedule is set! Taking you there now…');

      setTimeout(() => {
        handleClose();
        navigate('/schedule');
      }, 1800);
    } catch (err) {
      console.error('[Jarvis] Schedule creation failed:', err);
      await ai.appendAssistantMessage(
        'Sorry, I couldn\'t add the schedule right now. You can add workouts manually from the Schedule tab.'
      );
    }
  };

  const scheduleRecommendedWorkout = async (workoutId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const scheduledDate = tomorrow.toISOString().split('T')[0];

      const { error } = await supabase.from('scheduled_workouts').insert({
        user_id: userId,
        workout_id: workoutId,
        scheduled_date: scheduledDate,
      });
      if (error) throw error;

      setRecommendedWorkout(null);
      await ai.appendAssistantMessage('✅ Added to tomorrow\'s schedule. See you then!');
    } catch (err) {
      console.error('[Jarvis] Schedule workout failed:', err);
      await ai.appendAssistantMessage(
        'Sorry, I couldn\'t add that to your schedule. You can add it manually from the workout page.'
      );
    }
  };

  const logRecommendedRecipe = async (recipe: RecommendedRecipe) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase.from('meal_logs').insert({
        user_id: userId,
        custom_name: recipe.name,
        category: recipe.meal_type,
        calories: recipe.calories,
        protein_grams: recipe.protein_g,
        carbs_grams: recipe.carbs_g,
        fat_grams: recipe.fat_g,
        fiber_grams: 0,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;

      setRecommendedRecipe(null);
      await ai.appendAssistantMessage(`✅ Logged ${recipe.name} as ${recipe.meal_type}.`);
    } catch (err) {
      console.error('[Jarvis] Recipe log failed:', err);
      await ai.appendAssistantMessage(
        'Sorry, I couldn\'t log that meal. You can log it manually from the Nutrition tab.'
      );
    }
  };

  const triggerGoalsFlow = useCallback(async () => {
    let prompt = '';
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        const { data: prefs } = await supabase
          .from('workout_preferences')
          .select('workout_goal, days_per_week, session_duration, fitness_level')
          .eq('user_id', userId)
          .maybeSingle();
        if (prefs?.workout_goal) {
          prompt = `[GOALS_REVIEW] The user tapped "Goals". Their current settings: goal="${prefs.workout_goal}", ${prefs.days_per_week} days/week, ${prefs.session_duration}-minute sessions, fitness level="${prefs.fitness_level}". Summarise these back to them in a warm, encouraging 2-sentence way, then ask if they'd like to adjust anything — different goal, more/fewer days, or longer/shorter sessions. Keep it brief and conversational.`;
        }
      }
    } catch {}

    if (!prompt) {
      prompt = `[ONBOARDING] The user wants to set up their fitness goals. They have no goals set yet. Introduce yourself as Coach HIIT in one warm sentence, then ask: "What's your main fitness goal right now?" — no lists, no options, keep it conversational.`;
    }

    ai.greet(prompt);
  }, [ai]);

  const handleClose = () => {
    ai.abort();
    stopListening();
    tts.cancel();
    onClose();
  };

  // ─── Effects ──────────────────────────────────────────────────────────────

  // Query today's kcal total when a food confirmation card appears (feeds the calorie ring)
  useEffect(() => {
    if (pendingConfirmation?.type !== 'food') { setTodayKcalTotal(undefined); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const todayBoundary = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
      supabase
        .from('meal_logs')
        .select('calories')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .gte('logged_at', todayBoundary)
        .then(({ data }) => {
          if (data) setTodayKcalTotal(data.reduce((s, r) => s + (r.calories ?? 0), 0));
        });
    });
  }, [pendingConfirmation?.type]);

  // Fire the greeting once, after the hook has finished loading history
  useEffect(() => {
    if (!ai.isInitialized || greetingFiredRef.current) return;
    greetingFiredRef.current = true;

    const doGreeting = async () => {
      let hasSchedule = true;
      let hasWorkoutToday = true;
      let shouldPromptGoal = false;

      const hasHistory = ai.messages.length > 0;

      try {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;
        if (userId) {
          const today = new Date().toISOString().split('T')[0];

          const [
            { count: futureCount },
            { count: todayCount },
            { count: activeGoalCount },
            { data: profilePrefs },
          ] = await Promise.all([
            supabase.from('scheduled_workouts').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('scheduled_date', today),
            supabase.from('scheduled_workouts').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('scheduled_date', today),
            (supabase as any).from('user_goals').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),
            supabase.from('profiles').select('goal_prompt_preference, goal_prompt_last_at').eq('user_id', userId).maybeSingle(),
          ]);

          hasSchedule = (futureCount ?? 0) > 0;
          hasWorkoutToday = (todayCount ?? 0) > 0;

          // Only offer the goal card to returning users — onboarding handles goal-collection
          // conversationally for brand-new users (no history AND no schedule).
          const isNewUser = !hasHistory && !hasSchedule;
          if (!isNewUser) {
            const hasActiveGoal = (activeGoalCount ?? 0) > 0;
            const pref = profilePrefs?.goal_prompt_preference ?? null;
            // Supabase returns TIMESTAMPTZ as "2026-05-31 14:51:25+00" (space, no colon in offset).
            // iOS Safari rejects that format — normalise to ISO 8601 before parsing.
            const rawLastAt = profilePrefs?.goal_prompt_last_at;
            const lastAt = rawLastAt
              ? new Date(rawLastAt.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'))
              : null;
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            shouldPromptGoal =
              !hasActiveGoal &&
              pref !== 'never' &&
              (lastAt === null || isNaN(lastAt.getTime()) || lastAt < sevenDaysAgo);

            if (shouldPromptGoal) {
              setPendingGoalPrompt(true);
              await supabase.from('profiles').update({ goal_prompt_last_at: new Date().toISOString() }).eq('user_id', userId);
            }
          }
        }
      } catch {
        hasSchedule = true;
        hasWorkoutToday = true;
      }

      await new Promise(r => setTimeout(r, 400));

      if (prefillMessage) {
        ai.send(prefillMessage);
        return;
      }

      // Goal card owns the screen — no greeting when it's showing.
      if (shouldPromptGoal) return;

      const isOnboarding = !hasHistory && !hasSchedule;

      const greetingPrompt = sharePromptDetail
        ? (sharePromptDetail.pbs && sharePromptDetail.pbs.length > 0
            ? `[POST_WORKOUT_PB] The user just finished a ${sharePromptDetail.durationMin}-minute ${sharePromptDetail.workoutTitle} and hit a new personal best: ${sharePromptDetail.pbs.map(pb => `${pb.label} (${pb.value}, previous best ${pb.previousBest})`).join('; ')}. Celebrate this specifically and enthusiastically — name the PB. Then say they should share it because this one matters. Keep it to 2-3 sentences, genuinely excited tone, use one 🏆 emoji.`
            : `[POST_WORKOUT_SHARE] The user just finished a ${sharePromptDetail.durationMin}-minute ${sharePromptDetail.workoutTitle} workout, burning around ${sharePromptDetail.calories} calories. Congratulate them warmly in one sentence — be specific about what they just did, not generic. Then ask if they want to share it on the community feed. Keep it to 2 sentences total, encouraging tone, no follow-up questions beyond the share question.`)
        : isOnboarding
          ? `[ONBOARDING] This user has no schedule yet. Introduce yourself as Coach HIIT in one warm sentence, then say you want to ask a couple of quick questions to build their perfect plan, then ask just this: "What's your main fitness goal right now?" — no lists, no options, keep it conversational.`
          : hasHistory && !hasSchedule
            ? `[GREETING] Welcome this user back in one warm sentence. Then immediately say you notice they haven't set up a workout schedule yet and ask if they want to do that now. Keep it brief and positive — do not repeat questions already in the chat history above.`
            : hasHistory && hasSchedule && !hasWorkoutToday
              ? `[GREETING_NO_TODAY] The user has just re-opened our conversation. They have a schedule but no workout planned for today. In one warm sentence, welcome them back. Then suggest ONE specific workout from the WORKOUTS CATALOGUE that fits their goal and emit the recommend_workout tool at the end. Keep the whole response to 2 sentences max — let the card do the talking.`
              : hasHistory
                ? `[GREETING] The user has just re-opened our conversation. Give a warm 1-sentence welcome back. Then ask what they'd like to work on today. Do not address, reference, or continue any prior questions or topics from the chat history — just greet and invite.`
                : healthProfile?.trim()
                  ? `[GREETING] Give me a warm 2-sentence spoken greeting. First sentence: reference something specific from my biometric data (workout frequency, sleep, steps, or activity level) — be personal, not generic. Second sentence: ask what I want to work on today. Sound like a coach who knows me.\n\nMy data:\n${healthProfile}`
                  : `[GREETING] Welcome me warmly in 2 short sentences. First: introduce yourself as my AI coach. Second: ask what I want to work on today.`;

      ai.greet(greetingPrompt);
    };

    doGreeting();
  }, [ai.isInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dispatch incoming actions to their handlers. Reset counter when actions are cleared.
  useEffect(() => {
    if (ai.pendingActions.length === 0) {
      dispatchedCountRef.current = 0;
      return;
    }
    const newActions = ai.pendingActions.slice(dispatchedCountRef.current);
    for (const action of newActions) {
      switch (action.type) {
        case 'schedule_plan':
          setPendingSchedule(action.payload);
          break;
        case 'log_food':
          setPendingConfirmation({ type: 'food', payload: action.payload });
          break;
        case 'set_goals':
          setPendingConfirmation({ type: 'goal', payload: action.payload });
          break;
        case 'recommend_workout':
          if (action.payload.source === 'catalogue') {
            fetchRecommendedWorkout(action.payload.id).then(w => { if (w) setRecommendedWorkout(w); });
          } else {
            setAIWorkout(action.payload as RecommendWorkoutPayload & { source: 'ai_generated' });
          }
          break;
        case 'recommend_workout_plan':
          setAIWorkoutPlan(action.payload);
          break;
        case 'recommend_recipe':
          fetchRecommendedRecipe(action.payload.id).then(r => { if (r) setRecommendedRecipe(r); });
          break;
        case 'body_scan_prompt':
          setPendingBodyScan(true);
          break;
      }
    }
    dispatchedCountRef.current = ai.pendingActions.length;
  }, [ai.pendingActions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to latest content
  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ai.streamingText, transcript, ai.messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      ai.abort();
      tts.cancel();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pb-3 border-b border-border shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 44px) + 0.5rem)" }}
      >
        <h2 className="text-base font-semibold text-foreground">Voice Mode</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-muted-foreground h-9 w-9">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable conversation */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* Loading history indicator */}
        {!ai.isInitialized && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}

        {/* Persisted conversation history */}
        {ai.messages.filter(msg => msg.content.trim() !== '').map((msg, i) => (
          msg.role === 'assistant' ? (
            <div key={msg.id ?? i} className="bg-secondary/40 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-2 uppercase">Coach HIIT</p>
              <div className="text-sm text-foreground leading-relaxed space-y-2">
                {formatResponse(msg.content)}
              </div>
            </div>
          ) : (
            <div key={msg.id ?? i} className="bg-primary/10 rounded-2xl px-4 py-3 ml-8">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1 uppercase">You</p>
              <p className="text-sm text-foreground">{msg.content}</p>
            </div>
          )
        ))}

        {/* Goal-prompt multi-choice card — rendered before streaming so it's the first visible thing */}
        {pendingGoalPrompt && (
          <MultiChoiceCard
            icon={<Flag className="w-6 h-6 text-primary" strokeWidth={2.1} />}
            eyebrow="Set a goal"
            heading="What are you training toward?"
            subtext="I coach better with a target. Takes 30 seconds to set."
            choices={[
              { label: 'Set my goal', variant: 'primary', onSelect: handleGoalPromptSetNow },
              { label: 'Remind me later', variant: 'outline', onSelect: handleGoalPromptLater },
              { label: "Don't ask again", variant: 'ghost', onSelect: handleGoalPromptNever },
            ]}
          />
        )}

        {/* Streaming response (in progress) */}
        {ai.status === 'streaming' && ai.streamingText && (
          <div className="bg-secondary/40 rounded-2xl px-4 py-3">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-2 uppercase">Coach HIIT</p>
            <div className="text-sm text-foreground leading-relaxed space-y-2">
              {formatResponse(ai.streamingText)}
            </div>
          </div>
        )}

        {/* Processing indicator (before first token) */}
        {ai.status === 'streaming' && !ai.streamingText && (
          <div className="flex items-center gap-2 px-4 py-3 bg-secondary/40 rounded-2xl">
            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
            <span className="text-sm text-muted-foreground">Thinking…</span>
          </div>
        )}

        {/* Current in-progress transcript (while mic is active) */}
        {isListening && transcript && (
          <div className="bg-primary/10 rounded-2xl px-4 py-3 ml-8 opacity-70">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1 uppercase">You</p>
            <p className="text-sm text-foreground italic">{transcript}</p>
          </div>
        )}

        {/* Visualizer */}
        {(isListening || tts.isSpeaking) && (
          <div className="flex items-center justify-center gap-0.5 h-6">
            {visualizerData.map((value, i) => (
              <div key={i}
                className={cn("w-0.5 rounded-full transition-all duration-75",
                  isListening ? "bg-primary" : "bg-accent")}
                style={{ height: `${Math.max(3, (value / 255) * 22)}px` }}
              />
            ))}
          </div>
        )}

        {/* Body scan CTA */}
        {pendingBodyScan && (
          <div className="bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3 space-y-3">
            <p className="text-sm font-semibold text-foreground"><HEmoji name="camera" size={16} style={{verticalAlign:'middle', marginRight:4}}/>Body Scan</p>
            <p className="text-xs text-muted-foreground">
              Take 3 photos (front, side, back) — I'll analyse your physique and personalise your plan around what I find.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-primary text-primary-foreground text-xs h-9"
                onClick={() => {
                  setPendingBodyScan(false);
                  handleClose();
                  navigate('/body-scan');
                }}
              >
                Open Body Scan →
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 text-xs h-9 text-muted-foreground"
                onClick={() => setPendingBodyScan(false)}
              >
                Skip for now
              </Button>
            </div>
          </div>
        )}

        {/* Food / goal confirmation cards */}
        {pendingConfirmation?.type === 'food' && (
          <FoodConfirmCard
            payload={pendingConfirmation.payload}
            consumedToday={todayKcalTotal}
            onConfirm={confirmPendingAction}
            onDismiss={dismissPendingAction}
            isConfirming={isConfirming}
          />
        )}
        {pendingConfirmation?.type === 'goal' && (
          <GoalConfirmCard
            payload={pendingConfirmation.payload}
            onConfirm={confirmPendingAction}
            onDismiss={dismissPendingAction}
            isConfirming={isConfirming}
          />
        )}

        {/* Schedule confirmation card */}
        {pendingSchedule && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-3">
            <p className="text-sm font-semibold text-foreground">Your plan is ready 🗓️</p>
            <p className="text-xs text-muted-foreground">
              {pendingSchedule.daysPerWeek}× per week · {pendingSchedule.sessionMinutes} min sessions · {pendingSchedule.goal}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-primary text-primary-foreground text-xs h-9"
                onClick={confirmSchedule}
                disabled={isAddingSchedule}
              >
                {isAddingSchedule
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : 'Add to my schedule calendar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 text-xs h-9 text-muted-foreground"
                onClick={() => setPendingSchedule(null)}
                disabled={isAddingSchedule}
              >
                Maybe later
              </Button>
            </div>
          </div>
        )}

        {/* Post-workout share card */}
        {sharePromptDetail && (
          <div className={
            sharePromptDetail.pbs && sharePromptDetail.pbs.length > 0
              ? "bg-amber-500/10 border border-amber-500/40 rounded-2xl px-4 py-3 space-y-3"
              : "bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-3"
          }>
            <p className="text-sm font-semibold text-foreground">
              {sharePromptDetail.pbs && sharePromptDetail.pbs.length > 0
                ? <><HEmoji name="leaderboard" size={16} style={{verticalAlign:'middle', marginRight:4}}/>New personal best!</>
                : <><HEmoji name="announcement" size={16} style={{verticalAlign:'middle', marginRight:4}}/>Share your win</>}
            </p>
            <p className="text-xs text-muted-foreground">
              {sharePromptDetail.durationMin} min · {sharePromptDetail.calories} cal · {sharePromptDetail.workoutTitle}
              {sharePromptDetail.pbs && sharePromptDetail.pbs.length > 0 && (
                <><br /><span className="text-amber-500 font-medium">{sharePromptDetail.pbs.map(pb => pb.label).join(' + ')}</span></>
              )}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-primary text-primary-foreground text-xs h-9"
                onClick={() => {
                  const storedId = sessionStorage.getItem(`pb_notif_${sharePromptDetail.workoutId}`);
                  if (storedId) {
                    import('@/lib/notify').then(({ cancelPBShareReminder }) => {
                      cancelPBShareReminder(parseInt(storedId, 10));
                    });
                    sessionStorage.removeItem(`pb_notif_${sharePromptDetail.workoutId}`);
                  }
                  handleClose();
                }}
              >
                Share now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 text-xs h-9 text-muted-foreground"
                onClick={onClose}
              >
                Maybe later
              </Button>
            </div>
          </div>
        )}

        {/* AI-generated workout card */}
        {aiWorkout && (
          <AIWorkoutCard
            title={aiWorkout.title}
            description={aiWorkout.description}
            exercises_snapshot={aiWorkout.exercises_snapshot}
            estimated_duration_minutes={aiWorkout.estimated_duration_minutes}
            estimated_calories={aiWorkout.estimated_calories}
            onDismiss={() => setAIWorkout(null)}
            onScheduled={(date, title) => {
              setAIWorkout(null);
              ai.appendAssistantMessage(`✓ "${title}" added to your schedule for ${new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}.`);
            }}
          />
        )}

        {/* AI workout plan card */}
        {aiWorkoutPlan && (
          <AIWorkoutPlanCard
            title={aiWorkoutPlan.title}
            goal={aiWorkoutPlan.goal}
            start_date={aiWorkoutPlan.start_date}
            workouts={aiWorkoutPlan.workouts}
            onDismiss={() => setAIWorkoutPlan(null)}
            onScheduled={(count) => {
              setAIWorkoutPlan(null);
              ai.appendAssistantMessage(`✓ ${count} workouts added to your schedule. Your ${aiWorkoutPlan.title} starts ${new Date(aiWorkoutPlan.start_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}.`);
            }}
          />
        )}

        {/* Workout recommendation card */}
        {recommendedWorkout && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-3">
            <div className="flex items-start gap-3">
              {recommendedWorkout.thumbnail_url ? (
                <img
                  src={recommendedWorkout.thumbnail_url}
                  alt={recommendedWorkout.title}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <HEmoji name="workouts" size={24}/>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{recommendedWorkout.title}</p>
                <p className="text-xs text-muted-foreground">
                  {recommendedWorkout.duration_minutes ?? '?'} min
                  {recommendedWorkout.category ? ` · ${recommendedWorkout.category}` : ''}
                  {recommendedWorkout.difficulty ? ` · ${recommendedWorkout.difficulty}` : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-primary text-primary-foreground text-xs h-9"
                onClick={() => {
                  const id = recommendedWorkout.id;
                  setRecommendedWorkout(null);
                  handleClose();
                  navigate(`/workout/${id}`);
                }}
              >
                Start now
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-9"
                onClick={() => scheduleRecommendedWorkout(recommendedWorkout.id)}
              >
                Add to schedule
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-9 text-muted-foreground"
                onClick={() => setRecommendedWorkout(null)}
              >
                Skip
              </Button>
            </div>
          </div>
        )}

        {/* Recipe recommendation card */}
        {recommendedRecipe && (
          <div className="bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                <span className="text-2xl">{recommendedRecipe.emoji ?? '🍽️'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{recommendedRecipe.name}</p>
                <p className="text-xs text-muted-foreground">
                  {recommendedRecipe.meal_type} · {recommendedRecipe.calories} cal · {recommendedRecipe.protein_g}g protein
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-accent text-accent-foreground text-xs h-9"
                onClick={() => {
                  setRecommendedRecipe(null);
                  handleClose();
                  navigate('/browse-meals');
                }}
              >
                View recipe
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-9"
                onClick={() => logRecommendedRecipe(recommendedRecipe)}
              >
                Log it
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-9 text-muted-foreground"
                onClick={() => setRecommendedRecipe(null)}
              >
                Skip
              </Button>
            </div>
          </div>
        )}

        <div ref={responseEndRef} />
      </div>

      {/* Bottom controls */}
      <div
        className="shrink-0 flex flex-col items-center gap-3 pt-3 border-t border-border/40 px-4"
        style={{
          paddingBottom: keyboardHeight > 0
            ? `${keyboardHeight + 8}px`
            : "calc(env(safe-area-inset-bottom, 24px) + 1rem)",
        }}
      >
        {/* Text input row */}
        <div className="flex items-center gap-2 w-full">
          <input
            type="text"
            value={typedText}
            onChange={e => setTypedText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && typedText.trim() && ai.status !== 'streaming') {
                e.preventDefault();
                handleSend(typedText.trim());
                setTypedText('');
              }
            }}
            placeholder="Type a message…"
            disabled={ai.status === 'streaming'}
            className="flex-1 rounded-2xl border border-border/60 bg-background/40 backdrop-blur-sm px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <Button
            size="icon"
            className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 shrink-0"
            onClick={() => {
              if (!typedText.trim() || ai.status === 'streaming') return;
              handleSend(typedText.trim());
              setTypedText('');
            }}
            disabled={!typedText.trim() || ai.status === 'streaming'}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {ai.status === 'streaming' ? 'Thinking…' : isListening ? 'Listening…' : tts.isSpeaking ? 'Tap to interrupt' : 'Tap mic or type'}
        </p>

        <div className="flex items-center justify-center gap-6">
          {/* Goals button */}
          <div className="flex flex-col items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="w-12 h-12 rounded-full border-border/60 bg-background/40 backdrop-blur-sm"
              onClick={triggerGoalsFlow}
              disabled={ai.status === 'streaming' || isListening}
            >
              <Target className="w-5 h-5 text-primary" />
            </Button>
            <span className="text-[10px] text-muted-foreground font-medium">Goals</span>
          </div>

          {/* Mic / interrupt button */}
          <Button
            size="lg"
            className={cn(
              "w-16 h-16 rounded-full shadow-lg transition-all",
              isListening
                ? "bg-destructive hover:bg-destructive/90"
                : tts.isSpeaking
                  ? "bg-secondary hover:bg-secondary/90 border-2 border-primary"
                  : "bg-primary hover:bg-primary/90"
            )}
            onClick={() => {
              if (isListening) {
                stopListening();
              } else if (tts.isSpeaking) {
                tts.cancel();
              } else {
                startListening();
              }
            }}
            disabled={ai.status === 'streaming'}
          >
            {isListening
              ? <MicOff className="w-6 h-6" />
              : tts.isSpeaking
                ? <StopCircle className="w-6 h-6 text-primary" />
                : <Mic className="w-6 h-6" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
