import { useState, useRef, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { HIITLogo } from "./HIITLogo";
import welcomeBg from "@/assets/welcome-bg.jpg";

interface PostLoginWelcomeProps {
  userName: string;
  onDismiss: () => void;
}

export const PostLoginWelcome = ({ userName, onDismiss }: PostLoginWelcomeProps) => {
  const [isDismissing, setIsDismissing] = useState(false);

  const dismiss = () => {
    if (isDismissing) return;
    setIsDismissing(true);
    sessionStorage.setItem("hiit_welcomed", "true");
    setTimeout(onDismiss, 400);
  };

  // Auto-dismiss hint animation
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center transition-transform duration-400 ease-out ${
        isDismissing ? "-translate-y-full" : ""
      }`}
      onClick={dismiss}
      onTouchEnd={dismiss}
    >
      {/* Dark overlay with video-like background */}
      <img src={welcomeBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-up">
        <HIITLogo size="2xl" variant="orange" className="w-20 h-20" />
        <h1 className="text-3xl font-bold text-white mt-2">
          Hello, {userName}!
        </h1>
      </div>

      {/* Swipe up indicator */}
      <div className={`absolute bottom-16 left-0 right-0 flex flex-col items-center gap-2 transition-opacity duration-500 ${showHint ? "opacity-100" : "opacity-0"}`}>
        <ChevronUp className="w-6 h-6 text-white/60 animate-bounce" />
        <p className="text-white/50 text-sm">Tap to continue</p>
        {/* Home indicator bar */}
        <div className="w-32 h-1 bg-white/30 rounded-full mt-4" />
      </div>
    </div>
  );
};
