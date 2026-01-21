import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ServerCrash, RefreshCw } from "lucide-react";

const ServerError = () => {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {/* Illustration */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="absolute inset-0 bg-destructive/10 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-destructive/20 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ServerCrash className="w-20 h-20 text-destructive" />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Oops! Server Error
        </h1>
        <p className="text-muted-foreground mb-8">
          Something went wrong on our end. Please try refreshing the page or come back later.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            className="w-full rounded-xl py-6 gap-2"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-5 h-5" />
            Refresh Page
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-xl py-6"
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ServerError;
