import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPTED_KEY = "hitt-community-guidelines-accepted";

const CommunityOnboarding = () => {
  const navigate = useNavigate();

  // Skip straight to feed if guidelines already accepted
  useEffect(() => {
    if (localStorage.getItem(ACCEPTED_KEY)) {
      navigate("/community/feed", { replace: true });
    }
  }, [navigate]);

  const guidelines = [
    { id: "kind", label: "Be kind to others" },
    { id: "follow", label: "Follow community guidelines" },
    { id: "toxic", label: "No toxic behaviour" },
  ];

  const handleContinue = () => {
    localStorage.setItem(ACCEPTED_KEY, "1");
    navigate("/community/feed");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center px-4 py-3" style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2">Community Guidelines</h1>
      </header>
      {/* Hero Image */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative w-64 h-64">
          <span className="text-[200px] leading-none">📢</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pb-12">
        <h1 className="text-2xl font-bold text-center mb-2">Before you post</h1>
        <p className="text-center text-muted-foreground mb-8">
          Please read the following guidelines.
        </p>

        {/* Guidelines */}
        <div className="space-y-4 mb-8">
          {guidelines.map((guideline) => (
            <div 
              key={guideline.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border"
            >
              <span className="text-sm">{guideline.label}</span>
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <Button 
          className="w-full bg-primary hover:bg-primary/90 mb-4"
          onClick={handleContinue}
        >
          Got it, let's begin <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        {/* Links */}
        <div className="flex items-center justify-center gap-4 text-sm">
          <button className="text-primary hover:underline">Terms & Conditions</button>
          <span className="text-muted-foreground">·</span>
          <button className="text-primary hover:underline">Privacy Policy</button>
        </div>
      </div>
    </div>
  );
};

export default CommunityOnboarding;
