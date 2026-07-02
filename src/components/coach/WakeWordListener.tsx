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
    __hittDebug?: {
      wakeWord?: WakeWordDebug;
    };
  }
}

// Debug counters exposed on window.__hittDebug.wakeWord. Read from Safari
// Web Inspector while the app runs on a device to diagnose the "mic keeps
// tinkling after sign-out → sign-in" bug. Kept in all builds — the payload
// is < 100 bytes and inspectable state is invaluable for future issues.
interface WakeWordDebug {
  totalStarts: number;        // total SpeechRecognition instances ever created
  activeInstances: number;    // currently running (steady-state should be 0 or 1)
  currentGeneration: number;  // increments on every effect (re-)run
  pendingTimers: number;      // 0 or 1 — restart timer queued
  lastEvent: string;          // human-readable trace of the last thing that happened
}

// One-time init so multiple mounts / hot reloads don't clobber the running
// totals. Read as: `window.__hittDebug.wakeWord.activeInstances`.
if (typeof window !== 'undefined' && !window.__hittDebug?.wakeWord) {
  window.__hittDebug = window.__hittDebug ?? {};
  window.__hittDebug.wakeWord = {
    totalStarts: 0,
    activeInstances: 0,
    currentGeneration: 0,
    pendingTimers: 0,
    lastEvent: 'not-started',
  };
}
const dbg = (): WakeWordDebug | undefined => window.__hittDebug?.wakeWord;

export function WakeWordListener({ enabled, onWakeWordDetected }: WakeWordListenerProps) {
  const recognitionRef  = useRef<SpeechRecognition | null>(null);
  const enabledRef      = useRef(enabled);
  const detectedRef     = useRef(false);
  const failCountRef    = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Generation counter — bumped on every effect run AND every cleanup.
  // Every closure created inside the effect captures its own `myGen`
  // value; before doing anything they check `myGen === generationRef.current`
  // and no-op if they're stale. This kills the zombie-timer bug class where
  // a rapid burst of effect re-runs during auth / navigation transitions
  // left `setTimeout` callbacks queued that would later re-spin the
  // SpeechRecognition instance, causing the mic-access chime to loop.
  const generationRef = useRef(0);

  enabledRef.current = enabled;

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    generationRef.current += 1;
    const myGen = generationRef.current;
    const d = dbg();
    if (d) { d.currentGeneration = myGen; d.lastEvent = `effect-run-gen-${myGen}`; }

    const isStale = () => myGen !== generationRef.current;

    const scheduleRestart = (delayMs = 400) => {
      if (isStale()) return;
      clearTimeout(restartTimerRef.current);
      if (d) d.pendingTimers = 1;
      restartTimerRef.current = setTimeout(() => {
        if (d) d.pendingTimers = 0;
        if (isStale()) {
          if (d) d.lastEvent = `timer-fired-but-gen-${myGen}-stale`;
          return;
        }
        if (enabledRef.current && !detectedRef.current && !document.hidden) start();
      }, delayMs);
    };

    const start = () => {
      if (isStale() || !enabledRef.current) return;

      // Abort any existing session cleanly. The old instance will fire
      // onend asynchronously — that's where activeInstances is decremented,
      // so we don't touch the counter here.
      try { recognitionRef.current?.abort(); } catch {}

      detectedRef.current = false;
      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.continuous      = true;
      recognition.interimResults  = true;
      recognition.lang            = 'en-GB';
      recognition.maxAlternatives = 3;

      if (d) {
        d.totalStarts += 1;
        d.activeInstances += 1;
        d.lastEvent = `start-gen-${myGen}-total-${d.totalStarts}`;
      }

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
        if (isStale()) return;
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied — go to iOS Settings → HIIT → Microphone to enable.');
          return;
        }
        failCountRef.current++;
        const delay = Math.min(500 * Math.pow(2, failCountRef.current - 1), 8000);
        if (d) d.lastEvent = `error-${event.error}-gen-${myGen}`;
        scheduleRestart(delay);
      };

      recognition.onend = () => {
        if (d) d.activeInstances = Math.max(0, d.activeInstances - 1);
        if (isStale()) {
          if (d) d.lastEvent = `end-gen-${myGen}-stale-no-restart`;
          return;
        }
        if (enabledRef.current && !detectedRef.current) {
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
      if (d) { d.pendingTimers = 0; d.lastEvent = `disabled-gen-${myGen}`; }
      try { recognitionRef.current?.abort(); } catch {}
      recognitionRef.current = null;
      return;
    }

    // iOS requires a user gesture before the first start()
    const handleGesture = () => {
      window.removeEventListener('pointerdown', handleGesture);
      if (isStale()) return;
      start();
    };

    try {
      start();
    } catch {
      window.addEventListener('pointerdown', handleGesture, { once: true, passive: true });
    }

    const handleVisibilityChange = () => {
      if (isStale()) return;
      if (document.hidden) {
        clearTimeout(restartTimerRef.current);
        if (d) d.pendingTimers = 0;
        try { recognitionRef.current?.abort(); } catch {}
        recognitionRef.current = null;
      } else if (enabledRef.current && !detectedRef.current) {
        scheduleRestart(500);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Bump the generation FIRST so any queued restart timer, in-flight
      // onend / onerror from the aborted recognition, or visibilitychange
      // handler all see themselves as stale and no-op instead of spawning
      // a fresh SpeechRecognition instance.
      generationRef.current += 1;
      clearTimeout(restartTimerRef.current);
      if (d) { d.pendingTimers = 0; d.lastEvent = `cleanup-gen-${myGen}-next-${generationRef.current}`; }
      window.removeEventListener('pointerdown', handleGesture);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      try { recognitionRef.current?.abort(); } catch {}
      recognitionRef.current = null;
    };
  }, [enabled, onWakeWordDetected]);

  return null;
}
