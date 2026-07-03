import { useEffect, useRef, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ImageAnalysisPreview } from '@/components/coach/ImageAnalysisPreview';
import { Bot, Dumbbell, Volume2, VolumeX } from 'lucide-react';
import type { Message } from '@/hooks/useAIChat';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { supabase } from '@/integrations/supabase/client';

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (message: string, imageUrl?: string) => void;
  error: string | null;
  onVoiceClick?: () => void;
}

export function ChatContainer({ messages, isLoading, onSend, error, onVoiceClick }: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const keyboardHeight = useKeyboardHeight();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const lastSpokenRef = useRef<string>('');

  const speakMessage = useCallback(async (text: string) => {
    if (voiceMuted) return;
    if (localStorage.getItem('hiit-ai-voice-enabled') !== 'true') return;
    if (text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;

    try {
      const voiceId = localStorage.getItem('hiit-ai-voice-id') ?? 'JBFqnCBsd6RMkjVDRZzb';
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          // ElevenLabs otherwise pronounces "HIIT" as H-I-I-T. Normalise
          // to "hit" per the CLAUDE.md TTS rule before sending. Also
          // catches wake-word variants like "Ok HIIT".
          body: JSON.stringify({
            text: text.slice(0, 500).replace(/\bHIIT\b/g, 'hit').replace(/\bOk HIIT\b/gi, 'ok hit'),
            voiceId,
          }),
        }
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = new Audio(url);
      audioRef.current.play().catch(() => {});
    } catch { /* best-effort */ }
  }, [voiceMuted]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, keyboardHeight]);

  // Speak the last assistant message when it finishes streaming
  useEffect(() => {
    if (isLoading) return;
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && last.content) {
      speakMessage(last.content);
    }
  }, [isLoading, messages, speakMessage]);

  const handleImageSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setSelectedImage(url);
    setSelectedFile(file);
  };

  const handleRemoveImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
    }
    setSelectedImage(null);
    setSelectedFile(null);
  };

  const handleSend = (message: string, imageUrl?: string) => {
    onSend(message, selectedImage || undefined);
    handleRemoveImage();
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center pulse-glow">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Coach HIIT AI</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Hello! I'm Coach HIIT AI, your personal fitness coach. I'm here to make you life healthier.
                </p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Feel free to ask me anything health & fitness related! 💪
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
              {[
                  'Create my weekly training plan',
                  'Calculate my daily calories & macros',
                  'Check my recovery score',
                  'What should I eat today?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => onSend(suggestion)}
                    className="px-3 py-2 text-xs rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
                  >
                    <Dumbbell className="w-3 h-3" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, idx) => (
              <ChatMessage 
                key={idx} 
                role={message.role} 
                content={message.content}
                timestamp={formatTime()}
                richContent={message.richContent}
                imageUrl={message.imageUrl}
                onOptionSelect={(option) => onSend(option.label)}
              />
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Image preview */}
      {selectedImage && (
        <div className="px-4 py-2">
          <ImageAnalysisPreview 
            imageUrl={selectedImage} 
            onRemove={handleRemoveImage}
          />
        </div>
      )}

      {localStorage.getItem('hiit-ai-voice-enabled') === 'true' && (
        <div className="flex justify-end px-4 py-1 border-t border-border/40">
          <button
            onClick={() => setVoiceMuted(m => !m)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground active:text-foreground transition-colors"
          >
            {voiceMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {voiceMuted ? 'Voice off' : 'Voice on'}
          </button>
        </div>
      )}
      <div
        className="p-4 border-t border-border bg-background/80 backdrop-blur-sm transition-all duration-200"
        style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : undefined }}
      >
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          onVoiceClick={onVoiceClick}
          onImageSelect={handleImageSelect}
          selectedImage={selectedImage}
        />
      </div>
    </div>
  );
}
