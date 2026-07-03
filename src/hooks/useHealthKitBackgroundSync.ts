import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { HealthKitRead, isHealthKitReadAvailable } from "@/plugins/HealthKitReadPlugin";
import { useAuth } from "./useAuth";

// Mints a 90-day device JWT the first time a signed-in user opens the
// app after this build, then hands it to the native HealthKit plugin so
// iOS can wake the app on new workouts and POST them to
// sync-healthkit-background even when HIIT is closed.
//
// Re-mints when the cached token is within 7 days of expiry so the
// background flow never lapses. Clears the native storage on sign-out
// so a subsequent user's workouts can't leak.

const TOKEN_STORAGE_KEY = "hiit.hk.device.token";
const TOKEN_EXPIRY_STORAGE_KEY = "hiit.hk.device.expiresAt";
const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function fetchDeviceToken(): Promise<{ token: string; expiresAt: number } | null> {
  const { data, error } = await supabase.functions.invoke("mint-healthkit-device-token", { body: {} });
  if (error || !data?.token) {
    console.error("[useHealthKitBackgroundSync] mint failed:", error);
    return null;
  }
  const expiresAt = Date.now() + (data.expires_in_days ?? 90) * 24 * 60 * 60 * 1000;
  return { token: data.token, expiresAt };
}

export function useHealthKitBackgroundSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isHealthKitReadAvailable()) return;
    if (!user) {
      HealthKitRead.stopBackgroundWorkoutSync().catch(() => {});
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);
      return;
    }

    let cancelled = false;
    (async () => {
      const cached = localStorage.getItem(TOKEN_STORAGE_KEY);
      const cachedExpiry = Number(localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY) ?? 0);
      let token = cached;
      let expiresAt = cachedExpiry;

      if (!token || !expiresAt || expiresAt - Date.now() < REFRESH_WINDOW_MS) {
        const fresh = await fetchDeviceToken();
        if (!fresh) return;
        token = fresh.token;
        expiresAt = fresh.expiresAt;
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, String(expiresAt));
      }
      if (cancelled || !token) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      try {
        await HealthKitRead.startBackgroundWorkoutSync({ deviceToken: token, supabaseUrl });
      } catch (err) {
        console.error("[useHealthKitBackgroundSync] start failed:", err);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);
}
