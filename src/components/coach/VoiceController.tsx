import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { WakeWordListener } from './WakeWordListener';
import { JarvisMode } from './JarvisMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function VoiceController() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [showJarvisMode, setShowJarvisMode] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Check if user has granted microphone permission
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setHasPermission(result.state === 'granted');
        
        result.onchange = () => {
          setHasPermission(result.state === 'granted');
        };
      } catch {
        // Fallback for browsers that don't support permissions API
        setHasPermission(null);
      }
    };
    
    checkPermission();
  }, []);

  // Load wake word preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('hiit-wake-word-enabled');
    if (saved === 'true' && hasPermission) {
      setWakeWordEnabled(true);
    }
  }, [hasPermission]);

  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem('hiit-wake-word-enabled', wakeWordEnabled.toString());
  }, [wakeWordEnabled]);

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
    
    // Disable wake word listening while in Jarvis Mode
    setWakeWordEnabled(false);
    
    // Get or create conversation
    const convoId = await getOrCreateConversation();
    if (!convoId) {
      toast.error('Failed to start voice mode');
      setWakeWordEnabled(true);
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
    
    // Re-enable wake word listening after a short delay
    setTimeout(() => {
      setWakeWordEnabled(true);
    }, 1000);
  }, []);

  // Enable wake word listening (called from settings)
  const enableWakeWord = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      setWakeWordEnabled(true);
      toast.success('"Ok HIIT" voice activation enabled');
    } catch (error) {
      console.error('Microphone permission denied:', error);
      toast.error('Microphone permission is required for voice activation');
    }
  }, []);

  // Disable wake word listening
  const disableWakeWord = useCallback(() => {
    setWakeWordEnabled(false);
    toast.info('"Ok HIIT" voice activation disabled');
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

// Export a hook for other components to control wake word
export function useVoiceController() {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem('hiit-wake-word-enabled') === 'true';
  });

  const toggle = useCallback(async () => {
    if (!enabled) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        localStorage.setItem('hiit-wake-word-enabled', 'true');
        setEnabled(true);
        toast.success('"Ok HIIT" voice activation enabled');
      } catch {
        toast.error('Microphone permission is required');
      }
    } else {
      localStorage.setItem('hiit-wake-word-enabled', 'false');
      setEnabled(false);
      toast.info('"Ok HIIT" voice activation disabled');
    }
  }, [enabled]);

  return { enabled, toggle };
}
