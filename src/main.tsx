import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNativePlugins } from "./lib/native";

const SW_REFRESH_FLAG = "sw-refresh-pending";
const PREVIEW_BUSTER_PARAM = "__preview_ts";
const PREVIEW_LAST_HIDDEN_AT = "preview-last-hidden-at";
const PREVIEW_SW_RESET_FLAG = "preview-sw-reset-done";
const PREVIEW_MAX_AGE_MS = 45_000;

const isEmbeddedPreview =
  typeof window !== "undefined" && window.self !== window.top;

const isLovablePreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("preview--") ||
    window.location.hostname === "lovableproject.com" ||
    window.location.hostname.endsWith(".lovableproject.com") ||
    (window.location.hostname.endsWith(".lovable.app") && isEmbeddedPreview));

function buildPreviewBustedUrl() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set(PREVIEW_BUSTER_PARAM, `${Date.now()}`);
  return nextUrl.toString();
}

function shouldRefreshPreviewOnLoad() {
  if (!isLovablePreviewHost) return false;

  const url = new URL(window.location.href);
  const rawTimestamp = url.searchParams.get(PREVIEW_BUSTER_PARAM);
  const timestamp = rawTimestamp ? Number(rawTimestamp) : Number.NaN;

  if (!Number.isFinite(timestamp)) return true;
  return Date.now() - timestamp > PREVIEW_MAX_AGE_MS;
}

function refreshPreviewNow() {
  window.location.replace(buildPreviewBustedUrl());
}

function setupPreviewFreshnessGuards() {
  if (!isLovablePreviewHost) return;

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      sessionStorage.setItem(PREVIEW_LAST_HIDDEN_AT, `${Date.now()}`);
      return;
    }

    // Always refresh when returning to a preview tab
    const hiddenAtRaw = sessionStorage.getItem(PREVIEW_LAST_HIDDEN_AT);
    if (hiddenAtRaw) {
      sessionStorage.removeItem(PREVIEW_LAST_HIDDEN_AT);
      refreshPreviewNow();
    }
  };

  const onWindowFocus = () => {
    if (shouldRefreshPreviewOnLoad()) {
      refreshPreviewNow();
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onWindowFocus);

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      refreshPreviewNow();
    }
  });
}

// Only register SW when the PWA plugin is active (not in Lovable preview)
async function initSW() {
  try {
    const { registerSW } = await import("virtual:pwa-register");

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (sessionStorage.getItem(SW_REFRESH_FLAG) === "1") return;
        sessionStorage.setItem(SW_REFRESH_FLAG, "1");
        void updateSW(true);
      },
      onOfflineReady() {
        sessionStorage.removeItem(SW_REFRESH_FLAG);
      },
      onRegisteredSW(_, registration) {
        if (!registration) return;

        const checkForUpdates = () => {
          if (document.visibilityState === "visible") {
            void registration.update();
          }
        };

        checkForUpdates();
        const interval = window.setInterval(checkForUpdates, 15_000);
        document.addEventListener("visibilitychange", checkForUpdates);

        window.addEventListener(
          "beforeunload",
          () => {
            window.clearInterval(interval);
            document.removeEventListener("visibilitychange", checkForUpdates);
          },
          { once: true }
        );

        navigator.serviceWorker?.addEventListener("controllerchange", () => {
          if (sessionStorage.getItem(SW_REFRESH_FLAG) !== "1") return;
          sessionStorage.removeItem(SW_REFRESH_FLAG);
          window.location.reload();
        });
      },
    });
  } catch {
    // PWA plugin not available (e.g. Lovable preview) — skip
  }
}

async function resetPreviewCacheIfNeeded() {
  if (!isLovablePreviewHost) return false;

  sessionStorage.removeItem(SW_REFRESH_FLAG);

  const alreadyResetInSession = sessionStorage.getItem(PREVIEW_SW_RESET_FLAG) === "1";
  let hadActiveController = false;

  try {
    if ("serviceWorker" in navigator) {
      hadActiveController = Boolean(navigator.serviceWorker.controller);
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch {
    // best-effort cleanup for preview only
  }

  if (!alreadyResetInSession && hadActiveController) {
    sessionStorage.setItem(PREVIEW_SW_RESET_FLAG, "1");
    refreshPreviewNow();
    return true;
  }

  sessionStorage.setItem(PREVIEW_SW_RESET_FLAG, "1");
  return false;
}

async function bootstrap() {
  if (shouldRefreshPreviewOnLoad()) {
    refreshPreviewNow();
    return;
  }

  const triggeredReload = await resetPreviewCacheIfNeeded();
  if (triggeredReload) return;

  if (!isLovablePreviewHost) {
    await initSW();
  } else {
    setupPreviewFreshnessGuards();
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
