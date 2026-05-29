import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { enabled: wakeWordEnabled } = useWakeWordPreference();
  const { profile: healthProfile } = useHealthProfile();
  const [showShareNudge, setShowShareNudge] = useState(false);
  const [sharePromptDetail, setSharePromptDetail] = useState<SharePromptDetail | null>(null);

  const handleWakeWordDetected = useCallback(() => {
    navigate('/ai');
    if ('vibrate' in navigator) navigator.vibrate(100);
  }, [navigate]);

  // hitt:open-jarvis — navigate to /ai, passing optional prefillMessage via location state
  const handleOpenJarvis = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail as { prefillMessage?: string } | null;
    const prefillMessage = detail?.prefillMessage ?? undefined;
    navigate('/ai', { state: { tab: 'chat', prefillMessage } });
    if ('vibrate' in navigator) navigator.vibrate(100);
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('hitt:open-jarvis', handleOpenJarvis as EventListener);
    return () => window.removeEventListener('hitt:open-jarvis', handleOpenJarvis as EventListener);
  }, [handleOpenJarvis]);

  // Post-workout share nudge — rendered as a full-screen overlay (not /ai route)
  const handleSharePrompt = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail as SharePromptDetail;
    if (!detail) return;
    setSharePromptDetail(detail);
    setShowShareNudge(true);
  }, []);

  useEffect(() => {
    window.addEventListener('hitt:open-jarvis-share', handleSharePrompt as EventListener);
    return () => window.removeEventListener('hitt:open-jarvis-share', handleSharePrompt as EventListener);
  }, [handleSharePrompt]);

  const handleShareNudgeClose = useCallback(() => {
    setShowShareNudge(false);
    setSharePromptDetail(null);
  }, []);

  if (!user) return null;

  const shouldListenForWakeWord = wakeWordEnabled &&
    !showShareNudge &&
    !location.pathname.startsWith('/auth') &&
    !location.pathname.startsWith('/welcome');

  return (
    <>
      <WakeWordListener
        enabled={shouldListenForWakeWord}
        onWakeWordDetected={handleWakeWordDetected}
      />
      {showShareNudge && (
        <JarvisMode
          healthProfile={healthProfile}
          onClose={handleShareNudgeClose}
          sharePromptDetail={sharePromptDetail}
        />
      )}
    </>
  );
}
