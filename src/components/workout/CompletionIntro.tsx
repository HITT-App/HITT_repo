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
// Pre-clipped 8–11s window of the home hero video, played at 1.5× → 2s beat.
import heroVideo from "@/assets/hiit-hero-clip.mp4";

interface CompletionIntroProps {
  /** How long to show the intro before firing onComplete (ms). Default 2000 (3s clip @ 1.5×). */
  durationMs?: number;
  /** Playback speed multiplier. 1.5 gives a punchy but readable beat. */
  playbackRate?: number;
  /** Called when the intro is done and the parent should show the next screen. */
  onComplete: () => void;
}

export function CompletionIntro({
  durationMs = 2000,
  playbackRate = 1.5,
  onComplete,
}: CompletionIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Latest-callback ref — so we can run the effect ONCE (empty deps) yet
  // still call the freshest onComplete when the timer fires. Prevents the
  // Android loop where a re-rendering parent's new arrow-function callback
  // tore down and restarted the 2s timer every render.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.playbackRate = playbackRate;
      // If the browser blocks autoplay, keep going — the timer still hands off.
      v.play().catch(() => {});
    }
    const timer = setTimeout(() => onCompleteRef.current(), durationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- effect runs once; freshest callback comes from the ref.
  }, []);

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
