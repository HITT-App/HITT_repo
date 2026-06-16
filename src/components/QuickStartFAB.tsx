import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function QuickStartFAB() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-24 right-4 z-40" data-tutorial="fab">
      <Button
        size="lg"
        className="w-14 h-14 rounded-full shadow-elevated p-0 bg-primary hover:bg-primary/90"
        onClick={() => navigate('/ai')}
      >
        <Bot className="w-6 h-6 text-primary-foreground" />
      </Button>
    </div>
  );
}
