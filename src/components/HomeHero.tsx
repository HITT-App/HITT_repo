import { useEffect, useRef, useState } from "react";
import heroVideo from "@/assets/hiit-hero.mp4";
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
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover scale-105"
      >
        <source src={heroVideo} type="video/mp4" />
      </video>
      
      {/* Gradient Overlay - cleaner */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/70" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-5 pt-10">
        {/* Top Section - Logo */}
        <div className="flex justify-center opacity-0 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <span className="text-white font-bold text-xl">H</span>
          </div>
        </div>

        {/* Bottom Section - Greeting */}
        <div className="mb-20 opacity-0 animate-fade-up" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white tracking-tight">
                {greeting},
              </h1>
              <h1 className="text-3xl font-semibold text-primary tracking-tight">
                {userName}.
              </h1>
              <p className="mt-2 text-base text-white/70 font-light">
                Need a plan for today?
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-full"
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
