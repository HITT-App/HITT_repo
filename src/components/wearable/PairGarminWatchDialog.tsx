// Shows a fresh 6-digit pairing code + 5-minute countdown so the user
// can type the code into the HITT Connect IQ app on their Garmin watch.
//
// Once the watch redeems the code, subsequent activities are pushed
// directly from the watch to our backend (push-garmin-watch-workout) —
// no HealthKit intermediary required.
//
// The countdown is client-side; the actual expiry is enforced by the
// server. If the code expires before the user types it in, we show a
// "Get a new code" button that hits create-garmin-pairing again.

import { useEffect, useMemo, useState } from "react";
import { Loader2, Watch } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PairGarminWatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PairingSession {
  code: string;
  pairingId: string;
  expiresAt: string;   // ISO
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "expired";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PairGarminWatchDialog({ open, onOpenChange }: PairGarminWatchDialogProps) {
  const [session, setSession] = useState<PairingSession | null>(null);
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every second so the countdown updates.
  useEffect(() => {
    if (!open || !session) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open, session]);

  // Auto-request a code when the dialog opens.
  useEffect(() => {
    if (open && !session && !creating) {
      void requestCode();
    }
    if (!open) {
      setSession(null);
    }
  }, [open]);   // eslint-disable-line react-hooks/exhaustive-deps

  const requestCode = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-garmin-pairing", {});
      if (error || !data?.ok) {
        toast.error("Couldn't get a pairing code — try again in a moment");
        return;
      }
      setSession({
        code: data.code as string,
        pairingId: data.pairing_id as string,
        expiresAt: data.expires_at as string,
      });
      setNow(Date.now());
    } finally {
      setCreating(false);
    }
  };

  const expiryMs = useMemo(() => {
    if (!session) return 0;
    return new Date(session.expiresAt).getTime() - now;
  }, [session, now]);
  const expired = session != null && expiryMs <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Watch className="w-5 h-5" />
            Pair a Garmin watch
          </DialogTitle>
          <DialogDescription>
            Open the <strong>HITT</strong> app on your Garmin watch, tap "Pair with iPhone",
            and enter this code. Your workouts will land in HITT the moment you finish them.
          </DialogDescription>
        </DialogHeader>

        {creating || !session ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="py-6 flex flex-col items-center gap-3">
              <div className="text-5xl font-mono tracking-widest tabular-nums text-foreground">
                {session.code.split("").join(" ")}
              </div>
              <p className={`text-sm ${expired ? "text-destructive" : "text-muted-foreground"}`}>
                {expired ? "Code expired" : `Expires in ${formatTimeLeft(expiryMs)}`}
              </p>
            </div>

            {expired ? (
              <Button onClick={requestCode} disabled={creating}>
                Get a new code
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
