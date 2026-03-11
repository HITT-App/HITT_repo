import { useState, useEffect } from "react";
import { HIITLogo } from "./HIITLogo";
import { supabase } from "@/integrations/supabase/client";

interface SplashScreenProps {
  onComplete: () => void;
  variant?: "orange" | "cream" | "image";
}

export const SplashScreen = ({ onComplete, variant = "orange" }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("LOADING...");
  const [customBg, setCustomBg] = useState<string | null>(null);

  useEffect(() => {
    const loadBg = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "splash_background_url")
        .maybeSingle();
      if (data?.value) setCustomBg(data.value);
    };
    loadBg();
  }, []);

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

  const isVideoBg = customBg?.startsWith("video:");
  const hasCustomBg = !!customBg;

  const bgClass = hasCustomBg
    ? "bg-black"
    : variant === "orange"
      ? "bg-primary"
      : "bg-background";

  const logoVariant = hasCustomBg || variant === "orange" ? "white" : "orange";

  return (
    <div className={`fixed inset-0 ${bgClass} flex flex-col items-center justify-center z-50`}>
      {/* Custom background layer */}
      {hasCustomBg && (
        isVideoBg ? (
          <video
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover"
            src={customBg.replace("video:", "")}
          />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${customBg})` }}
          />
        )
      )}
      {hasCustomBg && <div className="absolute inset-0 bg-black/40" />}

      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="animate-pulse-slow">
          <HIITLogo size="2xl" variant={logoVariant} />
        </div>
      </div>
      
      <div className="w-full max-w-xs px-8 pb-20 relative z-10">
        <p className={`text-center text-sm font-medium mb-4 ${
          hasCustomBg || variant === "orange" ? "text-white/80" : "text-primary"
        }`}>
          {loadingText}
        </p>
        
        <div className={`h-1 rounded-full overflow-hidden ${
          hasCustomBg || variant === "orange" ? "bg-white/20" : "bg-muted"
        }`}>
          <div 
            className={`h-full rounded-full transition-all duration-100 ${
              hasCustomBg || variant === "orange" ? "bg-white" : "bg-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className={`text-center text-xs mt-2 ${
          hasCustomBg || variant === "orange" ? "text-white/60" : "text-muted-foreground"
        }`}>
          {progress}%
        </p>
      </div>
    </div>
  );
};