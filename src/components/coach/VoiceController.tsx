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

  // Opens Jarvis — shared by wake word, HIIT button tap, and the hitt:open-jarvis event
  const handleWakeWordDetected = useCallback(() => {
    setShowJarvisMode(true);
    if ('vibrate' in navigator) navigator.vibrate(100);
  }, []);

  // The centre HIIT button dispatches this event — same path as the wake word
  useEffect(() => {
    window.addEventListener('hitt:open-jarvis', handleWakeWordDetected);
    return () => window.removeEventListener('hitt:open-jarvis', handleWakeWordDetected);
  }, [handleWakeWordDetected]);

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
        />
      )}
    </>
  );
}

