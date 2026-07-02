import { Capacitor, registerPlugin } from "@capacitor/core";

// Capacitor bridge to the native WearableDetectPlugin (Swift). Uses
// UIApplication.canOpenURL() with the vendor URL schemes declared in
// Info.plist under LSApplicationQueriesSchemes. No user prompt.
//
// If you add a new vendor here, also add the scheme to Info.plist AND
// the schemes array in ios/App/App/WearableDetectPlugin.swift AND the
// SOURCE_PRIORITY table in supabase/functions/_shared/activity-types.ts.

export interface WearableDetectResult {
  garminInstalled: boolean;
  stravaInstalled: boolean;
  fitbitInstalled: boolean;
  whoopInstalled: boolean;
  ouraInstalled: boolean;
}

interface WearableDetectPluginType {
  detect(): Promise<WearableDetectResult>;
}

export const WearableDetect =
  registerPlugin<WearableDetectPluginType>("WearableDetect");

export function isWearableDetectAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

// Safe wrapper — returns an all-false result on non-native or on plugin
// error so callers never have to null-check. The auto-detect hook falls
// back to the activity_logs inference in either case.
export async function detectInstalledVendors(): Promise<WearableDetectResult> {
  const empty: WearableDetectResult = {
    garminInstalled: false,
    stravaInstalled: false,
    fitbitInstalled: false,
    whoopInstalled: false,
    ouraInstalled: false,
  };
  if (!isWearableDetectAvailable()) return empty;
  try {
    return await WearableDetect.detect();
  } catch {
    return empty;
  }
}
