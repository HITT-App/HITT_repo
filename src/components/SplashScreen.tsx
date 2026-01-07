import { useState, useEffect } from "react";
import { HIITLogo } from "./HIITLogo";
import { Progress } from "@/components/ui/progress";

interface SplashScreenProps {
  onComplete: () => void;
  variant?: "orange" | "cream" | "image";
}

export const SplashScreen = ({ onComplete, variant = "orange" }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("LOADING...");

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 300);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    return () => clearInterval(timer);
  }, [onComplete]);

  useEffect(() => {
    if (progress < 30) {
      setLoadingText("LOADING...");
    } else if (progress < 60) {
      setLoadingText("Preparing your fitness data...");
    } else if (progress < 90) {
      setLoadingText("Almost ready...");
    } else {
      setLoadingText("Let's go!");
    }
  }, [progress]);

  const bgClass = variant === "orange" 
    ? "bg-primary" 
    : variant === "cream" 
      ? "bg-background" 
      : "bg-background";

  const logoVariant = variant === "orange" ? "white" : "orange";

  return (
    <div className={`fixed inset-0 ${bgClass} flex flex-col items-center justify-center z-50`}>
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse-slow">
          <HIITLogo size="2xl" variant={logoVariant} />
        </div>
      </div>
      
      <div className="w-full max-w-xs px-8 pb-20">
        <p className={`text-center text-sm font-medium mb-4 ${
          variant === "orange" ? "text-white/80" : "text-primary"
        }`}>
          {loadingText}
        </p>
        
        <div className={`h-1 rounded-full overflow-hidden ${
          variant === "orange" ? "bg-white/20" : "bg-muted"
        }`}>
          <div 
            className={`h-full rounded-full transition-all duration-100 ${
              variant === "orange" ? "bg-white" : "bg-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className={`text-center text-xs mt-2 ${
          variant === "orange" ? "text-white/60" : "text-muted-foreground"
        }`}>
          {progress}%
        </p>
      </div>
    </div>
  );
};