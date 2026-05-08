import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, X, Loader2 } from 'lucide-react';
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
}

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function JarvisMode({ onClose, conversationId, healthProfile }: JarvisModeProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(32).fill(4));
  
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

  // Keep refs in sync with state on every render
  isMutedRef.current = isMuted;
  historyRef.current = conversationHistory;

  // ElevenLabs Scribe hook for real-time transcription
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      setTranscript(data.text);
      // Reset silence timeout on new speech
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    },
    onCommittedTranscript: async (data) => {
      const finalTranscript = data.text.trim();
      // Fix #3: skip if already processing — prevents Scribe double-fire from creating duplicate messages
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
    try {
      // Get scribe token from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      
      if (error || !data?.token) {
        console.error('Failed to get scribe token:', error);
        return;
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setIsListening(true);
      setTranscript(''); // clear current in-progress transcript only, not history

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
    }
  }, [scribe, updateVisualizer]);

  const stopListening = useCallback(() => {
    scribe.disconnect();
    setIsListening(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
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

  // Called when AI response contains [SCHEDULE_PLAN:{...}]
  const createScheduleFromJarvis = async (params: {
    goal: string; daysPerWeek: number; selectedDays: number[]; sessionMinutes: number;
  }) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

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
      if (!res.ok) return;

      const data = await res.json();
      const planItems: { day_index: number; workout_id: string }[] = data.plan_items ?? [];
      const rows = mapToScheduleDates(planItems, params.selectedDays);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId || !rows.length) return;

      await supabase.from('scheduled_workouts').insert(
        rows.map(r => ({ user_id: userId, workout_id: r.workout_id, scheduled_date: r.scheduled_date }))
      );

      const confirmation = `✅ Done! Added ${rows.length} workouts to your schedule. Check the Schedule tab to see them.`;
      const withConfirm = [...historyRef.current, { role: 'assistant' as const, content: confirmation }];
      historyRef.current = withConfirm;
      setConversationHistory(withConfirm);
      await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: confirmation });
      if (!isMutedRef.current) await speakResponse(confirmation);
    } catch (err) {
      console.error('[Jarvis] Schedule creation failed:', err);
    }
  };

  // Strips action markers from text and returns clean display text + detected actions
  const parseAIResponse = (raw: string) => {
    const scheduleMatch = raw.match(/\[SCHEDULE_PLAN:({.*?})\]/s);
    const foodMatches = [...raw.matchAll(/\[LOG_FOOD:({.*?})\]/gs)];
    const displayText = raw
      .replace(/\[SCHEDULE_PLAN:{.*?}\]/gs, '')
      .replace(/\[LOG_FOOD:{.*?}\]/gs, '')
      .trim();
    return { displayText, scheduleMatch, foodMatches };
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

  // Greets on open. If there's prior history, gives a brief welcome back using that context.
  const triggerGreeting = useCallback(async (loadedHistory: ConversationMessage[]) => {
    // Fix #2: abort any in-flight stream before starting
    streamAbortRef.current?.abort();
    const abort = new AbortController();
    streamAbortRef.current = abort;

    setIsProcessing(true);
    setResponse('');
    const hasHistory = loadedHistory.length > 0;
    try {
      const greetingPrompt = hasHistory
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
        const { displayText, scheduleMatch, foodMatches } = parseAIResponse(full);

        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: displayText });
        setConversationHistory(prev => [...prev, { role: 'assistant', content: displayText }]);
        if (!isMutedRef.current) await speakResponse(displayText);

        if (scheduleMatch) {
          try { createScheduleFromJarvis(JSON.parse(scheduleMatch[1])); } catch {}
        }
        if (foodMatches.length) {
          try { logFoodFromJarvis(foodMatches.map(m => JSON.parse(m[1]))); } catch {}
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') console.error('Greeting error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [healthProfile, conversationId]);

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
        const { displayText, scheduleMatch, foodMatches } = parseAIResponse(full);

        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: displayText });
        const withReply = [...updatedHistory, { role: 'assistant' as const, content: displayText }];
        historyRef.current = withReply;
        setConversationHistory(withReply);
        if (!isMutedRef.current) await speakResponse(displayText);

        if (scheduleMatch) {
          try { createScheduleFromJarvis(JSON.parse(scheduleMatch[1])); } catch {}
        }
        if (foodMatches.length) {
          try { logFoodFromJarvis(foodMatches.map(m => JSON.parse(m[1]))); } catch {}
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
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ text: text.substring(0, 500), voiceId }),
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
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          // User taps mic to respond — no auto-listen
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

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const history = await loadHistory();
      if (cancelled) return;
      // Brief pause so the UI renders before greeting starts
      await new Promise(r => setTimeout(r, 400));
      if (cancelled) return;
      triggerGreeting(history);
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
              {formatResponse(response.replace(/\[SCHEDULE_PLAN:{.*?}\]/gs, '').replace(/\[LOG_FOOD:{.*?}\]/gs, '').trim())}
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

        <div ref={responseEndRef} />
      </div>

      {/* Bottom controls — mic button above safe area, status label above it */}
      <div
        className="shrink-0 flex flex-col items-center gap-3 pt-3 pb-4 border-t border-border/40"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 24px) + 1rem)" }}
      >
        {/* Status label — hovers above mic */}
        <p className="text-xs text-muted-foreground">
          {isProcessing ? 'Thinking…' : isListening ? 'Listening…' : isSpeaking ? 'Speaking…' : 'Tap to speak'}
        </p>

        {/* Mic button */}
        <Button
          size="lg"
          className={cn(
            "w-16 h-16 rounded-full shadow-lg",
            isListening ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
          )}
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing || isSpeaking}
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
      </div>
    </div>
  );
}
