// Vendor-aware launch entry rendered above the primary Start button on every
// activity pre-start screen (ActivityLive, WorkoutPlayer, GymTimer, Triathlon).
//
// Behaviour per detected wearable:
//   - apple_watch: renders a single tappable "Start on Apple Watch" button
//     (label varies per activity type) — delegates to the parent's handler
//   - garmin/fitbit/whoop/oura: renders an instructional card via the
//     activity × wearable copy matrix in src/lib/wearable-launch-copy.ts
//   - phone_only: renders nothing (returns null) — the universal phone-start
//     button below is the action

import { Check, Watch, Activity, Heart } from "lucide-react";
import type { PrimaryWearable } from "@/lib/wearable-detection";
import {
  getLaunchCopy,
  getAppleWatchLabel,
  type LaunchActivityType,
} from "@/lib/wearable-launch-copy";

interface Tokens {
  card: string;
  line2: string;
  fg: string;
  dim: string;
  good: string;
  gold: string;
}

interface WearableLaunchCardProps {
  wearable: PrimaryWearable;
  activityType: LaunchActivityType;
  tokens: Tokens;
  tint: (hex: string, a: number) => string;
  // Apple Watch only — undefined disables AW for this activity
  onLaunchAppleWatch?: () => void;
  watchLaunching?: boolean;
  watchLaunched?: boolean;
}

export function WearableLaunchCard(props: WearableLaunchCardProps) {
  const { wearable, activityType, tokens: C, tint } = props;

  // phone_only — suppress entirely, as per design decision
  if (wearable === "phone_only") return null;

  // Apple Watch — render a tappable button
  if (wearable === "apple_watch") {
    if (!props.onLaunchAppleWatch) return null; // no AW handler wired for this activity
    return (
      <button
        onClick={props.onLaunchAppleWatch}
        disabled={props.watchLaunching}
        style={{
          width: "100%", cursor: "pointer", borderRadius: 14, padding: "13px 0",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
          fontSize: 13.5, fontWeight: 650,
          border: `1px solid ${props.watchLaunched ? tint(C.good, 0.4) : C.line2}`,
          background: props.watchLaunched ? tint(C.good, 0.1) : C.card,
          color: props.watchLaunched ? C.good : C.fg,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {props.watchLaunched ? (
          <><Check size={16} color={C.good} strokeWidth={2.2} /> Starting on Apple Watch</>
        ) : (
          <><Watch size={16} color={C.dim} strokeWidth={2.2} /> {props.watchLaunching ? "Starting…" : getAppleWatchLabel(activityType)}</>
        )}
      </button>
    );
  }

  // Garmin / Fitbit / Whoop / Oura — instructional card from the copy matrix
  const copy = getLaunchCopy(activityType, wearable);
  if (!copy) return null;

  const Icon = wearable === "garmin" ? Activity : Heart;

  return (
    <div
      style={{
        width: "100%", borderRadius: 14, padding: 14,
        background: C.card, border: `1px solid ${C.line2}`,
        display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Icon size={16} color={C.gold} strokeWidth={2.2} />
        <div style={{ fontSize: 13.5, fontWeight: 650, color: C.fg }}>{copy.title}</div>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: C.dim }}>{copy.body}</p>
      {copy.steps && (
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: C.dim }}>
          {copy.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      {copy.footer && (
        <p style={{ margin: 0, fontSize: 11, color: C.dim }}>{copy.footer}</p>
      )}
    </div>
  );
}
