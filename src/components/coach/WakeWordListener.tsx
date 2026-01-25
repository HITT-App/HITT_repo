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
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const lastDetectedRef = useRef<number>(0);
  const isConnectingRef = useRef(false);
  
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

  const startListening = useCallback(async () => {
    if (!user || isConnected || isConnectingRef.current) return;
    
    isConnectingRef.current = true;
    
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get scribe token
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      
      if (error || !data?.token) {
        console.error('[WakeWord] Failed to get token:', error);
        // Retry after 30 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          isConnectingRef.current = false;
          startListening();
        }, 30000);
        return;
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setIsConnected(true);
      isConnectingRef.current = false;
      console.log('[WakeWord] Listening for "Ok HIIT"...');
    } catch (error) {
      console.error('[WakeWord] Failed to start:', error);
      isConnectingRef.current = false;
      // Retry after 30 seconds
      reconnectTimeoutRef.current = setTimeout(startListening, 30000);
    }
  }, [user, isConnected, scribe]);

  const stopListening = useCallback(() => {
    scribe.disconnect();
    setIsConnected(false);
    isConnectingRef.current = false;
    console.log('[WakeWord] Stopped listening');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, [scribe]);

  // Handle enable/disable
  useEffect(() => {
    if (enabled && user && !isConnected && !isConnectingRef.current) {
      startListening();
    } else if (!enabled && isConnected) {
      stopListening();
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, user, isConnected, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // No visual UI - this is a background listener
  return null;
}
