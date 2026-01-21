import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";

const UpdateRequired = () => {
  const handleUpdate = () => {
    // In a real app, this would redirect to the app store
    window.open("https://apps.apple.com", "_blank");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {/* Illustration */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="absolute inset-0 bg-primary/10 rounded-full" />
          <div className="absolute inset-4 bg-primary/20 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Smartphone className="w-20 h-20 text-primary" />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Update Required
        </h1>
        <p className="text-muted-foreground mb-4">
          A new version of HIIT is available with exciting new features and improvements. Please update to continue.
        </p>

        {/* Version info */}
        <div className="bg-secondary rounded-xl p-4 mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Current version</span>
            <span className="font-medium">2.1.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Latest version</span>
            <span className="font-medium text-primary">2.2.0</span>
          </div>
        </div>

        {/* What's new */}
        <div className="bg-secondary rounded-xl p-4 mb-8 text-left">
          <h3 className="font-semibold mb-3">What's New</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Improved AI coaching responses
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              New workout tracking features
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Bug fixes and performance improvements
            </li>
          </ul>
        </div>

        {/* Action */}
        <Button
          className="w-full rounded-xl py-6 gap-2"
          onClick={handleUpdate}
        >
          <Download className="w-5 h-5" />
          Update Now
        </Button>
      </div>
    </div>
  );
};

export default UpdateRequired;
