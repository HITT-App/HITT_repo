import { Button } from "@/components/ui/button";
import { Wrench, Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Maintenance = () => {
  const [notifyEnabled, setNotifyEnabled] = useState(false);

  const handleNotify = () => {
    setNotifyEnabled(true);
    toast.success("We'll notify you when we're back online!");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {/* Illustration */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-primary/20 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Wrench className="w-20 h-20 text-primary" />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Under Maintenance
        </h1>
        <p className="text-muted-foreground mb-4">
          We're currently performing scheduled maintenance to improve your experience. We'll be back soon!
        </p>
        
        {/* Estimated time */}
        <div className="bg-secondary rounded-xl p-4 mb-8">
          <p className="text-sm text-muted-foreground">Estimated downtime</p>
          <p className="text-lg font-semibold text-foreground">~30 minutes</p>
        </div>

        {/* Actions */}
        <Button
          className="w-full rounded-xl py-6 gap-2"
          onClick={handleNotify}
          disabled={notifyEnabled}
        >
          <Bell className="w-5 h-5" />
          {notifyEnabled ? "You'll be notified" : "Notify Me When Ready"}
        </Button>
      </div>
    </div>
  );
};

export default Maintenance;
