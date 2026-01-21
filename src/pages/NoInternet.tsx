import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw } from "lucide-react";

const NoInternet = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {/* Illustration */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="absolute inset-0 bg-muted rounded-full" />
          <div className="absolute inset-4 bg-secondary rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <WifiOff className="w-20 h-20 text-muted-foreground" />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-foreground mb-3">
          No Internet Connection
        </h1>
        <p className="text-muted-foreground mb-8">
          Please check your network connection and try again. Make sure you're connected to WiFi or mobile data.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            className="w-full rounded-xl py-6 gap-2"
            onClick={handleRetry}
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
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

export default NoInternet;
