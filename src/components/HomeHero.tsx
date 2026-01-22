import heroVideo from "@/assets/hiit-hero.mp4";
import { HIITLogo } from "./HIITLogo";

interface HomeHeroProps {
  userName?: string;
}

export const HomeHero = ({ userName = "Makise" }: HomeHeroProps) => {
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
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={heroVideo} type="video/mp4" />
      </video>
      
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

        {/* Bottom Section - Greeting */}
        <div className="mb-16 sm:mb-20 opacity-0 animate-fade-up" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
          <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            Hello, <span className="text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{userName}!</span>
          </h1>
        </div>
      </div>
    </div>
  );
};
