// "Send to Garmin" for a chosen sport or race. Garmin can't start a workout remotely, so this
// puts it on today's watch calendar and the user starts it from there.
import { openGarminConnect } from "@/lib/garminConnectApp";
import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Check, Loader2, Watch } from "lucide-react";
import { useGarminConnection } from "@/hooks/useGarminConnection";
import { callGarmin } from "@/lib/garmin-api";
import { garminErrorMessage } from "@/lib/garmin-state";

export type GarminSendPayload =
  | { action: "send_sport"; sport: string }
  | { action: "send_triathlon"; name: string; swim_km: number; bike_km: number; run_km: number };

type Phase = "idle" | "sending" | "sent" | "already_sent" | "start_on_watch" | "needs_distance";

const MAX_SWIM_METRES = 100_000;

export function GarminSendButton({ payload, tokens: C, tint }: {
  payload: GarminSendPayload;
  tokens: { card: string; line2: string; fg: string; dim: string; good: string };
  tint: (hex: string, a: number) => string;
}) {
  const { connection, state } = useGarminConnection();
  const [phase, setPhase] = useState<Phase>("idle");
  const [metres, setMetres] = useState("");
  const [error, setError] = useState<string | null>(null);

  const note = { margin: 0, fontSize: 12, lineHeight: 1.45, color: C.dim };

  const devicesLink = <Link to="/connected-devices" style={{ textDecoration: "underline" }}>Connected Devices</Link>;
  if (state === "needs_reconnect") {
    return <p style={note}>Your Garmin connection needs renewing before HIIT can send workouts. Reconnect in {devicesLink}.</p>;
  }
  if (state === "permission_off" || (state === "connected" && !connection?.permissions.includes("WORKOUT_IMPORT"))) {
    return <p style={note}>Garmin isn't letting HIIT send workouts. Turn on workout sharing for HIIT in Garmin Connect, or check {devicesLink}.</p>;
  }
  if (state !== "connected") return null;
  if (!connection?.workout_import_consented_at) {
    return (
      <p style={note}>
        To send workouts to your watch, turn that on in {devicesLink}.
      </p>
    );
  }

  const send = async (distanceM?: number) => {
    setPhase("sending");
    setError(null);
    const { data, error: callError } = await callGarmin<{ status?: string; already?: boolean }>("garmin-workouts", {
      ...payload,
      date: format(new Date(), "yyyy-MM-dd"),
      ...(distanceM ? { distance_m: distanceM } : {}),
    });
    if (callError) {
      setPhase("idle");
      return setError(callError === "consent_required"
        ? "Turn on sending workouts in Connected Devices first."
        : garminErrorMessage(callError));
    }
    if (data?.status === "queued") return setPhase(data.already ? "already_sent" : "sent");
    if (data?.status === "start_on_watch") return setPhase("start_on_watch");
    if (data?.status === "needs_distance") {
      // A triathlon reaching this has a leg set to zero, and its distances are on this screen.
      setPhase(payload.action === "send_sport" ? "needs_distance" : "idle");
      if (payload.action === "send_triathlon") setError("Set a distance for every leg first.");
      return;
    }
    setPhase("idle");
    setError(garminErrorMessage(null));
  };

  if (phase === "sent" || phase === "already_sent") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{
          width: "100%", borderRadius: 14, padding: "13px 12px", display: "flex", alignItems: "center", justifyContent: "center",
          gap: 9, fontSize: 13.5, fontWeight: 650, color: C.good, background: tint(C.good, 0.1), border: `1px solid ${tint(C.good, 0.4)}`,
        }}>
          <Check size={16} color={C.good} strokeWidth={2.2} />
          {phase === "sent" ? "Sent to Garmin. Sync to get it on your watch." : "Already sent today. Sync to get it on your watch."}
        </div>
        <button
          type="button"
          onClick={() => void openGarminConnect()}
          style={{ minHeight: 44, fontSize: 13.5, fontWeight: 600, color: C.fg, textDecoration: "underline", background: "none", border: "none" }}
        >
          Open Garmin Connect
        </button>
      </div>
    );
  }

  if (phase === "start_on_watch") {
    return <p style={note}>Garmin can't take this sport as a sent workout. Start it on your Garmin, and it'll come into HIIT when your watch syncs.</p>;
  }

  if (phase === "needs_distance") {
    const value = Number(metres);
    const valid = value > 0 && value <= MAX_SWIM_METRES;
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ ...note, flex: 1 }}>
          How far are you swimming?
          <input
            type="number"
            inputMode="numeric"
            placeholder="Metres"
            value={metres}
            onChange={e => setMetres(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.line2}`, background: C.card, color: C.fg, fontSize: 16 }}
          />
        </label>
        <button
          disabled={!valid}
          onClick={() => void send(value)}
          style={{ alignSelf: "flex-end", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.line2}`, background: C.card, color: C.fg, fontWeight: 650, opacity: valid ? 1 : 0.5 }}
        >
          Send
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => void send()}
        disabled={phase === "sending"}
        style={{
          width: "100%", cursor: "pointer", borderRadius: 14, padding: "13px 0", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 9, fontSize: 13.5, fontWeight: 650, border: `1px solid ${C.line2}`,
          background: C.card, color: C.fg, WebkitTapHighlightColor: "transparent",
        }}
      >
        {phase === "sending"
          ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
          : <><Watch size={16} color={C.dim} strokeWidth={2.2} /> Send to Garmin</>}
      </button>
      {error && <p style={note}>{error}</p>}
    </>
  );
}
