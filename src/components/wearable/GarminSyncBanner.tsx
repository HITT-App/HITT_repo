// In-app banner shown on the home screen when a declared Garmin user
// hasn't had a workout sync in a while. Tier resolves client-side from
// activity_logs (via useGarminSyncStatus) — no cron, no push.
//
// Tap → opens GarminSetupSheet. Dismiss (X) → suppresses this tier
// until the user climbs to the next one.

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGarminSyncStatus, type GarminSyncTier } from "@/hooks/useGarminSyncStatus";
import { GarminSetupSheet } from "./GarminSetupSheet";

interface TierCopy {
  headline: string;
  body: string;
  cta: string;
}

const COPY: Record<Exclude<GarminSyncTier, 0>, TierCopy> = {
  1: {
    headline: "Waiting for Garmin workouts",
    body: "We haven't seen a workout from your Garmin in a few days. Usually a 30-second fix in Garmin Connect.",
    cta: "Set it up",
  },
  2: {
    headline: "Your Garmin hasn't synced for a week",
    body: "HITT can only see Garmin activity when Apple Health sharing is turned on. Let's get it working.",
    cta: "Fix it now",
  },
  3: {
    headline: "Two weeks without a Garmin sync",
    body: "If you'd rather track with phone GPS for now, HITT works great without the watch too.",
    cta: "Get help syncing",
  },
};

export function GarminSyncBanner() {
  const { tier, dismissCurrentTier, loading } = useGarminSyncStatus();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading || tier === 0) return null;
  const copy = COPY[tier];

  return (
    <>
      <div className="mx-5 bg-card border border-border/60 rounded-[18px] p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">{copy.headline}</h3>
            <button
              onClick={dismissCurrentTier}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{copy.body}</p>
          <Button size="sm" className="mt-3" onClick={() => setSheetOpen(true)}>
            {copy.cta}
          </Button>
        </div>
      </div>

      <GarminSetupSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
