import heroVideo from "@/assets/hiit-hero.mp4";
import { HIITLogo } from "./HIITLogo";

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
      </div>
    </div>
  );
};
