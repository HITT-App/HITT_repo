import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface WakeWordListenerProps {
  enabled: boolean;
  onWakeWordDetected: () => void;
}

const WAKE_WORD_REGEX = /\b(?:ok|okay|hey)\s+(?:hiit|hit|heat)\b/i;

declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
    SpeechRecognition: typeof SpeechRecognition;
  }
}

export function WakeWordListener({ enabled, onWakeWordDetected }: WakeWordListenerProps) {
  const recognitionRef  = useRef<SpeechRecognition | null>(null);
  const enabledRef      = useRef(enabled);
  const detectedRef     = useRef(false);
  const failCountRef    = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout>>();

  enabledRef.current = enabled;

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const scheduleRestart = (delayMs = 400) => {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current && !detectedRef.current && !document.hidden) start();
      }, delayMs);
    };

    const start = () => {
      if (!enabledRef.current) return;

      // Abort any existing session cleanly
      try { recognitionRef.current?.abort(); } catch {}

      detectedRef.current = false;
      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.continuous      = true;
      recognition.interimResults  = true;
      recognition.lang            = 'en-GB';
      recognition.maxAlternatives = 3;

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (WAKE_WORD_REGEX.test(transcript) && !detectedRef.current) {
            detectedRef.current = true;
            failCountRef.current = 0;
            try { recognition.abort(); } catch {}
            onWakeWordDetected();
            return;
          }
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied — go to iOS Settings → HIIT → Microphone to enable.');
          return; // don't retry
        }
        // 'network', 'audio-capture', 'aborted', 'no-speech' — all restartable
        failCountRef.current++;
        // Exponential backoff: 0.5s, 1s, 2s … max 8s
        const delay = Math.min(500 * Math.pow(2, failCountRef.current - 1), 8000);
        scheduleRestart(delay);
      };

      recognition.onend = () => {
        // iOS caps continuous sessions; restart immediately when it ends naturally
        if (enabledRef.current && !detectedRef.current) {
          // Small backoff to avoid hammering on repeated quick ends
          const delay = failCountRef.current > 0 ? 600 : 250;
          scheduleRestart(delay);
        }
      };

      try {
        recognition.start();
        failCountRef.current = 0;
      } catch {
        scheduleRestart(1000);
      }
    };

    if (!enabled) {
      clearTimeout(restartTimerRef.current);
      try { recognitionRef.current?.abort(); } catch {}
      recognitionRef.current = null;
      return;
    }

    // iOS requires a user gesture before the first start()
    const handleGesture = () => {
      window.removeEventListener('pointerdown', handleGesture);
      start();
    };

    try {
      start();
    } catch {
      window.addEventListener('pointerdown', handleGesture, { once: true, passive: true });
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(restartTimerRef.current);
        try { recognitionRef.current?.abort(); } catch {}
        recognitionRef.current = null;
      } else if (enabledRef.current && !detectedRef.current) {
        scheduleRestart(500);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(restartTimerRef.current);
      window.removeEventListener('pointerdown', handleGesture);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      try { recognitionRef.current?.abort(); } catch {}
      recognitionRef.current = null;
    };
  }, [enabled, onWakeWordDetected]);

  return null;
}
