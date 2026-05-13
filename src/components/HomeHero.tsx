import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import heroVideo from "@/assets/hiit-hero.mp4";
import { Mic, Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import hiitLogo from "@/assets/hiit-logo.webp";
import { useWakeWordPreference } from "@/hooks/useWakeWordPreference";

interface HomeHeroProps {
  userName?: string;
}

const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Hey";
};

export const HomeHero = ({ userName = "Athlete" }: HomeHeroProps) => {
  const greeting = getTimeGreeting();
  const navigate = useNavigate();
  const { enabled: wakeWordEnabled } = useWakeWordPreference();

  const isPlayingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasPlayed, setHasPlayed]   = useState(false);
  const [isMuted, setIsMuted]       = useState(false);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from("app_settings").select("value").eq("key", "hero_video_url").single();
        setCustomVideoUrl(data?.value || null);
      } catch {
        setCustomVideoUrl(null);
      }
    };
    load();
  }, []);

  // Reset the played flag when the app comes back to the foreground so the
  // greeting fires again each time the user returns to the home screen.
  useEffect(() => {
    let listener: { remove: () => void } | null = null;
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) setHasPlayed(false);
    }).then(l => { listener = l; }).catch(() => {});
    return () => { listener?.remove(); };
  }, []);

  const playVoiceGreeting = async () => {
    if (hasPlayed || isPlayingRef.current) return;
    isPlayingRef.current = true;
    try {
      // Greeting includes Ok HIIT prompt if wake word is on
      // "HIIT" reads as individual letters — replace with phonetic "hit" for TTS
      const rawText = wakeWordEnabled
        ? `${greeting} ${userName}! Your coach is ready. Say Ok hit anytime to activate me.`
        : `${greeting} ${userName}! Your coach is ready — tap the chat to get started.`;
      const text = rawText;

      const cacheKey = `tts_cache_${text}`;
      let audioUrl: string;
      const cached = sessionStorage.getItem(cacheKey);

      if (cached) {
        audioUrl = cached;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { isPlayingRef.current = false; return; }

        const voiceId = localStorage.getItem('hiit-ai-voice-id') ?? 'JBFqnCBsd6RMkjVDRZzb';
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ text, voiceId }),
          }
        );

        if (!res.ok) { isPlayingRef.current = false; return; }

        const blob = await res.blob();
        const reader = new FileReader();
        audioUrl = await new Promise<string>(resolve => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        try { sessionStorage.setItem(cacheKey, audioUrl); } catch {}
      }

      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.volume = isMuted ? 0 : 1;
      audio.onended = () => { isPlayingRef.current = false; };
      await audio.play();
      setHasPlayed(true);
    } catch (err) {
      console.error("[HomeHero] Voice greeting error:", err);
      isPlayingRef.current = false;
    }
  };

  const toggleMute = () => {
    setIsMuted(m => !m);
    if (audioRef.current) audioRef.current.volume = isMuted ? 1 : 0;
  };

  useEffect(() => {
    if (hasPlayed) return;

    // Always register interaction fallback first — iOS blocks autoplay until user touches
    const handleInteraction = () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      playVoiceGreeting();
    };
    document.addEventListener("click", handleInteraction, { passive: true });
    document.addEventListener("touchstart", handleInteraction, { passive: true });

    // Also attempt autoplay after 800ms — works if the user already interacted
    timerRef.current = setTimeout(() => { playVoiceGreeting(); }, 800);

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, [hasPlayed]);

  return (
    <div
      className="relative h-[65vh] min-h-[440px] sm:h-[70vh] sm:min-h-[500px] w-full overflow-hidden"
      style={{ paddingTop: "var(--safe-area-inset-top, 0px)" }}
    >
      {/* Background Video */}
      {customVideoUrl !== undefined && (
        <video key={customVideoUrl || 'default'} autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover scale-105"
          src={customVideoUrl || heroVideo}
        />
      )}

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

      {/* Logo */}
      <div className="absolute left-0 right-0 flex justify-center opacity-0 animate-fade-up"
        style={{ top: "calc(var(--safe-area-inset-top, 44px) + 1rem)", animationDelay: "0.1s", animationFillMode: "forwards" }}>
        <div className="relative">
          <div className="absolute -inset-2 rounded-3xl bg-primary/20 blur-xl" />
          <img src={hiitLogo} alt="HIIT Logo" className="relative w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-2xl" />
        </div>
      </div>

      {/* Ok HIIT indicator — shown when wake word is enabled */}
      {wakeWordEnabled && (
        <div className="absolute left-0 right-0 flex justify-center opacity-0 animate-fade-up"
          style={{ top: "calc(var(--safe-area-inset-top, 44px) + 5.5rem)", animationDelay: "0.5s", animationFillMode: "forwards" }}>
          <button
            onClick={() => navigate('/ai-coach')}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-black/30 backdrop-blur-md active:bg-white/10 transition-all"
          >
            {/* Pulsing mic ring */}
            <div className="relative w-5 h-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" style={{ animationDuration: '2s' }} />
              <Mic className="w-3 h-3 text-primary relative z-10" />
            </div>
            <span className="text-[11px] font-semibold tracking-widest text-white/80 uppercase">
              Say OK HIIT
            </span>
          </button>
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-10">
        <div className="opacity-0 animate-fade-up" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
          <span className="inline-block text-[11px] font-semibold tracking-[0.2em] uppercase text-primary/80 mb-3">
            {greeting}
          </span>
          <h1 className="text-[42px] leading-[1.05] font-extrabold text-white tracking-tight">
            {userName}<span className="text-primary">.</span>
          </h1>
        </div>

        <div className="flex items-end justify-between mt-4 opacity-0 animate-fade-up"
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
          <p className="text-[15px] text-white/45 font-light tracking-wide">
            Need a plan for today?
          </p>
          <Button variant="ghost" size="icon" onClick={toggleMute}
            className="text-white/30 hover:text-white hover:bg-white/10 transition-all rounded-full h-9 w-9"
            aria-label={isMuted ? "Unmute voice" : "Mute voice"}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
