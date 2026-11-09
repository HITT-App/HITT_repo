import { Capacitor } from "@capacitor/core";
import { openGarminConnectNative } from "@/plugins/WatchPlugin";

const GARMIN_APP_STORE_URL = "https://apps.apple.com/app/garmin-connect/id583446403";
const GARMIN_PLAY_URL = "https://play.google.com/store/apps/details?id=com.garmin.android.apps.connectmobile";

// Android's store listing opens the app when it's installed.
export async function openGarminConnect() {
  if (await openGarminConnectNative()) return;
  window.open(Capacitor.getPlatform() === "android" ? GARMIN_PLAY_URL : GARMIN_APP_STORE_URL, "_blank");
}
