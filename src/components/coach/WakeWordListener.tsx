import { useEffect, useRef, useCallback, useState } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WakeWordListenerProps {
  enabled: boolean;
  onWakeWordDetected: () => void;
}

const WAKE_PHRASES = ['ok hiit', 'okay hiit', 'ok hit', 'okay hit', 'hey hiit', 'hey hit'];

export function WakeWordListener({ enabled, onWakeWordDetected }: WakeWordListenerProps) {
  const { user } = useAuth();
  const lastDetectedRef = useRef<number>(0);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  console.log('[WakeWordListener] Render - enabled:', enabled, 'user:', !!user, 'state:', connectionState);

  const handleTranscript = useCallback(
    (text: string) => {
      const normalized = text.toLowerCase().trim();
      const detected = WAKE_PHRASES.some((phrase) => normalized.includes(phrase));
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
      console.log('[WakeWord] Partial:', data.text);
      handleTranscript(data.text);
    },
    onCommittedTranscript: (data) => {
      console.log('[WakeWord] Committed:', data.text);
      handleTranscript(data.text);
    },
  });

  // Disconnect when disabled or unmounted
  useEffect(() => {
    if (!enabled && connectionState === 'connected') {
      console.log('[WakeWord] Disabling - disconnecting...');
      scribe.disconnect();
      setConnectionState('idle');
    }
  }, [enabled, connectionState, scribe]);

  // Connect when enabled
  useEffect(() => {
    if (!enabled || !user) {
      console.log('[WakeWord] Not starting - enabled:', enabled, 'user:', !!user);
      return;
    }

    if (connectionState !== 'idle') {
      console.log('[WakeWord] Already', connectionState);
      return;
    }

    let cancelled = false;

    const connect = async () => {
      setConnectionState('connecting');
      console.log('[WakeWord] Requesting microphone & token...');

      try {
        // Request mic permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());

        console.log('[WakeWord] Mic permission granted, fetching token...');
        const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');

        if (cancelled) {
          console.log('[WakeWord] Cancelled during token fetch');
          setConnectionState('idle');
          return;
        }

        if (error || !data?.token) {
          console.error('[WakeWord] Token error:', error || 'No token');
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionState('idle');
          }, 30000);
          return;
        }

        console.log('[WakeWord] Token received, connecting to Scribe...');

        await scribe.connect({
          token: data.token,
          microphone: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        if (cancelled) {
          console.log('[WakeWord] Cancelled after connect');
          scribe.disconnect();
          setConnectionState('idle');
          return;
        }

        console.log('[WakeWord] Connected! Listening for "Ok HIIT"...');
        setConnectionState('connected');
      } catch (err) {
        console.error('[WakeWord] Connect error:', err);
        if (!cancelled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionState('idle');
          }, 30000);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, user, connectionState, scribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[WakeWord] Unmounting - disconnecting...');
      scribe.disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [scribe]);

  return null;
}
