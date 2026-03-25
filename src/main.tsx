import "./lib/preview-bootstrap";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNativePlugins } from "./lib/native";
import {
  CACHE_VERSION_KEY,
  consumePreviewRefreshOnResume,
  freezePreviewSnapshot,
  isLovablePreviewHost,
  markPreviewForRefreshOnResume,
  PREVIEW_SW_RESET_FLAG,
  SW_REFRESH_FLAG,
  refreshPreviewNow,
  releasePreviewBootGuard,
  shouldRefreshPreviewOnLoad,
} from "./lib/preview";

function setupPreviewFreshnessGuards() {
  if (!isLovablePreviewHost) return;

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      markPreviewForRefreshOnResume();
      return;
    }

    if (consumePreviewRefreshOnResume()) {
      refreshPreviewNow();
    }
  };

  const onWindowFocus = () => {
    if (consumePreviewRefreshOnResume() || shouldRefreshPreviewOnLoad()) {
      refreshPreviewNow();
    }
  };

  const onPageHide = () => {
    markPreviewForRefreshOnResume();
    freezePreviewSnapshot();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onWindowFocus);
  window.addEventListener("pagehide", onPageHide, { capture: true });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      freezePreviewSnapshot();
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
  sessionStorage.removeItem("preview-resume-refresh");
  localStorage.removeItem(CACHE_VERSION_KEY);

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

  await initNativePlugins();
  createRoot(document.getElementById("root")!).render(<App />);

  if (isLovablePreviewHost) {
    window.requestAnimationFrame(() => {
      releasePreviewBootGuard();
    });
  }
}

void bootstrap();
