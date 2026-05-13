import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { WakeWordListener } from './WakeWordListener';
import { JarvisMode } from './JarvisMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWakeWordPreference } from '@/hooks/useWakeWordPreference';
import { useHealthProfile } from '@/hooks/useHealthProfile';

export function VoiceController() {
  const { user } = useAuth();
  const location = useLocation();
  const { enabled: wakeWordEnabled } = useWakeWordPreference();
  const { profile: healthProfile } = useHealthProfile();
  const [showJarvisMode, setShowJarvisMode] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Always use one permanent "Jarvis" conversation per user so history persists
  const getOrCreateConversation = useCallback(async () => {
    if (!user) return null;

    try {
      // Fix #5: order by created_at so duplicate "Jarvis" conversations
      // (if they ever exist) always resolve to the oldest — the canonical one
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', 'Jarvis')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existing) return existing.id;

      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: 'Jarvis' })
        .select('id')
        .single();

      if (error) throw error;
      return newConvo?.id ?? null;
    } catch (error) {
      console.error('Failed to get/create conversation:', error);
      return null;
    }
  }, [user]);

  // Opens Jarvis — shared by wake word, HIIT button tap, and the hitt:open-jarvis event
  const handleWakeWordDetected = useCallback(async () => {
    const convoId = await getOrCreateConversation();
    if (!convoId) {
      toast.error('Failed to start voice mode');
      return;
    }
    setConversationId(convoId);
    setShowJarvisMode(true);
    if ('vibrate' in navigator) navigator.vibrate(100);
  }, [getOrCreateConversation]);

  // The centre HIIT button dispatches this event — same path as the wake word
  useEffect(() => {
    window.addEventListener('hitt:open-jarvis', handleWakeWordDetected);
    return () => window.removeEventListener('hitt:open-jarvis', handleWakeWordDetected);
  }, [handleWakeWordDetected]);

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
          healthProfile={healthProfile}
          onClose={handleJarvisModeClose}
        />
      )}
    </>
  );
}

