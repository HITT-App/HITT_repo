import { useState } from "react";
import { Watch, RefreshCw, ShieldCheck, Smartphone, ArrowRight, Loader2, Settings2, Activity, Heart, Footprints, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchSync, WatchType } from "@/hooks/useWatchSync";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function CalibrationBadge({ accuracy }: { accuracy?: "excellent" | "good" | "low" | null }) {
  if (!accuracy) return null;
  const cfg = {
    excellent: { label: "Calibrated", color: "bg-primary/10 text-primary" },
    good: { label: "Good", color: "bg-primary/10 text-primary" },
    low: { label: "Check Fit", color: "bg-destructive/10 text-destructive" },
  }[accuracy];
  return <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full", cfg.color)}>{cfg.label}</span>;
}

function SyncMetricPill({ icon: Icon, label, value, unit }: { icon: typeof Heart; label: string; value?: number; unit?: string }) {
  return (
    <div className="flex flex-col items-center p-2 rounded-lg bg-background/50 min-w-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mb-0.5" />
      {value != null ? (
        <p className="text-xs font-bold text-foreground">{value.toLocaleString()}{unit ? <span className="text-[9px] text-muted-foreground ml-0.5">{unit}</span> : null}</p>
      ) : (
        <p className="text-[10px] text-muted-foreground">—</p>
      )}
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function WatchSyncSection() {
  const {
    isNative, isAvailable, isAuthorized, isSyncing,
    lastSyncedAt, watchType, syncFrequency, lastSyncResults,
    requestPermissions, syncHealthData, setWatchType, setSyncFrequency, watchTypes,
  } = useWatchSync();
  const [showSettings, setShowSettings] = useState(false);

  // ── Not native ──
  if (!isNative) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Watch className="w-4 h-4 text-muted-foreground" />
          Connected Devices
        </h3>
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
      </div>
    );
  }

  // ── Not available ──
  if (!isAvailable) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Watch className="w-4 h-4 text-muted-foreground" />
          Connected Devices
        </h3>
        <div className="p-4 bg-secondary rounded-xl">
          <p className="text-sm text-muted-foreground text-center">Health services are not available on this device.</p>
        </div>
      </div>
    );
  }

  // ── Not authorized ──
  if (!isAuthorized) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Watch className="w-4 h-4 text-muted-foreground" />
          Connected Devices
        </h3>
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
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Select your device:</p>
            <div className="grid grid-cols-2 gap-2">
              {watchTypes.map((wt) => (
                <button
                  key={wt.id}
                  onClick={() => setWatchType(wt.id)}
                  className={cn(
                    "text-left p-2.5 rounded-xl text-xs border transition-all",
                    watchType === wt.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  {wt.label}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={requestPermissions}>
            Connect Health Data
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Authorized & connected ──
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
        <Watch className="w-4 h-4 text-muted-foreground" />
        Connected Devices
      </h3>
      <div className="p-4 bg-secondary rounded-xl space-y-3">
        {/* Status header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Watch className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm flex items-center gap-1.5">
                {watchType ? watchTypes.find(w => w.id === watchType)?.label : "Watch"} Connected
                <span className="inline-block w-2 h-2 rounded-full bg-primary" />
              </p>
              <div className="flex items-center gap-2">
                {lastSyncedAt && (
                  <p className="text-xs text-muted-foreground">
                    Synced {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}
                  </p>
                )}
                <CalibrationBadge accuracy={lastSyncResults?.hrAccuracy} />
              </div>
            </div>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="text-muted-foreground">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {/* Live sync results */}
        <div className="grid grid-cols-4 gap-1.5">
          <SyncMetricPill icon={Footprints} label="Steps" value={lastSyncResults?.steps} />
          <SyncMetricPill icon={Heart} label="Heart" value={lastSyncResults?.heartRate} unit="bpm" />
          <SyncMetricPill icon={Activity} label="Distance" value={lastSyncResults?.distance} unit="km" />
          <SyncMetricPill icon={Flame} label="Calories" value={lastSyncResults?.calories} unit="cal" />
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Device Type</p>
              <div className="grid grid-cols-2 gap-1.5">
                {watchTypes.map((wt) => (
                  <button
                    key={wt.id}
                    onClick={() => setWatchType(wt.id)}
                    className={cn(
                      "text-left p-2 rounded-lg text-[11px] border transition-all",
                      watchType === wt.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-transparent bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {wt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Sync Frequency</p>
              <div className="flex gap-2">
                {([
                  { id: "manual", label: "Manual" },
                  { id: "on_open", label: "On App Open" },
                ] as const).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSyncFrequency(f.id)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                      syncFrequency === f.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <Button
          className="w-full"
          variant="outline"
          onClick={() => syncHealthData()}
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
    </div>
  );
}
