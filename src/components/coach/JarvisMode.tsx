import { useState, useCallback, useEffect, useRef } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface JarvisModeProps {
  onClose: () => void;
  conversationId: string;
}

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function JarvisMode({ onClose, conversationId }: JarvisModeProps) {
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

  const handleUserMessage = async (text: string) => {
    stopListening();
    setIsProcessing(true);

    const updatedHistory = [...conversationHistory, { role: 'user' as const, content: text }];
    setConversationHistory(updatedHistory);

    try {
      // Save user message to database
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: text,
      });

      // Get AI response
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: updatedHistory.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!aiResponse.ok) {
        throw new Error('AI request failed');
      }

      // Stream the response
      const reader = aiResponse.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullResponse += delta;
              setResponse(fullResponse);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Save assistant response
      if (fullResponse) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullResponse,
        });

        setConversationHistory(prev => [...prev, { role: 'assistant', content: fullResponse }]);

        // Speak the response
        if (!isMuted) {
          await speakResponse(fullResponse);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setResponse('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = async (text: string) => {
    setIsSpeaking(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: text.substring(0, 500), // Limit text length
            voiceId: 'JBFqnCBsd6RMkjVDRZzb' 
          }),
        }
      );

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          // Auto-start listening after response
          startListening();
        };
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
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
    // Auto-start listening on mount
    const timer = setTimeout(() => {
      startListening();
    }, 500);

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
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">HIIT Voice Mode</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="text-muted-foreground"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
        {/* Status indicator */}
        <div className={cn(
          "w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all duration-300",
          isListening && "bg-primary/20 animate-pulse",
          isSpeaking && "bg-accent/20",
          isProcessing && "bg-muted"
        )}>
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
            isListening && "bg-primary/30",
            isSpeaking && "bg-accent/30",
            isProcessing && "bg-muted"
          )}>
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              isListening && "bg-primary",
              isSpeaking && "bg-accent",
              isProcessing && "bg-muted-foreground"
            )}>
              {isProcessing ? (
                <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
              ) : isListening ? (
                <Mic className="w-8 h-8 text-primary-foreground" />
              ) : isSpeaking ? (
                <Volume2 className="w-8 h-8 text-accent-foreground" />
              ) : (
                <MicOff className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Status text */}
        <p className="text-sm text-muted-foreground mb-4">
          {isProcessing ? 'Thinking...' : isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Tap to speak'}
        </p>

        {/* Visualizer */}
        <div className="w-full max-w-md h-16 flex items-center justify-center gap-0.5 mb-8">
          {visualizerData.map((value, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-75",
                isListening ? "bg-primary" : isSpeaking ? "bg-accent" : "bg-muted"
              )}
              style={{ height: `${Math.max(4, (value / 255) * 64)}px` }}
            />
          ))}
        </div>

        {/* Transcript / Response */}
        <div className="w-full max-w-md text-center mt-4">
          {transcript && (
            <div className="mb-4 bg-secondary/50 rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1">You said:</p>
              <p className="text-base text-foreground">{transcript}</p>
            </div>
          )}
          {response && (
            <div className="bg-primary/10 rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1">HIIT AI:</p>
              <p className="text-base text-foreground leading-relaxed">{response}</p>
            </div>
          )}
          <div ref={responseEndRef} />
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 flex justify-center">
        <Button
          size="lg"
          className={cn(
            "w-20 h-20 rounded-full",
            isListening ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
          )}
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing || isSpeaking}
        >
          {isListening ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </Button>
      </div>
    </div>
  );
}
