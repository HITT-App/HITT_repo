import { Watch, RefreshCw, ShieldCheck, Smartphone, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchSync } from "@/hooks/useWatchSync";
import { formatDistanceToNow } from "date-fns";

export function WatchSyncSection() {
  const {
    isNative,
    isAvailable,
    isAuthorized,
    isSyncing,
    lastSyncedAt,
    requestPermissions,
    syncHealthData,
  } = useWatchSync();

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
        <Watch className="w-4 h-4 text-muted-foreground" />
        Connected Devices
      </h3>

      {!isNative ? (
        <div className="p-4 bg-secondary rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Apple Watch & Wear OS</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sync steps, heart rate, distance, and calories from your smartwatch automatically.
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              📱 Install the native app to connect your watch. Watch data sync requires 
              Apple HealthKit (iOS) or Health Connect (Android).
            </p>
          </div>
        </div>
      ) : !isAvailable ? (
        <div className="p-4 bg-secondary rounded-xl">
          <p className="text-sm text-muted-foreground text-center">
            Health services are not available on this device.
          </p>
        </div>
      ) : !isAuthorized ? (
        <div className="p-4 bg-secondary rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Grant Health Permissions</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow access to read health data from your watch and phone's health app.
              </p>
            </div>
          </div>
          <Button className="w-full" onClick={requestPermissions}>
            Connect Health Data
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      ) : (
        <div className="p-4 bg-secondary rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Watch className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm flex items-center gap-1.5">
                  Watch Connected
                  <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                </p>
                {lastSyncedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last synced {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { emoji: "👟", label: "Steps" },
              { emoji: "❤️", label: "Heart" },
              { emoji: "📏", label: "Distance" },
              { emoji: "🔥", label: "Calories" },
            ].map((m) => (
              <div key={m.label} className="text-center p-2 rounded-lg bg-background/50">
                <span className="text-lg">{m.emoji}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            variant="outline"
            onClick={syncHealthData}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
