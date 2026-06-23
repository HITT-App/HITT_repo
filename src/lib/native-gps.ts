/**
 * GPS Provider abstraction
 * - Native: uses @capacitor-community/background-geolocation for background-capable tracking
 * - Web: falls back to navigator.geolocation
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

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
  let stopped = false;
  let watcherId: string | null = null;

  const idPromise = BackgroundGeolocation.addWatcher(
    {
      backgroundMessage: "Recording your activity",
      backgroundTitle: "HIIT Fitness",
      requestPermissions: true,
      stale: false,
      distanceFilter: 0,
    },
    (location, error) => {
      if (error) {
        if (error.code === "NOT_AUTHORIZED") {
          opts.onError("permission_denied");
        } else {
          opts.onError("unavailable");
        }
        return;
      }
      if (location) {
        opts.onPosition({
          lat: location.latitude,
          lng: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
          timestamp: location.time ?? Date.now(),
        });
      }
    },
  );

  idPromise
    .then((id) => {
      if (stopped) {
        BackgroundGeolocation.removeWatcher({ id }).catch(() => {});
        return;
      }
      watcherId = id;
    })
    .catch(() => {
      opts.onError("unavailable");
    });

  return {
    stop: () => {
      stopped = true;
      if (watcherId !== null) {
        const id = watcherId;
        watcherId = null;
        BackgroundGeolocation.removeWatcher({ id }).catch(() => {});
      }
    },
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
      return await new Promise<GpsPosition | null>((resolve) => {
        let settled = false;
        let watcherId: string | null = null;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          if (watcherId !== null) {
            BackgroundGeolocation.removeWatcher({ id: watcherId }).catch(() => {});
          }
          resolve(null);
        }, 8000);

        BackgroundGeolocation.addWatcher(
          { requestPermissions: true, stale: true, distanceFilter: 0 },
          (location, error) => {
            if (error || !location) return;
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            const id = watcherId;
            resolve({
              lat: location.latitude,
              lng: location.longitude,
              accuracy: location.accuracy,
              altitude: location.altitude,
              timestamp: location.time ?? Date.now(),
            });
            if (id !== null) {
              BackgroundGeolocation.removeWatcher({ id }).catch(() => {});
            }
          },
        )
          .then((id) => {
            if (settled) {
              BackgroundGeolocation.removeWatcher({ id }).catch(() => {});
              return;
            }
            watcherId = id;
          })
          .catch(() => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(null);
          });
      });
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
