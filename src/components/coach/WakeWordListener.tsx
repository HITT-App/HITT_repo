import { useEffect, useRef, useCallback, useState } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface WakeWordListenerProps {
  enabled: boolean;
  onWakeWordDetected: () => void;
}

const WAKE_WORD_REGEX = /\b(?:ok|okay|hey)\s+(?:hiit|hit|heat|he\s*it|h\s*i+\s*i*\s*t)\b/;

function normalizeTranscript(text: string) {
  return text
    .toLowerCase()
    .replace(/["'’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function WakeWordListener({ enabled, onWakeWordDetected }: WakeWordListenerProps) {
  const { user } = useAuth();
  const lastDetectedRef = useRef<number>(0);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const attemptIdRef = useRef(0);

  const lastToastAtRef = useRef<number>(0);
  const toastOnce = useCallback((type: 'info' | 'error' | 'success', message: string) => {
    const now = Date.now();
    if (now - lastToastAtRef.current < 6000) return;
    lastToastAtRef.current = now;
    if (type === 'info') toast.info(message);
    if (type === 'success') toast.success(message);
    if (type === 'error') toast.error(message);
  }, []);

  const handleTranscript = useCallback(
    (text: string) => {
      const normalized = normalizeTranscript(text);
      const detected = WAKE_WORD_REGEX.test(normalized);
      if (detected) {
        const now = Date.now();
        if (now - lastDetectedRef.current > 3000) {
          lastDetectedRef.current = now;
          console.log('[WakeWord] Detected:', text);
          onWakeWordDetected();
        }
      }
    },
    [onWakeWordDetected]
  );

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      // Keep logs minimal in production; wake-word detection works off partial + committed.
      handleTranscript(data.text);
    },
    onCommittedTranscript: (data) => {
      handleTranscript(data.text);
    },
  });

  // Disconnect when disabled or unmounted
  useEffect(() => {
    if (!enabled && connectionState !== 'idle') {
      attemptIdRef.current += 1;
      scribe.disconnect();
      setConnectionState('idle');
      setNeedsUserGesture(false);
    }
  }, [enabled, connectionState, scribe]);

  const connect = useCallback(
    async (fromUserGesture: boolean) => {
      const attemptId = (attemptIdRef.current += 1);
      setConnectionState('connecting');

      try {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = undefined;
        }

        const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
        if (attemptId !== attemptIdRef.current || !enabled) return;

        if (error || !data?.token) {
          toastOnce('error', 'Voice activation failed to start (token error).');
          setConnectionState('idle');
          return;
        }

        await scribe.connect({
          token: data.token,
          microphone: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (attemptId !== attemptIdRef.current || !enabled) {
          scribe.disconnect();
          return;
        }

        setConnectionState('connected');
        setNeedsUserGesture(false);
      } catch (err) {
        // Some mobile browsers require a user gesture to start microphone capture.
        const name = err instanceof DOMException ? err.name : undefined;
        const isGestureRelated = name === 'NotAllowedError' || name === 'SecurityError';

        if (isGestureRelated && !fromUserGesture) {
          setConnectionState('idle');
          setNeedsUserGesture(true);
          toastOnce('info', 'Tap anywhere once to enable voice activation, then say “Ok HIIT”.');
          return;
        }

        toastOnce('error', 'Voice activation failed to start. Please check microphone access.');

        setConnectionState('idle');
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          // Allow another attempt after a short cooldown.
          reconnectTimeoutRef.current = undefined;
          setConnectionState('idle');
        }, 8000);
      }
    },
    [enabled, scribe, toastOnce]
  );

  // Connect when enabled
  useEffect(() => {
    if (!enabled || !user) {
      return;
    }

    if (connectionState !== 'idle') {
      return;
    }

    if (needsUserGesture) {
      // Wait for user gesture effect below.
      return;
    }

    // Attempt to connect immediately (works on most browsers).
    connect(false);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, user, connectionState, needsUserGesture, connect]);

  // If a user gesture is required, retry connection on the next tap/keypress.
  useEffect(() => {
    if (!enabled || !user || !needsUserGesture) return;

    const handler = () => {
      // Run the connection attempt directly inside the user gesture event.
      connect(true);
    };

    window.addEventListener('pointerdown', handler, { once: true, passive: true });
    window.addEventListener('keydown', handler, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [enabled, user, needsUserGesture, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      attemptIdRef.current += 1;
      scribe.disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [scribe]);

  return null;
}
