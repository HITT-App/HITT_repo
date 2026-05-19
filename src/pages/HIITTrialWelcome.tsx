import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HEmoji } from "@/components/HEmoji";

const HIITTrialWelcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      {/* Decorative Athletes */}
      <div className="relative w-64 h-40 mb-8">
        {/* Left athlete silhouette */}
        <div className="absolute left-0 top-0 w-20 h-32 opacity-20">
          <svg viewBox="0 0 100 160" className="w-full h-full fill-current text-foreground">
            <ellipse cx="50" cy="20" rx="15" ry="18" />
            <rect x="42" y="38" width="16" height="50" rx="4" />
            <rect x="30" y="45" width="40" height="8" rx="4" transform="rotate(-30 50 49)" />
            <rect x="38" y="88" width="10" height="45" rx="4" transform="rotate(-10 43 110)" />
            <rect x="52" y="88" width="10" height="45" rx="4" transform="rotate(10 57 110)" />
          </svg>
        </div>

        {/* Right athlete silhouette */}
        <div className="absolute right-0 top-0 w-20 h-32 opacity-20">
          <svg viewBox="0 0 100 160" className="w-full h-full fill-current text-foreground">
            <ellipse cx="50" cy="20" rx="15" ry="18" />
            <rect x="42" y="38" width="16" height="50" rx="4" />
            <rect x="30" y="45" width="40" height="8" rx="4" transform="rotate(30 50 49)" />
            <rect x="38" y="88" width="10" height="45" rx="4" transform="rotate(-5 43 110)" />
            <rect x="52" y="88" width="10" height="45" rx="4" transform="rotate(15 57 110)" />
          </svg>
        </div>

        {/* Center Badge */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-foreground text-background rounded-2xl px-6 py-4 flex items-center gap-2 shadow-elevated">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold">H</span>
              <HEmoji name="workouts" size={20}/>
            </div>
            <span className="text-xl font-bold">plus</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <HEmoji name="announcement" size={80} style={{display:'block', margin:'0 auto 16px'}} />
      <h1 className="text-2xl font-bold text-foreground mb-3 animate-fade-up">
        Your HIIT plus free trial<br />has begun!
      </h1>

      {/* Description */}
      <p className="text-muted-foreground text-sm mb-8 max-w-xs animate-fade-up stagger-1">
        You can cancel or change your plan at any time. We'll send you a reminder in 5d.
      </p>

      {/* CTA Button */}
      <Button 
        onClick={() => navigate("/")}
        className="w-full max-w-xs h-14 rounded-xl gap-2 text-base font-semibold animate-fade-up stagger-2"
      >
        Let's get fit!
        <HEmoji name="workouts" size={20}/>
      </Button>
    </div>
  );
};

export default HIITTrialWelcome;
