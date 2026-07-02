import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, RefreshCw, Loader2, Watch, Heart, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { syncHealthKitNow } from "@/lib/healthkit-sync";
import { Capacitor } from "@capacitor/core";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { GarminSetupSheet } from "@/components/wearable/GarminSetupSheet";
import { PairGarminWatchDialog } from "@/components/wearable/PairGarminWatchDialog";
import { PairedWatchesList } from "@/components/wearable/PairedWatchesList";

// Multi-source view of every wearable that's putting data into the user's
// activity_logs / health_metrics in the last 14 days. The HealthKit aggregator
// populates this automatically when Garmin Connect / Fitbit / Whoop / Oura
// sync to Apple Health.

interface DeviceRow {
  source_platform: string;
  workouts14d: number;
  lastActivityAt: string | null;
  lastMetricAt: string | null;
}

// Canonical source_platform values come from several places that have
// evolved over time:
//   - useHealthSync.ts (legacy) writes "healthkit" for HR/steps
//   - sync-healthkit edge function writes "apple_health" for aggregated daily
//     stats and "apple_health_native" / "healthkit_other" for general samples
//   - logActivity writes "hitt_phone" for in-app GPS workouts
//   - the Watch direct path writes "apple_watch"
// Map everything that's "data via Apple Health, not a known brand" to a
// single canonical "apple_health" key so the user sees ONE Apple Health row.
const CANONICAL_ALIASES: Record<string, string> = {
  healthkit:           "apple_health",
  apple_health_native: "apple_health",
  healthkit_other:     "apple_health",
};

function canonicalPlatform(raw: string): string {
  return CANONICAL_ALIASES[raw] ?? raw;
}

const FRIENDLY: Record<string, { label: string; caveat?: string }> = {
  apple_watch:  { label: "Apple Watch" },
  garmin:       { label: "Garmin" },
  fitbit:       { label: "Fitbit" },
  whoop:        { label: "Whoop", caveat: "HR + workouts only — strain & recovery stay in the Whoop app" },
  oura:         { label: "Oura" },
  apple_health: { label: "Apple Health" },
  hitt_phone:   { label: "HITT iPhone GPS" },
};

function friendlyFor(platform: string) {
  return FRIENDLY[platform] ?? { label: platform.replace(/_/g, " ") };
}

function iconFor(platform: string) {
  if (platform === "apple_watch") return Watch;
  if (platform === "garmin" || platform === "fitbit" || platform === "whoop" || platform === "oura") return Activity;
  if (platform === "apple_health") return Heart;
  return Activity;
}

async function loadDevices(userId: string): Promise<DeviceRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const [activitiesRes, metricsRes] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("source_platform, started_at")
      .eq("user_id", userId)
      .gte("started_at", since.toISOString())
      .not("source_platform", "is", null),
    supabase
      .from("health_metrics")
      .select("source_platform, recorded_at")
      .eq("user_id", userId)
      .gte("recorded_at", since.toISOString())
      .not("source_platform", "is", null),
  ]);

  const map = new Map<string, DeviceRow>();
  const upsert = (platform: string, kind: "activity" | "metric", ts: string) => {
    const row = map.get(platform) ?? {
      source_platform: platform,
      workouts14d: 0,
      lastActivityAt: null,
      lastMetricAt: null,
    };
    if (kind === "activity") {
      row.workouts14d += 1;
      if (!row.lastActivityAt || ts > row.lastActivityAt) row.lastActivityAt = ts;
    } else {
      if (!row.lastMetricAt || ts > row.lastMetricAt) row.lastMetricAt = ts;
    }
    map.set(platform, row);
  };

  (activitiesRes.data ?? []).forEach(r => upsert(canonicalPlatform(r.source_platform as string), "activity", r.started_at as string));
  (metricsRes.data ?? []).forEach(r => upsert(canonicalPlatform(r.source_platform as string), "metric", r.recorded_at as string));

  // Sort by most recent contribution descending.
  return [...map.values()].sort((a, b) => {
    const aLast = a.lastActivityAt ?? a.lastMetricAt ?? "";
    const bLast = b.lastActivityAt ?? b.lastMetricAt ?? "";
    return bLast.localeCompare(aLast);
  });
}

