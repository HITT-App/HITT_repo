import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [isListening, setIsListening] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const lastDetectedRef = useRef<number>(0);
  
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      checkForWakeWord(data.text);
    },
    onCommittedTranscript: (data) => {
      checkForWakeWord(data.text);
    },
  });

  const checkForWakeWord = useCallback((text: string) => {
    const normalizedText = text.toLowerCase().trim();
    
    // Check if any wake phrase is in the transcript
    const detected = WAKE_PHRASES.some(phrase => normalizedText.includes(phrase));
    
    if (detected) {
      // Debounce - prevent multiple triggers within 3 seconds
      const now = Date.now();
      if (now - lastDetectedRef.current > 3000) {
        lastDetectedRef.current = now;
        console.log('[WakeWord] Detected:', text);
        onWakeWordDetected();
      }
    }
  }, [onWakeWordDetected]);

  const startListening = useCallback(async () => {
    if (!user || isListening) return;
    
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get scribe token
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      
      if (error || !data?.token) {
        console.error('[WakeWord] Failed to get token:', error);
        // Retry after 30 seconds
        reconnectTimeoutRef.current = setTimeout(startListening, 30000);
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
      console.log('[WakeWord] Listening for "Ok HIIT"...');
    } catch (error) {
      console.error('[WakeWord] Failed to start:', error);
      // Retry after 30 seconds
      reconnectTimeoutRef.current = setTimeout(startListening, 30000);
    }
  }, [user, isListening, scribe]);

  const stopListening = useCallback(() => {
    scribe.disconnect();
    setIsListening(false);
    console.log('[WakeWord] Stopped listening');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, [scribe]);

  // Handle enable/disable
  useEffect(() => {
    if (enabled && user && !isListening) {
      startListening();
    } else if (!enabled && isListening) {
      stopListening();
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // No visual UI - this is a background listener
  return null;
}
