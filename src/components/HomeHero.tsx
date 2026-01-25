import { useEffect, useRef, useState } from "react";
import heroVideo from "@/assets/hiit-hero.mp4";
import { HIITLogo } from "./HIITLogo";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";

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
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playVoiceGreeting = async () => {
    if (hasPlayed || isPlaying) return;
    
    setIsPlaying(true);
    try {
      const text = `${greeting}, ${userName}. Need a plan for today?`;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.volume = isMuted ? 0 : 1;
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      setHasPlayed(true);
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

  // Auto-play on first interaction with the page
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
      className="relative h-[60vh] min-h-[400px] sm:h-[70vh] sm:min-h-[500px] w-full overflow-hidden"
      style={{ paddingTop: "var(--safe-area-inset-top, 0px)" }}
    >
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover blur-[2px] scale-105"
      >
        <source src={heroVideo} type="video/mp4" />
      </video>
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Gradient Overlay */}
      <div 
        className="absolute inset-0"
        style={{ background: "var(--gradient-hero)" }}
      />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-4 sm:p-6 pt-8 sm:pt-12">
        {/* Top Section - Logo */}
        <div className="flex justify-center opacity-0 animate-fade-up" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
          <HIITLogo size="xl" className="shadow-glow" />
        </div>

        {/* Bottom Section - Jarvis-Style Greeting */}
        <div className="mb-16 sm:mb-20 opacity-0 animate-fade-up" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {greeting}, <span className="text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{userName}.</span>
              </h1>
              <p 
                className="mt-2 text-lg sm:text-xl text-white/80 italic opacity-0 animate-typewriter"
                style={{ animationDelay: "0.8s", animationFillMode: "forwards" }}
              >
                Need a plan for today?
                <span className="inline-block w-0.5 h-5 bg-primary ml-1 animate-cursor-blink align-middle" />
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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
