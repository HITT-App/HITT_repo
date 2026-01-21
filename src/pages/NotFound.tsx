import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {/* Illustration */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="absolute inset-0 bg-primary/10 rounded-full" />
          <div className="absolute inset-4 bg-primary/20 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FileQuestion className="w-20 h-20 text-primary" />
          </div>
          {/* 404 Badge */}
          <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground font-bold text-lg rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
            404
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Page Not Found
        </h1>
        <p className="text-muted-foreground mb-8">
          Oops! The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            className="w-full rounded-xl py-6 gap-2"
            onClick={() => navigate("/")}
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-xl py-6 gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
