/**
 * GPS Provider abstraction
 * - Native: uses @capacitor/geolocation for better accuracy + background support
 * - Web: falls back to navigator.geolocation
 */
import { Capacitor } from "@capacitor/core";

export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  timestamp: number;
}

export type GpsErrorCode = "permission_denied" | "unavailable" | "timeout";

export interface GpsWatchOptions {
  onPosition: (pos: GpsPosition) => void;
  onError: (code: GpsErrorCode) => void;
}

interface GpsWatchHandle {
  stop: () => void;
}

// ── Native provider (Capacitor) ─────────────────────────────────────
async function watchNative(opts: GpsWatchOptions): Promise<GpsWatchHandle> {
  const { Geolocation } = await import("@capacitor/geolocation");

  // Request permissions first on native
  const perm = await Geolocation.requestPermissions();
  if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
    opts.onError("permission_denied");
    return { stop: () => {} };
  }

  const watchId = await Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000,
    },
    (position, err) => {
      if (err) {
        opts.onError("unavailable");
        return;
      }
      if (position) {
        opts.onPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          timestamp: position.timestamp,
        });
      }
    },
  );

  return {
    stop: () => Geolocation.clearWatch({ id: watchId }),
  };
}

// ── Web provider (browser Geolocation API) ──────────────────────────
function watchWeb(opts: GpsWatchOptions): GpsWatchHandle {
  if (!navigator.geolocation) {
    opts.onError("unavailable");
    return { stop: () => {} };
  }

  const id = navigator.geolocation.watchPosition(
    (pos) => {
      opts.onPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        timestamp: Date.now(),
      });
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        opts.onError("permission_denied");
      } else if (err.code === err.TIMEOUT) {
        opts.onError("timeout");
      } else {
        opts.onError("unavailable");
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,    // tighter: was 3000
      timeout: 10000,      // tighter: was 15000
    },
  );

  return {
    stop: () => navigator.geolocation.clearWatch(id),
  };
}

// ── Public API ──────────────────────────────────────────────────────
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export async function startGpsWatch(opts: GpsWatchOptions): Promise<GpsWatchHandle> {
  if (isNativePlatform()) {
    return watchNative(opts);
  }
  return watchWeb(opts);
}

export async function getCurrentPosition(): Promise<GpsPosition | null> {
  if (isNativePlatform()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.requestPermissions();
      if (perm.location !== "granted" && perm.coarseLocation !== "granted") return null;
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        timestamp: pos.timestamp,
      };
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        timestamp: Date.now(),
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}
