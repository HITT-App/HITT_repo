import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHealthSync } from "@/hooks/useHealthSync";

export function HealthSyncPrompt() {
  const { available, authorized, syncing, requestAuthorization, syncRecent } = useHealthSync();

  useEffect(() => {
    if (authorized) syncRecent();
  }, [authorized, syncRecent]);

  if (!available || authorized) return null;

  const platformName = Capacitor.getPlatform() === "ios" ? "Apple Health" : "Health Connect";

  return (
    <div className="mx-6 bg-card border border-border/60 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Heart className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground">Connect {platformName}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Let HIIT read your heart rate, steps, sleep, and workouts from your phone and
          wearables. Powers your HIIT Score and personalised plans.
        </p>
        <Button
          size="sm"
          className="mt-3"
          disabled={syncing}
          onClick={requestAuthorization}
        >
          Connect
        </Button>
      </div>
    </div>
  );
}
