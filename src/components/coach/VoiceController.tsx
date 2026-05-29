import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { WakeWordListener } from './WakeWordListener';
import { JarvisMode } from './JarvisMode';
import { useWakeWordPreference } from '@/hooks/useWakeWordPreference';
import { useHealthProfile } from '@/hooks/useHealthProfile';

type SharePromptDetail = {
  workoutId: string;
  workoutTitle: string;
  durationMin: number;
  calories: number;
  pbs?: Array<{ kind: 'duration' | 'calories' | 'streak'; label: string; value: number; previousBest: number }>;
};

export function VoiceController() {
  const { user } = useAuth();
  const location = useLocation();
  const { enabled: wakeWordEnabled } = useWakeWordPreference();
  const { profile: healthProfile } = useHealthProfile();
  const [showJarvisMode, setShowJarvisMode] = useState(false);
  const [sharePromptDetail, setSharePromptDetail] = useState<SharePromptDetail | null>(null);
  const [prefillMessage, setPrefillMessage] = useState<string | null>(null);

  // Opens Jarvis — used by wake word and HIIT button tap (no prefill)
  const handleWakeWordDetected = useCallback(() => {
    setPrefillMessage(null);
    setShowJarvisMode(true);
    if ('vibrate' in navigator) navigator.vibrate(100);
  }, []);

  // hitt:open-jarvis — optionally carries a prefillMessage in detail
  const handleOpenJarvis = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail as { prefillMessage?: string } | null;
    setPrefillMessage(detail?.prefillMessage ?? null);
    setShowJarvisMode(true);
    if ('vibrate' in navigator) navigator.vibrate(100);
  }, []);

  useEffect(() => {
    window.addEventListener('hitt:open-jarvis', handleOpenJarvis as EventListener);
    return () => window.removeEventListener('hitt:open-jarvis', handleOpenJarvis as EventListener);
  }, [handleOpenJarvis]);

  // Post-workout share nudge — fired by WorkoutPlayer after completion
  const handleSharePrompt = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail as SharePromptDetail;
    if (!detail) return;
    setSharePromptDetail(detail);
    setShowJarvisMode(true);
  }, []);

  useEffect(() => {
    window.addEventListener('hitt:open-jarvis-share', handleSharePrompt as EventListener);
    return () => window.removeEventListener('hitt:open-jarvis-share', handleSharePrompt as EventListener);
  }, [handleSharePrompt]);

  // Handle Jarvis Mode close
  const handleJarvisModeClose = useCallback(() => {
    setShowJarvisMode(false);
    setSharePromptDetail(null);
    setPrefillMessage(null);
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
      {showJarvisMode && (
        <JarvisMode
          healthProfile={healthProfile}
          onClose={handleJarvisModeClose}
          sharePromptDetail={sharePromptDetail}
          prefillMessage={prefillMessage}
        />
      )}
    </>
  );
}