export default function ConnectedDevices() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<DeviceRow[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [garminSheetOpen, setGarminSheetOpen] = useState(false);
  const [pairWatchOpen, setPairWatchOpen] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const rows = await loadDevices(user.id);
    setDevices(rows);
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const handleResync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncHealthKitNow();
      if (result.ok) {
        toast({
          title: "Synced",
          description: result.sent
            ? `Pulled ${result.sent} new workout${result.sent === 1 ? "" : "s"} from Apple Health.`
            : "No new data since last sync.",
        });
      } else {
        toast({
          title: "Sync didn't run",
          description: result.reason === "not_native"
            ? "HealthKit sync only runs in the iOS app."
            : `Couldn't reach HealthKit (${result.reason ?? "unknown"}).`,
          variant: "destructive",
        });
      }
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header
        className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center justify-between px-4 py-3"
        style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}
      >
        <button onClick={() => navigate(-1)} className="text-muted-foreground -ml-2 p-2 active:opacity-70">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Connected Devices</h1>
        <button
          onClick={handleResync}
          className="text-primary p-2 active:opacity-70"
          aria-label="Sync now"
          disabled={syncing}
        >
          {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
        </button>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 space-y-4">
        {devices === null ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : devices.length === 0 ? (
          <EmptyState onResync={handleResync} syncing={syncing} />
        ) : (
          <>
            <ul className="space-y-3">
              {devices.map(d => <DeviceCard key={d.source_platform} device={d} />)}
            </ul>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Sources auto-detected from your activity in the last 14 days.
              {Capacitor.isNativePlatform() ? " New devices appear after their first sync to Apple Health." : null}
            </p>
          </>
        )}

        {/* Paired Garmin watches (via HITT CIQ app). Renders null if none. */}
        <PairedWatchesList />

        {/* Reachable regardless of whether Garmin is currently detected —
            for the multi-wearable user (Apple Watch primary + Garmin
            secondary) whose primary signal outranks the Garmin detection. */}
        <div className="pt-4 border-t border-border/60 space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setGarminSheetOpen(true)}
          >
            Set up Garmin sync (via Apple Health)
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setPairWatchOpen(true)}
          >
            Pair Garmin watch (HITT Connect IQ app)
          </Button>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed pt-1">
            "Set up Garmin sync" enables sharing through Apple Health. "Pair Garmin watch"
            is for users who've installed the HITT app on their Garmin — workouts come
            straight to HITT with no Apple Health middleman.
          </p>
        </div>
      </main>

      <GarminSetupSheet open={garminSheetOpen} onOpenChange={setGarminSheetOpen} />
      <PairGarminWatchDialog open={pairWatchOpen} onOpenChange={setPairWatchOpen} />
    </div>
  );
}

function DeviceCard({ device }: { device: DeviceRow }) {
  const Icon = iconFor(device.source_platform);
  const friendly = friendlyFor(device.source_platform);
  const lastAt = device.lastActivityAt ?? device.lastMetricAt;

  return (
    <li className="flex gap-3 p-4 rounded-xl bg-secondary">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{friendly.label}</p>
          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
        </div>
        {friendly.caveat && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{friendly.caveat}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {device.workouts14d > 0 && <span>{device.workouts14d} workout{device.workouts14d === 1 ? "" : "s"} (14d)</span>}
          {lastAt && <span>Last {formatDistanceToNow(new Date(lastAt), { addSuffix: true })}</span>}
        </div>
      </div>
    </li>
  );
}

function EmptyState({ onResync, syncing }: { onResync: () => void; syncing: boolean }) {
  return (
    <div className="p-6 rounded-xl bg-secondary text-center space-y-3">
      <Watch className="w-8 h-8 text-muted-foreground mx-auto" />
      <p className="font-medium text-sm">No devices syncing yet</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Anything that writes to Apple Health will appear here — Apple Watch, Garmin, Fitbit, Whoop, Oura,
        or any third-party fitness app. Set up sharing in each app's settings, then tap Sync.
      </p>
      <Button onClick={onResync} disabled={syncing} className="mt-2">
        {syncing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing…</> : <><RefreshCw className="w-4 h-4 mr-2" />Sync now</>}
      </Button>
    </div>
  );
}
