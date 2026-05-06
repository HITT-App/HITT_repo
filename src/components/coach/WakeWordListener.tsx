import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface WakeWordListenerProps {
  enabled: boolean;
  onWakeWordDetected: () => void;
}

const WAKE_WORD_REGEX = /\b(?:ok|okay|hey)\s+(?:hiit|hit|heat)\b/i;

// Extend window with webkit prefix used on iOS/Safari
declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
    SpeechRecognition: typeof SpeechRecognition;
  }
}

export function WakeWordListener({ enabled, onWakeWordDetected }: WakeWordListenerProps) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const enabledRef = useRef(enabled);
  const detectedRef = useRef(false);
  enabledRef.current = enabled;

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return; // Not supported (shouldn't happen on iOS 13+)

    if (!enabled) {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      return;
    }

    const start = () => {
      if (!enabledRef.current) return;
      detectedRef.current = false;

      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-GB';
      recognition.maxAlternatives = 3;

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (WAKE_WORD_REGEX.test(transcript) && !detectedRef.current) {
            detectedRef.current = true;
            recognition.abort();
            onWakeWordDetected();
            return;
          }
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Go to iOS Settings → HIIT → Microphone to enable it.');
        }
        // Any other error — silently restart
      };

      recognition.onend = () => {
        // Auto-restart so it listens continuously
        if (enabledRef.current && !detectedRef.current) {
          setTimeout(start, 300);
        }
      };

      try {
        recognition.start();
      } catch {
        setTimeout(start, 1000);
      }
    };

    // iOS requires a user gesture before the first start().
    // We attempt immediately; if it fails with not-allowed, we wait for a tap.
    const handleGesture = () => {
      window.removeEventListener('pointerdown', handleGesture);
      start();
    };

    try {
      start();
    } catch {
      window.addEventListener('pointerdown', handleGesture, { once: true, passive: true });
    }

    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, [enabled, onWakeWordDetected]);

  return null;
}
