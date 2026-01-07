import heroImage from "@/assets/hero-runner.jpg";
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
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Hello, <span className="text-primary">{userName}!</span>
          </h1>
        </div>
      </div>
    </div>
  );
};
