import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, X, Loader2, StopCircle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

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

// Convert **text** to <strong>
function bold(str: string): string {
  return str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

interface JarvisModeProps {
  onClose: () => void;
  conversationId: string;
  healthProfile?: string;
  sharePromptDetail?: {
    workoutId: string;
    workoutTitle: string;
    durationMin: number;
    calories: number;
    pbs?: Array<{ kind: 'duration' | 'calories' | 'streak'; label: string; value: number; previousBest: number }>;
  } | null;
}

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

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

export function JarvisMode({ onClose, conversationId, healthProfile, sharePromptDetail }: JarvisModeProps) {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(32).fill(4));
  const [pendingBodyScan, setPendingBodyScan] = useState(false);
  const [pendingSchedule, setPendingSchedule] = useState<{
    goal: string; daysPerWeek: number; selectedDays: number[]; sessionMinutes: number;
  } | null>(null);
  const [recommendedWorkout, setRecommendedWorkout] = useState<RecommendedWorkout | null>(null);
  const [recommendedRecipe, setRecommendedRecipe] = useState<RecommendedRecipe | null>(null);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const responseEndRef = useRef<HTMLDivElement | null>(null);

  // Fix #2: AbortController kills stale streams before new ones start
  const streamAbortRef = useRef<AbortController>();
  // Fix #8: Ref mirrors conversationHistory so handleUserMessage never reads a stale closure
  const historyRef = useRef<ConversationMessage[]>([]);
  // Fix #6: Ref mirrors isMuted so closures captured before a toggle still see the current value
  const isMutedRef = useRef(isMuted);
  // Ref mirrors isListening so transcript callbacks can guard against post-disconnect firing
  const isListeningRef = useRef(false);
  // Guard against overlapping connect() calls (e.g. rapid mic taps)
  const isConnectingRef = useRef(false);

  // Keep refs in sync with state on every render
  isMutedRef.current = isMuted;
  historyRef.current = conversationHistory;

  // ElevenLabs Scribe hook for real-time transcription
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      // Guard: don't process after disconnect — prevents "WebSocket not connected" errors
      if (!isListeningRef.current) return;
      setTranscript(data.text);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    },
    onCommittedTranscript: async (data) => {
      // Guard: skip if disconnected or already processing
      if (!isListeningRef.current) return;
      const finalTranscript = data.text.trim();
      if (!finalTranscript || isProcessing) return;
      setTranscript(finalTranscript);
      await handleUserMessage(finalTranscript);
    },
  });

  const updateVisualizer = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      setVisualizerData(Array.from(dataArray.slice(0, 32)));
    }
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  }, []);

  const startListening = useCallback(async () => {
    // Prevent double-connect — the source of "WebSocket not connected" errors
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

      // Start visualizer
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
  }, [scribe, updateVisualizer]);

  const stopListening = useCallback(() => {
    // Mark as not listening before disconnect so callbacks fired during teardown are ignored
    isListeningRef.current = false;
    isConnectingRef.current = false;
    try { scribe.disconnect(); } catch { /* already disconnected — safe to ignore */ }
    setIsListening(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    setVisualizerData(new Array(32).fill(4));
  }, [scribe]);

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.access_token ?? null;
  };

  // Maps plan items to upcoming dates based on user's preferred days of week
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

  // Called when AI response contains one or more [LOG_FOOD:{...}] markers
  const logFoodFromJarvis = async (items: {
    name: string; category: string; calories: number;
    protein: number; carbs: number; fat: number; fiber: number;
  }[]) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId || !items.length) return;

      await supabase.from('meal_logs').insert(
        items.map(item => ({
          user_id: userId,
          custom_name: item.name,
          category: item.category,
          calories: Math.round(item.calories),
          protein_grams: item.protein,
          carbs_grams: item.carbs,
          fat_grams: item.fat,
          fiber_grams: item.fiber,
          logged_at: new Date().toISOString(),
        }))
      );
    } catch (err) {
      console.error('[Jarvis] Food log failed:', err);
    }
  };

  const confirmSchedule = async () => {
    if (!pendingSchedule || isAddingSchedule) return;
    setIsAddingSchedule(true);
    await createScheduleFromJarvis(pendingSchedule);
    setPendingSchedule(null);
    setIsAddingSchedule(false);
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

      const confirmation = `✅ Added to tomorrow's schedule. See you then!`;
      const withConfirm = [...historyRef.current, { role: 'assistant' as const, content: confirmation }];
      historyRef.current = withConfirm;
      setConversationHistory(withConfirm);
      await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: confirmation });

      setRecommendedWorkout(null);
    } catch (err) {
      console.error('[Jarvis] Schedule workout failed:', err);
      const msg = `Sorry, I couldn't add that to your schedule. You can add it manually from the workout page.`;
      const withErr = [...historyRef.current, { role: 'assistant' as const, content: msg }];
      historyRef.current = withErr;
      setConversationHistory(withErr);
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

      const confirmation = `✅ Logged ${recipe.name} as ${recipe.meal_type}.`;
      const withConfirm = [...historyRef.current, { role: 'assistant' as const, content: confirmation }];
      historyRef.current = withConfirm;
      setConversationHistory(withConfirm);
      await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: confirmation });

      setRecommendedRecipe(null);
    } catch (err) {
      console.error('[Jarvis] Recipe log failed:', err);
      const msg = `Sorry, I couldn't log that meal. You can log it manually from the Nutrition tab.`;
      const withErr = [...historyRef.current, { role: 'assistant' as const, content: msg }];
      historyRef.current = withErr;
      setConversationHistory(withErr);
    }
  };

  // Called when AI response contains [SCHEDULE_PLAN:{...}]
  const createScheduleFromJarvis = async (params: {
    goal: string; daysPerWeek: number; selectedDays: number[]; sessionMinutes: number;
  }) => {
    try {
      const accessToken = await getAccessToken();
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
      // The edge function returns { items: [...] } — not plan_items
      const planItems: { day_index: number; workout_id: string }[] = data.items ?? [];

      // If the AI didn't provide selectedDays, fall back to evenly-spaced weekdays
      const days = params.selectedDays?.length
        ? params.selectedDays
        : defaultDays(params.daysPerWeek);
      const rows = mapToScheduleDates(planItems, days);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error('No user session');
      if (!rows.length) throw new Error('Plan generator returned no workouts');

      await supabase.from('scheduled_workouts').insert(
        rows.map(r => ({ user_id: userId, workout_id: r.workout_id, scheduled_date: r.scheduled_date }))
      );

      const confirmation = `✅ Your schedule is set! Taking you there now…`;
      const withConfirm = [...historyRef.current, { role: 'assistant' as const, content: confirmation }];
      historyRef.current = withConfirm;
      setConversationHistory(withConfirm);
      await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: confirmation });
      if (!isMutedRef.current) await speakResponse(confirmation);

      // Close Jarvis and navigate to the Schedule tab so the user sees their new plan
      setTimeout(() => {
        onClose();
        navigate('/schedule');
      }, 1800);
    } catch (err) {
      console.error('[Jarvis] Schedule creation failed:', err);
      const msg = `Sorry, I couldn't add the schedule right now. You can add workouts manually from the Schedule tab.`;
      const withErr = [...historyRef.current, { role: 'assistant' as const, content: msg }];
      historyRef.current = withErr;
      setConversationHistory(withErr);
    }
  };

  // Fallback day selection when AI omits selectedDays
  const defaultDays = (n: number): number[] => {
    const presets: Record<number, number[]> = {
      1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6],
    };
    return presets[Math.max(1, Math.min(6, n))] ?? [1, 3, 5];
  };

  // Strips action markers from text and returns clean display text + detected actions
  const parseAIResponse = (raw: string) => {
    const scheduleMatch = raw.match(/\[SCHEDULE_PLAN:({.*?})\]/s);
    const foodMatches = [...raw.matchAll(/\[LOG_FOOD:({.*?})\]/gs)];
    const workoutMatch = raw.match(/\[RECOMMEND_WORKOUT:({.*?})\]/s);
    const recipeMatch = raw.match(/\[RECOMMEND_RECIPE:({.*?})\]/s);
    const showBodyScan = raw.includes('[BODY_SCAN_PROMPT]');
    const displayText = raw
      .replace(/\[SCHEDULE_PLAN:{.*?}\]/gs, '')
      .replace(/\[LOG_FOOD:{.*?}\]/gs, '')
      .replace(/\[RECOMMEND_WORKOUT:{.*?}\]/gs, '')
      .replace(/\[RECOMMEND_RECIPE:{.*?}\]/gs, '')
      .replace(/\[BODY_SCAN_PROMPT\]/g, '')
      .trim();
    return { displayText, scheduleMatch, foodMatches, workoutMatch, recipeMatch, showBodyScan };
  };

  const streamAIResponse = async (
    messages: { role: string; content: string }[],
    onDelta: (delta: string) => void,
    signal?: AbortSignal
  ): Promise<string> => {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('Not authenticated');

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        messages,
        healthProfile: healthProfile ?? '',
        customResponse: localStorage.getItem('hiit-ai-custom-response') ?? '',
        customMemory: localStorage.getItem('hiit-ai-custom-memory') ?? '',
      }),
    });

    if (!res.ok) throw new Error('AI request failed');
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (json === '[DONE]') break;
        try {
          const delta = JSON.parse(json).choices?.[0]?.delta?.content;
          if (delta) { full += delta; onDelta(delta); }
        } catch { /* partial chunk */ }
      }
    }
    return full;
  };

  // Loads the last 40 messages from Supabase for this conversation
  const loadHistory = useCallback(async (): Promise<ConversationMessage[]> => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(40);

      if (!data || data.length === 0) return [];

      const history: ConversationMessage[] = data.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      setConversationHistory(history);
      return history;
    } catch {
      return [];
    } finally {
      setIsLoadingHistory(false);
    }
  }, [conversationId]);

  // Greets on open. Runs onboarding flow if user has no history and no schedule yet.
  const triggerGreeting = useCallback(async (
    loadedHistory: ConversationMessage[],
    hasSchedule = true,
    hasWorkoutToday = true,
  ) => {
    // Fix #2: abort any in-flight stream before starting
    streamAbortRef.current?.abort();
    const abort = new AbortController();
    streamAbortRef.current = abort;

    setIsProcessing(true);
    setResponse('');
    const hasHistory = loadedHistory.length > 0;
    const isOnboarding = !hasHistory && !hasSchedule;
    try {
      const greetingPrompt = sharePromptDetail
        // Post-workout share nudge — PB version or normal version
        ? (sharePromptDetail.pbs && sharePromptDetail.pbs.length > 0
            ? `[POST_WORKOUT_PB] The user just finished a ${sharePromptDetail.durationMin}-minute ${sharePromptDetail.workoutTitle} and hit a new personal best: ${sharePromptDetail.pbs.map(pb => `${pb.label} (${pb.value}, previous best ${pb.previousBest})`).join('; ')}. Celebrate this specifically and enthusiastically — name the PB. Then say they should share it because this one matters. Keep it to 2-3 sentences, genuinely excited tone, use one 🏆 emoji.`
            : `[POST_WORKOUT_SHARE] The user just finished a ${sharePromptDetail.durationMin}-minute ${sharePromptDetail.workoutTitle} workout, burning around ${sharePromptDetail.calories} calories. Congratulate them warmly in one sentence — be specific about what they just did, not generic. Then ask if they want to share it on the community feed. Keep it to 2 sentences total, encouraging tone, no follow-up questions beyond the share question.`)
        : isOnboarding
          // First ever open — full onboarding intake
          ? `[ONBOARDING] This user has no schedule yet. Introduce yourself as Coach HIIT in one warm sentence, then say you want to ask a couple of quick questions to build their perfect plan, then ask just this: "What's your main fitness goal right now?" — no lists, no options, keep it conversational.`
          : hasHistory && !hasSchedule
            // Returning user who still has no schedule — pick up where they left off
            ? `[GREETING] Welcome this user back in one warm sentence. Then immediately say you notice they haven't set up a workout schedule yet and ask if they want to do that now. Keep it brief and positive — do not repeat questions already in the chat history above.`
            : hasHistory && hasSchedule && !hasWorkoutToday
              // Returning user with a schedule but nothing on for today — proactive recommendation
              ? `[GREETING_NO_TODAY] The user has just re-opened our conversation. They have a schedule but no workout planned for today. In one warm sentence, welcome them back. Then suggest ONE specific workout from the WORKOUTS CATALOGUE that fits their goal and emit the [RECOMMEND_WORKOUT:{...}] marker at the end. Keep the whole response to 2 sentences max — let the card do the talking.`
              : hasHistory
                // Returning user with a schedule and something on for today — normal welcome back
                ? `[GREETING] The user has just re-opened our conversation. Give a warm 1-sentence welcome back — reference something specific from our recent chat if helpful. Keep it brief, they can see the history.`
                : healthProfile?.trim()
                  ? `[GREETING] Give me a warm 2-sentence spoken greeting. First sentence: reference something specific from my biometric data (workout frequency, sleep, steps, or activity level) — be personal, not generic. Second sentence: ask what I want to work on today. Sound like a coach who knows me.\n\nMy data:\n${healthProfile}`
                  : `[GREETING] Welcome me warmly in 2 short sentences. First: introduce yourself as my AI coach. Second: ask what I want to work on today.`;

      const messagesForAI = [
        ...loadedHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: greetingPrompt },
      ];

      let full = '';
      await streamAIResponse(messagesForAI, delta => { full += delta; setResponse(r => r + delta); }, abort.signal);

      if (full && !abort.signal.aborted) {
        const { displayText, scheduleMatch, foodMatches, workoutMatch, recipeMatch, showBodyScan } = parseAIResponse(full);

        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: displayText });
        setConversationHistory(prev => [...prev, { role: 'assistant', content: displayText }]);
        if (!isMutedRef.current) await speakResponse(displayText);

        if (scheduleMatch) {
          try { setPendingSchedule(JSON.parse(scheduleMatch[1])); } catch {}
        }
        if (foodMatches.length) {
          try { logFoodFromJarvis(foodMatches.map(m => JSON.parse(m[1]))); } catch {}
        }
        if (showBodyScan) setPendingBodyScan(true);
        if (workoutMatch) {
          try { const { id } = JSON.parse(workoutMatch[1]); const w = await fetchRecommendedWorkout(id); if (w) setRecommendedWorkout(w); } catch (err) { console.error('[Jarvis] workout marker parse failed:', err); }
        }
        if (recipeMatch) {
          try { const { id } = JSON.parse(recipeMatch[1]); const r = await fetchRecommendedRecipe(id); if (r) setRecommendedRecipe(r); } catch (err) { console.error('[Jarvis] recipe marker parse failed:', err); }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') console.error('Greeting error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [healthProfile, conversationId, sharePromptDetail]);

  const handleUserMessage = useCallback(async (text: string) => {
    // Fix #2: abort any in-flight stream before starting a new one
    streamAbortRef.current?.abort();
    const abort = new AbortController();
    streamAbortRef.current = abort;

    stopListening();
    setIsProcessing(true);
    setResponse('');

    // Fix #8: read from ref so rapid VAD commits never see a stale closure
    const updatedHistory = [...historyRef.current, { role: 'user' as const, content: text }];
    historyRef.current = updatedHistory; // update ref immediately before setState flushes
    setConversationHistory(updatedHistory);

    try {
      await supabase.from('messages').insert({ conversation_id: conversationId, role: 'user', content: text });

      let full = '';
      await streamAIResponse(
        updatedHistory.map(m => ({ role: m.role, content: m.content })),
        delta => { full += delta; setResponse(r => r + delta); },
        abort.signal
      );

      if (full && !abort.signal.aborted) {
        const { displayText, scheduleMatch, foodMatches, workoutMatch, recipeMatch, showBodyScan } = parseAIResponse(full);

        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: displayText });
        const withReply = [...updatedHistory, { role: 'assistant' as const, content: displayText }];
        historyRef.current = withReply;
        setConversationHistory(withReply);
        if (!isMutedRef.current) await speakResponse(displayText);

        if (scheduleMatch) {
          try { setPendingSchedule(JSON.parse(scheduleMatch[1])); } catch {}
        }
        if (foodMatches.length) {
          try { logFoodFromJarvis(foodMatches.map(m => JSON.parse(m[1]))); } catch {}
        }
        if (showBodyScan) setPendingBodyScan(true);
        if (workoutMatch) {
          try { const { id } = JSON.parse(workoutMatch[1]); const w = await fetchRecommendedWorkout(id); if (w) setRecommendedWorkout(w); } catch (err) { console.error('[Jarvis] workout marker parse failed:', err); }
        }
        if (recipeMatch) {
          try { const { id } = JSON.parse(recipeMatch[1]); const r = await fetchRecommendedRecipe(id); if (r) setRecommendedRecipe(r); } catch (err) { console.error('[Jarvis] recipe marker parse failed:', err); }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error processing message:', err);
        setResponse('Sorry, I had trouble with that. Tap the mic and try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [conversationId, stopListening]);


  const speakResponse = async (text: string) => {
    setIsSpeaking(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.warn('[TTS] No auth token — skipping voice');
        setIsSpeaking(false);
        return;
      }

      const voiceId = localStorage.getItem('hiit-ai-voice-id') ?? 'JBFqnCBsd6RMkjVDRZzb';
      // Normalise acronyms that TTS reads as individual letters
      const ttsText = text
        .replace(/\bHIIT\b/g, 'hit')
        .replace(/\bOk HIIT\b/gi, 'ok hit')
        .replace(/\bOkay HIIT\b/gi, 'okay hit')
        .substring(0, 500);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ text: ttsText, voiceId }),
        }
      );

      if (!res.ok) {
        const err = await res.text().catch(() => res.status.toString());
        console.error('[TTS] Request failed:', err);
        setIsSpeaking(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        // load() must be called after changing src on iOS WKWebView —
        // without it the element stays in its previous ended state and play() silently does nothing
        audioRef.current.load();
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audioRef.current.onerror = () => { setIsSpeaking(false); };
        await audioRef.current.play().catch(e => {
          console.error('[TTS] Audio play failed:', e);
          setIsSpeaking(false);
        });
      }
    } catch (error) {
      console.error('[TTS] Unexpected error:', error);
      setIsSpeaking(false);
    }
  };

  const handleClose = () => {
    streamAbortRef.current?.abort();
    stopListening();
    if (audioRef.current) audioRef.current.pause();
    onClose();
  };

  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [response, transcript, conversationHistory]);

  const triggerGoalsFlow = useCallback(async () => {
    streamAbortRef.current?.abort();
    const abort = new AbortController();
    streamAbortRef.current = abort;
    setIsProcessing(true);
    setResponse('');

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

    try {
      const messagesForAI = [
        ...historyRef.current.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: prompt },
      ];
      let full = '';
      await streamAIResponse(messagesForAI, delta => { full += delta; setResponse(r => r + delta); }, abort.signal);
      if (full && !abort.signal.aborted) {
        const { displayText, scheduleMatch, foodMatches, workoutMatch, recipeMatch, showBodyScan } = parseAIResponse(full);
        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: displayText });
        setConversationHistory(prev => [...prev, { role: 'assistant', content: displayText }]);
        if (!isMutedRef.current) await speakResponse(displayText);
        if (scheduleMatch) { try { setPendingSchedule(JSON.parse(scheduleMatch[1])); } catch {} }
        if (foodMatches.length) { try { logFoodFromJarvis(foodMatches.map(m => JSON.parse(m[1]))); } catch {} }
        if (showBodyScan) setPendingBodyScan(true);
        if (workoutMatch) {
          try { const { id } = JSON.parse(workoutMatch[1]); const w = await fetchRecommendedWorkout(id); if (w) setRecommendedWorkout(w); } catch (err) { console.error('[Jarvis] workout marker parse failed:', err); }
        }
        if (recipeMatch) {
          try { const { id } = JSON.parse(recipeMatch[1]); const r = await fetchRecommendedRecipe(id); if (r) setRecommendedRecipe(r); } catch (err) { console.error('[Jarvis] recipe marker parse failed:', err); }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') console.error('Goals flow error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [conversationId]);

  // Pre-unlock iOS WKWebView audio on mount. JarvisMode is always opened by a user tap,
  // so this runs within the gesture window. Without it, play() calls after async AI work
  // are blocked by iOS autoplay policy and the greeting + all responses are silent.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    el.play().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const history = await loadHistory();
      if (cancelled) return;

      let hasSchedule = true;
      let hasWorkoutToday = true;

      try {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;
        if (userId) {
          const today = new Date().toISOString().split('T')[0];

          const { count: futureCount } = await supabase
            .from('scheduled_workouts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('scheduled_date', today);
          hasSchedule = (futureCount ?? 0) > 0;

          const { count: todayCount } = await supabase
            .from('scheduled_workouts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('scheduled_date', today);
          hasWorkoutToday = (todayCount ?? 0) > 0;
        }
      } catch {
        hasSchedule = true;
        hasWorkoutToday = true;
      }

      // Brief pause so the UI renders before greeting starts
      await new Promise(r => setTimeout(r, 400));
      if (cancelled) return;
      triggerGreeting(history, hasSchedule, hasWorkoutToday);
    };

    init();

    return () => {
      cancelled = true;
      stopListening();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // z-[100] sits above bottom nav (z-50) and all other overlays
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <audio ref={audioRef} className="hidden" />

      {/* Header — below Dynamic Island using native env() variable */}
      <div
        className="flex items-center justify-between px-4 pb-3 border-b border-border shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 44px) + 0.5rem)" }}
      >
        <h2 className="text-base font-semibold text-foreground">Voice Mode</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="text-muted-foreground h-9 w-9">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-muted-foreground h-9 w-9">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable conversation — full history */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* Loading history indicator */}
        {isLoadingHistory && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}

        {/* Persisted conversation history */}
        {conversationHistory.map((msg, i) => (
          msg.role === 'assistant' ? (
            <div key={i} className="bg-secondary/40 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-2 uppercase">Coach HIIT</p>
              <div className="text-sm text-foreground leading-relaxed space-y-2">
                {formatResponse(msg.content)}
              </div>
            </div>
          ) : (
            <div key={i} className="bg-primary/10 rounded-2xl px-4 py-3 ml-8">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1 uppercase">You</p>
              <p className="text-sm text-foreground">{msg.content}</p>
            </div>
          )
        ))}

        {/* Streaming response (in progress) — strip the schedule marker from live display */}
        {isProcessing && response && (
          <div className="bg-secondary/40 rounded-2xl px-4 py-3">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-2 uppercase">Coach HIIT</p>
            <div className="text-sm text-foreground leading-relaxed space-y-2">
              {formatResponse(response
        .replace(/\[SCHEDULE_PLAN:{.*?}\]/gs, '')
        .replace(/\[LOG_FOOD:{.*?}\]/gs, '')
        .replace(/\[RECOMMEND_WORKOUT:{.*?}\]/gs, '')
        .replace(/\[RECOMMEND_RECIPE:{.*?}\]/gs, '')
        .trim())}
            </div>
          </div>
        )}

        {/* Processing indicator (before first token arrives) */}
        {isProcessing && !response && (
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

        {/* Visualizer — only while speaking/listening */}
        {(isListening || isSpeaking) && (
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

        {/* Body scan CTA — shown when Jarvis recommends a scan during onboarding */}
        {pendingBodyScan && (
          <div className="bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3 space-y-3">
            <p className="text-sm font-semibold text-foreground">📷 Body Scan</p>
            <p className="text-xs text-muted-foreground">
              Take 3 photos (front, side, back) — I'll analyse your physique and personalise your plan around what I find.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-primary text-primary-foreground text-xs h-9"
                onClick={() => {
                  setPendingBodyScan(false);
                  onClose();
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

        {/* Schedule confirmation card — shown when Jarvis proposes a plan */}
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

        {/* Post-workout share card — PB style (amber) or normal style (primary) */}
        {sharePromptDetail && (
          <div className={
            sharePromptDetail.pbs && sharePromptDetail.pbs.length > 0
              ? "bg-amber-500/10 border border-amber-500/40 rounded-2xl px-4 py-3 space-y-3"
              : "bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-3"
          }>
            <p className="text-sm font-semibold text-foreground">
              {sharePromptDetail.pbs && sharePromptDetail.pbs.length > 0 ? '🏆 New personal best!' : '🎉 Share your win'}
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
                  onClose();
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
                  <span className="text-2xl">💪</span>
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
                  onClose();
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
                  onClose();
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

      {/* Bottom controls — mic button above safe area, status label above it */}
      <div
        className="shrink-0 flex flex-col items-center gap-3 pt-3 pb-4 border-t border-border/40"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 24px) + 1rem)" }}
      >
        {/* Status label */}
        <p className="text-xs text-muted-foreground">
          {isProcessing ? 'Thinking…' : isListening ? 'Listening…' : isSpeaking ? 'Tap to interrupt' : 'Tap to speak'}
        </p>

        {/* Controls row: Goals | Mic | (spacer) */}
        <div className="flex items-center justify-center gap-6">
          {/* Goals button */}
          <div className="flex flex-col items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="w-12 h-12 rounded-full border-border/60 bg-background/40 backdrop-blur-sm"
              onClick={triggerGoalsFlow}
              disabled={isProcessing || isListening}
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
                : isSpeaking
                  ? "bg-secondary hover:bg-secondary/90 border-2 border-primary"
                  : "bg-primary hover:bg-primary/90"
            )}
            onClick={() => {
              if (isListening) {
                stopListening();
              } else if (isSpeaking) {
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.src = '';
                }
                setIsSpeaking(false);
              } else {
                startListening();
              }
            }}
            disabled={isProcessing}
          >
            {isListening
              ? <MicOff className="w-6 h-6" />
              : isSpeaking
                ? <StopCircle className="w-6 h-6 text-primary" />
                : <Mic className="w-6 h-6" />}
          </Button>

          {/* Spacer to keep mic centred */}
          <div className="w-12 h-12" />
        </div>
      </div>
    </div>
  );
}
