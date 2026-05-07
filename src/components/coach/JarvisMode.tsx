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
      if (finalTranscript) {
        setTranscript(finalTranscript);
        await handleUserMessage(finalTranscript);
      }
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
      setTranscript('');
      setResponse('');

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

  const streamAIResponse = async (
    messages: { role: string; content: string }[],
    onDelta: (delta: string) => void
  ): Promise<string> => {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('Not authenticated');

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`, {
      method: 'POST',
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

  // Fires on mount — AI greets the user based on their biometric data
  const triggerGreeting = useCallback(async () => {
    setIsProcessing(true);
    try {
      const greetingPrompt = healthProfile?.trim()
        ? `[GREETING] Give me a warm 2-sentence spoken greeting. First sentence: reference something specific from my biometric data (workout frequency, sleep, steps, or activity level) — be personal, not generic. Second sentence: tell me I can say "Ok HIIT" anytime to activate you, and ask what I want to work on today. Sound like a coach who knows me.\n\nMy data:\n${healthProfile}`
        : `[GREETING] Welcome me warmly in 2 short sentences. First: introduce yourself as my AI coach and say you're excited to get to know me. Second: tell me I can say "Ok HIIT" anytime to activate you and ask what I want to work on today.`;

      let full = '';
      await streamAIResponse(
        [{ role: 'user', content: greetingPrompt }],
        delta => { full += delta; setResponse(r => r + delta); }
      );

      if (full) {
        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: full });
        setConversationHistory([{ role: 'assistant', content: full }]);
        if (!isMuted) await speakResponse(full);
        else startListening();
      }
    } catch (err) {
      console.error('Greeting error:', err);
      startListening();
    } finally {
      setIsProcessing(false);
    }
  }, [healthProfile, isMuted, conversationId]);

  const handleUserMessage = async (text: string) => {
    stopListening();
    setIsProcessing(true);

    const updatedHistory = [...conversationHistory, { role: 'user' as const, content: text }];
    setConversationHistory(updatedHistory);

    try {
      await supabase.from('messages').insert({ conversation_id: conversationId, role: 'user', content: text });

      let full = '';
      await streamAIResponse(
        updatedHistory.map(m => ({ role: m.role, content: m.content })),
        delta => { full += delta; setResponse(r => r + delta); }
      );

      if (full) {
        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: full });
        setConversationHistory(prev => [...prev, { role: 'assistant', content: full }]);
        if (!isMuted) await speakResponse(full);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setResponse('Sorry, I had trouble understanding that. Try again?');
    } finally {
      setIsProcessing(false);
    }
  };


  const speakResponse = async (text: string) => {
    setIsSpeaking(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.warn('[TTS] No auth token — skipping voice');
        setIsSpeaking(false);
        startListening();
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
        startListening();
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          startListening();
        };
        audioRef.current.onerror = () => {
          setIsSpeaking(false);
          startListening();
        };
        await audioRef.current.play().catch(e => {
          console.error('[TTS] Audio play failed:', e);
          setIsSpeaking(false);
          startListening();
        });
      }
    } catch (error) {
      console.error('[TTS] Unexpected error:', error);
      setIsSpeaking(false);
      startListening();
    }
  };

  const handleClose = () => {
    stopListening();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onClose();
  };

  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [response, transcript]);

  useEffect(() => {
    // Trigger contextual greeting on open; greeting speaks then auto-starts listening.
    // Falls back to listening directly if greeting fails.
    const timer = setTimeout(() => {
      triggerGreeting();
    }, 400);

    return () => {
      clearTimeout(timer);
      stopListening();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <audio ref={audioRef} className="hidden" />

      {/* Header — sits below Dynamic Island / notch */}
      <div
        className="flex items-center justify-between px-4 pb-3 border-b border-border shrink-0"
        style={{ paddingTop: "calc(var(--safe-area-inset-top, 44px) + 0.5rem)" }}
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

      {/* Scrollable conversation area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Visualizer — compact bar, only visible while speaking/listening */}
        {(isListening || isSpeaking) && (
          <div className="flex items-center justify-center gap-0.5 h-8 mb-2">
            {visualizerData.map((value, i) => (
              <div
                key={i}
                className={cn("w-0.5 rounded-full transition-all duration-75",
                  isListening ? "bg-primary" : "bg-accent")}
                style={{ height: `${Math.max(3, (value / 255) * 28)}px` }}
              />
            ))}
          </div>
        )}

        {/* AI response — formatted */}
        {response && (
          <div className="bg-secondary/40 rounded-2xl px-4 py-3">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-2 uppercase">Coach HIIT</p>
            <div className="text-sm text-foreground leading-relaxed space-y-2">
              {formatResponse(response)}
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && !response && (
          <div className="flex items-center gap-2 px-4 py-3 bg-secondary/40 rounded-2xl">
            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
            <span className="text-sm text-muted-foreground">Thinking…</span>
          </div>
        )}

        {/* User transcript */}
        {transcript && (
          <div className="bg-primary/10 rounded-2xl px-4 py-3 ml-8">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1 uppercase">You</p>
            <p className="text-sm text-foreground">{transcript}</p>
          </div>
        )}

        <div ref={responseEndRef} />
      </div>

      {/* Bottom controls — mic button above safe area, status label above it */}
      <div
        className="shrink-0 flex flex-col items-center gap-3 pt-3 pb-4 border-t border-border/40"
        style={{ paddingBottom: "calc(var(--safe-area-inset-bottom, 24px) + 1rem)" }}
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
