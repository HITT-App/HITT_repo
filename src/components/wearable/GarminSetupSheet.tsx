// Coaching sheet that walks a Garmin user through enabling Apple Health
// sharing inside Garmin Connect. Reused from three entry points:
//   - Auto-trigger on first "declared garmin" detection (Home banner tap)
//   - The 3 / 7 / 14 day sync-lapse banners (Home)
//   - Manual open from Settings → Wearables → Set up Garmin sync
//
// The user's mental model is a series of screenshots, so we lean on
// numbered steps rather than a long prose block. The "I've done it"
// button triggers an immediate HealthKit re-sync so the user gets
// visible feedback (toast with count) instead of a silent close.

import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { syncHealthKitNow } from "@/lib/healthkit-sync";

interface GarminSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// URL scheme published by Garmin for the Connect Mobile app. `gcm://` also
// works on some builds — the numeric variant is the canonical one and
// what iOS Info.plist LSApplicationQueriesSchemes registers.
const GARMIN_CONNECT_SCHEME    = "gcm-ios-6573://";
const GARMIN_CONNECT_ALT       = "garminconnect://";
const GARMIN_APP_STORE_URL     = "https://apps.apple.com/app/garmin-connect/id583446403";

export function GarminSetupSheet({ open, onOpenChange }: GarminSetupSheetProps) {
  const [syncing, setSyncing] = useState(false);

  // Launch Garmin Connect via URL scheme. The old anchor-click approach was
  // silently swallowed by WKWebView — schemes need to arrive via a top-level
  // navigation, not an in-page click event. Set window.location.href and
  // iOS routes the scheme to Garmin Connect. If the app isn't installed,
  // the navigation fails silently and we fall through to the App Store.
  const openGarminConnect = () => {
    let launched = false;
    // Watching for the page to lose visibility is our success signal — iOS
    // has switched us out to Garmin Connect. If nothing happens in ~1.2 s
    // the app probably isn't installed → offer the App Store instead.
    const onHide = () => { launched = true; };
    document.addEventListener("visibilitychange", onHide, { once: true });

    window.location.href = GARMIN_CONNECT_SCHEME;

    setTimeout(() => {
      document.removeEventListener("visibilitychange", onHide);
      if (launched) return;
      // First scheme didn't take — try the older alias, then App Store.
      window.location.href = GARMIN_CONNECT_ALT;
      setTimeout(() => {
        if (document.visibilityState === "visible") {
          window.open(GARMIN_APP_STORE_URL, "_blank");
        }
      }, 400);
    }, 1200);
  };

  const handleIveDoneIt = async () => {
    setSyncing(true);
    try {
      const result = await syncHealthKitNow();
      if (!result.ok) {
        toast.error("Couldn't reach Apple Health — try again in a moment");
        return;
      }
      if ((result.sent ?? 0) === 0) {
        toast("No new workouts yet — Garmin can take a few minutes to sync. We'll check again next time you open HITT.");
      } else {
        toast.success(`Synced ${result.sent} workout${result.sent === 1 ? "" : "s"} from Apple Health`);
        onOpenChange(false);
      }
    } finally {
      setSyncing(false);
    }
  };

  const isIOS = Capacitor.getPlatform() === "ios";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Sync your Garmin workouts</SheetTitle>
          <SheetDescription>
            HITT reads your Garmin activity through Apple Health. Turn on sharing in Garmin Connect —
            it takes about 30 seconds and only has to be done once.
          </SheetDescription>
        </SheetHeader>

        <ol className="mt-6 space-y-4">
          <SetupStep n={1} title="Open Garmin Connect">
            Tap the button below to jump straight there, or find it on your home screen.
          </SetupStep>
          <SetupStep n={2} title="Go to More → Settings → Apple Health">
            The "More" tab is in the bottom-right of the Connect app.
          </SetupStep>
          <SetupStep n={3} title="Turn on the categories you want to sync">
            At minimum: <strong>Activities</strong>, <strong>Heart Rate</strong>, and <strong>Steps</strong>.
            iOS will show one permission prompt per category — approve them all.
          </SetupStep>
          <SetupStep n={4} title="Come back and tap 'I've done it' below">
            HITT will re-sync immediately. Garmin can take a few minutes to publish a workout to
            Apple Health, so if nothing shows up yet, wait a bit and try again.
          </SetupStep>
        </ol>

        <div className="mt-6 grid gap-2">
          {isIOS && (
            <Button variant="outline" onClick={openGarminConnect}>
              Open Garmin Connect
            </Button>
          )}
          <Button onClick={handleIveDoneIt} disabled={syncing}>
            {syncing ? "Checking…" : "I've done it — check now"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            I'll do it later
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SetupStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-sm font-semibold flex items-center justify-center shrink-0">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{children}</p>
      </div>
    </li>
  );
}
