import { Capacitor } from "@capacitor/core";

const GARMIN_CONNECT_SCHEME = "gcm-ios-6573://";
const GARMIN_CONNECT_ALT = "garminconnect://";
const GARMIN_APP_STORE_URL = "https://apps.apple.com/app/garmin-connect/id583446403";
const GARMIN_PLAY_URL = "https://play.google.com/store/apps/details?id=com.garmin.android.apps.connectmobile";

// Losing visibility is the success signal: nothing happening within about a second means
// the app isn't installed. Android's store listing opens the app when it is installed.
export function openGarminConnect() {
  if (Capacitor.getPlatform() === "android") {
    window.open(GARMIN_PLAY_URL, "_blank");
    return;
  }
  let launched = false;
  const onHide = () => { launched = true; };
  document.addEventListener("visibilitychange", onHide, { once: true });
  window.location.href = GARMIN_CONNECT_SCHEME;
  setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    if (launched) return;
    window.location.href = GARMIN_CONNECT_ALT;
    setTimeout(() => {
      if (document.visibilityState === "visible") window.open(GARMIN_APP_STORE_URL, "_blank");
    }, 400);
  }, 1200);
}
