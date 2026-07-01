// Post-workout celebratory intro — plays the HITT hero video at an
// accelerated pace for a short beat before handing off to the share
// screen (CompletionSummary). Reuses the same asset as HomeHero, so no
// extra bundle weight.
//
// Usage:
//   {showCompleted && !introDone
//     ? <CompletionIntro onComplete={() => setIntroDone(true)} />
//     : <CompletionSummary ... />}

import { useEffect, useRef } from "react";
import heroVideo from "@/assets/hiit-hero.mp4";

interface CompletionIntroProps {
  /** How long to show the intro before firing onComplete (ms). Default 2000. */
  durationMs?: number;
  /** Playback speed multiplier. 1.0 matches the home hero; 3.0 is a fast, punchy beat. */
  playbackRate?: number;
  /** Called when the intro is done and the parent should show the next screen. */
  onComplete: () => void;
}

export function CompletionIntro({
  durationMs = 2000,
  playbackRate = 3.0,
  onComplete,
}: CompletionIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.playbackRate = playbackRate;
      // If the browser blocks autoplay, keep going — the timer still hands off.
      v.play().catch(() => {});
    }
    const timer = setTimeout(onComplete, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, playbackRate, onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black overflow-hidden"
      style={{ animation: "fadeIn 220ms ease-out" }}
    >
      <video
        ref={videoRef}
        src={heroVideo}
        muted
        playsInline
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Vignette so mid-scene frames of the video don't clash with the next screen */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/50" />

      {/* Inline keyframe — cheaper than pulling a shared animation lib */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
