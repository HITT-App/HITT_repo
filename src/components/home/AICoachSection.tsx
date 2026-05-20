import { ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import hiitLogo from "@/assets/hiit-logo.jpg";

interface AICoachSectionProps {
  improvementPercent?: number;
  periodLabel?: string;
}

export function AICoachSection({
  improvementPercent = 3.5,
  periodLabel = "last month",
}: AICoachSectionProps) {
  const navigate = useNavigate();

  return (
    <div className="px-6 py-2">
      <Card className="p-4 bg-card border border-border/60">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
            <img 
              src={hiitLogo} 
              alt="HIIT AI Coach" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">HIIT AI Coach</h3>
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              You are currently improving around {improvementPercent}% from {periodLabel}.
              Would you like fitness tips?
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              0:25 ago
            </div>
          </div>
        </div>
        
        <Button
          variant="link"
          className="w-full text-primary text-sm mt-2"
          onClick={() => navigate("/ai-coach")}
        >
          See in Detail
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </Card>
    </div>
  );
}
