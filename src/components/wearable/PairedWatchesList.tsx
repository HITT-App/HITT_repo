// Renders the current user's paired Garmin watches (via the HITT CIQ app)
// with an Unpair button per row. If no watches are paired, nothing renders
// — the "Pair Garmin watch" button below still lets the user set one up.

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Watch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useGarminPairings, type GarminPairing } from "@/hooks/useGarminPairings";

export function PairedWatchesList() {
  const { pairings, loading, unpair } = useGarminPairings();
  const [confirming, setConfirming] = useState<GarminPairing | null>(null);
  const [unpairing, setUnpairing] = useState(false);

  if (loading || pairings.length === 0) return null;

  const handleUnpair = async () => {
    if (!confirming) return;
    setUnpairing(true);
    try {
      const result = await unpair(confirming.id);
      if (result.ok) {
        toast.success("Watch unpaired — the Pair menu will reappear on it after its next workout push");
        setConfirming(null);
      } else {
        toast.error(result.error ?? "Couldn't unpair the watch");
      }
    } finally {
      setUnpairing(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
          Paired via HITT Connect IQ app
        </h3>
        <ul className="space-y-2">
          {pairings.map(p => (
            <PairedWatchRow
              key={p.id}
              pairing={p}
              onUnpair={() => setConfirming(p)}
            />
          ))}
        </ul>
      </div>

      <AlertDialog open={confirming !== null} onOpenChange={o => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpair this watch?</AlertDialogTitle>
            <AlertDialogDescription>
              Future workouts recorded on this watch will stop pushing directly to HITT. Anything
              synced through Garmin Connect + Apple Health still comes through as normal. You can
              re-pair the watch anytime by tapping "Pair Garmin watch" below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unpairing}>Keep paired</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnpair} disabled={unpairing}>
              {unpairing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Unpairing…</> : "Unpair"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PairedWatchRow({ pairing, onUnpair }: { pairing: GarminPairing; onUnpair: () => void }) {
  // device_label from the watch is Garmin's part number (e.g. "006-B4062-00").
  // Not friendly — show a generic "Garmin watch" up top and stash the raw
  // ID as a subtle subtitle for support / debug identification.
  const label = "Garmin watch";
  const paired = pairing.redeemed_at
    ? formatDistanceToNow(new Date(pairing.redeemed_at), { addSuffix: true })
    : "recently";
  const lastActive = pairing.last_seen_at
    ? formatDistanceToNow(new Date(pairing.last_seen_at), { addSuffix: true })
    : null;

  return (
    <li className="flex gap-3 p-4 rounded-xl bg-secondary items-center">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Watch className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Paired {paired}{lastActive ? ` · Last push ${lastActive}` : ""}
        </p>
        {pairing.device_label && (
          <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
            {pairing.device_label}
          </p>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={onUnpair}>
        Unpair
      </Button>
    </li>
  );
}
