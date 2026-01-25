import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { WakeWordListener } from './WakeWordListener';
import { JarvisMode } from './JarvisMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWakeWordPreference } from '@/hooks/useWakeWordPreference';

export function VoiceController() {
  const { user } = useAuth();
  const location = useLocation();
  const { enabled: wakeWordEnabled } = useWakeWordPreference();
  const [showJarvisMode, setShowJarvisMode] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Create or get conversation for Jarvis Mode
  const getOrCreateConversation = useCallback(async () => {
    if (!user) return null;

    try {
      // Try to get the most recent conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        return existing.id;
      }

      // Create a new conversation
      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: 'Voice Conversation' })
        .select('id')
        .single();

      if (error) throw error;
      return newConvo?.id || null;
    } catch (error) {
      console.error('Failed to get/create conversation:', error);
      return null;
    }
  }, [user]);

  // Handle wake word detection
  const handleWakeWordDetected = useCallback(async () => {
    console.log('[VoiceController] Wake word detected!');
    
    // Get or create conversation
    const convoId = await getOrCreateConversation();
    if (!convoId) {
      toast.error('Failed to start voice mode');
      return;
    }

    setConversationId(convoId);
    setShowJarvisMode(true);
    
    // Play activation sound/haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  }, [getOrCreateConversation]);

  // Handle Jarvis Mode close
  const handleJarvisModeClose = useCallback(() => {
    setShowJarvisMode(false);
    setConversationId(null);
  }, []);

  // Don't render anything if user is not logged in
  if (!user) return null;

  // Don't listen during Jarvis Mode or on auth/welcome pages
  const shouldListenForWakeWord = wakeWordEnabled && 
    !showJarvisMode && 
    !location.pathname.startsWith('/auth') && 
    !location.pathname.startsWith('/welcome');

  return (
    <>
      {/* Background wake word listener */}
      <WakeWordListener 
        enabled={shouldListenForWakeWord}
        onWakeWordDetected={handleWakeWordDetected}
      />

      {/* Full-screen Jarvis Mode */}
      {showJarvisMode && conversationId && (
        <JarvisMode 
          conversationId={conversationId}
          onClose={handleJarvisModeClose}
        />
      )}
    </>
  );
}

