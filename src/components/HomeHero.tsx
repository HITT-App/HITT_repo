import { useEffect, useRef, useState } from "react";
import heroVideo from "@/assets/hiit-hero.mp4";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import hiitLogo from "@/assets/hiit-logo.webp";

interface HomeHeroProps {
  userName?: string;
}

const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Welcome back";
};

export const HomeHero = ({ userName = "Makise" }: HomeHeroProps) => {
  const greeting = getTimeGreeting();
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(() => sessionStorage.getItem('voice_greeting_played') === 'true');
  const [isMuted, setIsMuted] = useState(false);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "hero_video_url")
      .single()
      .then(({ data }) => {
        if (data?.value) setCustomVideoUrl(data.value);
      });
  }, []);

  const playVoiceGreeting = async () => {
    if (hasPlayed || isPlaying) return;
    
    setIsPlaying(true);
    try {
      const text = `${greeting}, ${userName}. Need a plan for today?`;
      const cacheKey = `tts_cache_${text}`;
      
      let audioUrl: string;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        // Use cached audio — no API call
        audioUrl = cached;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ text }),
          }
        );

        if (!response.ok) {
          throw new Error(`TTS request failed: ${response.status}`);
        }

        const audioBlob = await response.blob();
        // Convert to base64 data URL for caching
        const reader = new FileReader();
        audioUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(audioBlob);
        });
        
        try {
          sessionStorage.setItem(cacheKey, audioUrl);
        } catch {
          // sessionStorage full — still play, just don't cache
        }
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.volume = isMuted ? 0 : 1;
      
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      await audio.play();
      setHasPlayed(true);
      sessionStorage.setItem('voice_greeting_played', 'true');
    } catch (error) {
      console.error("Voice greeting error:", error);
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 1 : 0;
    }
  };

  useEffect(() => {
    const handleInteraction = () => {
      if (!hasPlayed) {
        playVoiceGreeting();
      }
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };

    document.addEventListener("click", handleInteraction);
    document.addEventListener("touchstart", handleInteraction);

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, [hasPlayed]);

  return (
    <div 
      className="relative h-[55vh] min-h-[380px] sm:h-[60vh] sm:min-h-[450px] w-full overflow-hidden"
      style={{ paddingTop: "var(--safe-area-inset-top, 0px)" }}
    >
      {/* Background Video */}
      <video
        key={customVideoUrl || 'default'}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover scale-105"
        src={customVideoUrl || heroVideo}
      />
      
      {/* Gradient Overlay - cleaner */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/70" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-6 pb-8">
        {/* Logo - top center */}
        <div className="absolute top-10 left-0 right-0 flex justify-center opacity-0 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
          <img src={hiitLogo} alt="HIIT Logo" className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-lg" />
        </div>

        {/* Bottom Section - Greeting */}
        <div className="mb-16 opacity-0 animate-fade-up" style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}>
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium tracking-widest uppercase text-white/40 mb-2">
                {greeting}
              </p>
              <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">
                {userName}.
              </h1>
              <p className="mt-3 text-base text-white/50 font-light">
                Need a plan for today?
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white/40 hover:text-white hover:bg-white/10 transition-colors rounded-full mb-1"
              aria-label={isMuted ? "Unmute voice" : "Mute voice"}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
