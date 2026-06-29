// Vendor-aware Triathlon launch instructions. Renders one of 4 variants:
//   - apple_watch: the existing "Start Race on Apple Watch" button (delegates
//     to the parent's send-to-watch handler)
//   - garmin: setup steps for Forerunner/Fenix multisport, with caveat about
//     older models that don't support it natively
//   - fitbit / whoop / oura: honest "your device doesn't track multisport"
//     copy pointing the user at the phone-GPS button below
//   - phone_only: friendly "track from your phone" framing
//
// The phone-GPS "Start race" button always stays visible *below* this card
// (rendered by Triathlon.tsx) — it's the universal fallback regardless of
// detected wearable.

import { Check, Watch, Activity, Heart, Smartphone } from "lucide-react";
import type { PrimaryWearable } from "@/lib/wearable-detection";

interface Tokens {
  card: string;
  line2: string;
  fg: string;
  dim: string;
  good: string;
  gold: string;
}

interface WearableSetupCardProps {
  wearable: PrimaryWearable;
  tokens: Tokens;
  tint: (hex: string, a: number) => string;
  // Apple Watch only — handlers piped from Triathlon.tsx
  onSendToWatch: () => void;
  watchSending: boolean;
  watchSent: boolean;
}

export function WearableSetupCard(props: WearableSetupCardProps) {
  switch (props.wearable) {
    case "apple_watch":
      return <AppleWatchVariant {...props} />;
    case "garmin":
      return <GarminVariant tokens={props.tokens} />;
    case "fitbit":
      return <FitbitVariant tokens={props.tokens} />;
    case "whoop":
      return <WhoopVariant tokens={props.tokens} />;
    case "oura":
      return <OuraVariant tokens={props.tokens} />;
    case "phone_only":
    default:
      return <PhoneOnlyVariant tokens={props.tokens} />;
  }
}

function AppleWatchVariant({ tokens: C, tint, onSendToWatch, watchSending, watchSent }: WearableSetupCardProps) {
  return (
    <button
      onClick={onSendToWatch}
      disabled={watchSending}
      style={{
        width: "100%", cursor: "pointer", borderRadius: 14, padding: "13px 0",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
        fontSize: 13.5, fontWeight: 650,
        border: `1px solid ${watchSent ? tint(C.good, 0.4) : C.line2}`,
        background: watchSent ? tint(C.good, 0.1) : C.card,
        color: watchSent ? C.good : C.fg,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {watchSent ? (
        <><Check size={16} color={C.good} strokeWidth={2.2} /> Starting on Apple Watch</>
      ) : (
        <><Watch size={16} color={C.dim} strokeWidth={2.2} /> {watchSending ? "Starting…" : "Start Race on Apple Watch"}</>
      )}
    </button>
  );
}

// Shared instructional-card chrome used by every non-Apple-Watch variant.
function InstructionsCard({
  C,
  icon,
  title,
  body,
  steps,
  footer,
}: {
  C: Tokens;
  icon: React.ReactNode;
  title: string;
  body: string;
  steps?: string[];
  footer?: string;
}) {
  return (
    <div
      style={{
        width: "100%", borderRadius: 14, padding: 14,
        background: C.card, border: `1px solid ${C.line2}`,
        display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {icon}
        <div style={{ fontSize: 13.5, fontWeight: 650, color: C.fg }}>{title}</div>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: C.dim }}>{body}</p>
      {steps && (
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: C.dim }}>
          {steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      {footer && (
        <p style={{ margin: 0, fontSize: 11, color: C.dim }}>{footer}</p>
      )}
    </div>
  );
}

function GarminVariant({ tokens: C }: { tokens: Tokens }) {
  return (
    <InstructionsCard
      C={C}
      icon={<Activity size={16} color={C.gold} strokeWidth={2.2} />}
      title="Race on your Garmin"
      body="Garmin handles triathlon transitions natively. Set up the race on your watch and HITT will pick up each leg from Apple Health when you finish."
      steps={[
        "On your Garmin: hold UP → Activity & Apps → Triathlon",
        "Press START when you're ready to swim",
        "Press LAP to switch swim → bike, then again to switch to run",
      ]}
      footer="Supported on Forerunner 255+, Fenix, Epix, Enduro. Older models (e.g. FR245) don't have native multisport — use the phone GPS option below."
    />
  );
}

function FitbitVariant({ tokens: C }: { tokens: Tokens }) {
  return (
    <InstructionsCard
      C={C}
      icon={<Heart size={16} color={C.gold} strokeWidth={2.2} />}
      title="Fitbit doesn't track multisport"
      body="Fitbit can track each leg separately but not the full triathlon as one session. Two options:"
      steps={[
        "Use HITT phone GPS (button below) — handles all three legs",
        "Or start swim/bike/run as separate Fitbit activities and we'll group them after",
      ]}
    />
  );
}

function WhoopVariant({ tokens: C }: { tokens: Tokens }) {
  return (
    <InstructionsCard
      C={C}
      icon={<Heart size={16} color={C.gold} strokeWidth={2.2} />}
      title="Whoop doesn't track multisport"
      body="Whoop captures HR and strain but doesn't structure workouts into legs. Use the HITT phone GPS option below — Whoop's HR and recovery data will still pair with your race in the app."
    />
  );
}

function OuraVariant({ tokens: C }: { tokens: Tokens }) {
  return (
    <InstructionsCard
      C={C}
      icon={<Heart size={16} color={C.gold} strokeWidth={2.2} />}
      title="Oura is for recovery, not racing"
      body="Oura focuses on sleep and recovery rather than live workout tracking. Use the HITT phone GPS option below — your Oura sleep and readiness will surface alongside the race summary."
    />
  );
}

function PhoneOnlyVariant({ tokens: C }: { tokens: Tokens }) {
  return (
    <InstructionsCard
      C={C}
      icon={<Smartphone size={16} color={C.gold} strokeWidth={2.2} />}
      title="Race from your phone"
      body="No connected wearable yet — that's fine. HITT can track all three legs from your iPhone using GPS, with a live activity on your lock screen so you don't need to keep the app open."
    />
  );
}
