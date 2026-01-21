import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Community = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Image */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-b from-primary/5 to-background">
        <div className="text-center">
          <div className="w-64 h-64 mx-auto mb-6 rounded-3xl overflow-hidden bg-muted flex items-center justify-center">
            <img src="/placeholder.svg" alt="Community" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold mb-2">HIIT Fitness Community</h1>
          <p className="text-muted-foreground">
            Share your fitness progress and interact with other members here.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="p-6 pb-12">
        <Button 
          className="w-full bg-primary hover:bg-primary/90"
          onClick={() => navigate("/community/onboarding")}
        >
          Explore Community <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default Community;
