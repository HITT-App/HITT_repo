import "./lib/preview-bootstrap";
import { installMicDebug } from "./lib/mic-debug";
import * as Sentry from "@sentry/react";
import { initAnalytics } from "./lib/analytics";

// Wrap getUserMedia / SpeechRecognition / MediaRecorder before anything else
// so every mic access from every component / plugin is counted. Read via
// `window.__hittDebug.mic` in Safari Web Inspector on a device build.
// Safe to fail — installMicDebug is instrumentation, not a required feature.
try { installMicDebug(); } catch (e) { console.warn('[mic-debug] install failed', e); }
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNativePlugins } from "./lib/native";
import { LiveActivity } from "./lib/live-activity";
import {
  CACHE_VERSION_KEY,
  coverPreviewSnapshot,
  consumePreviewRefreshOnResume,
  freezePreviewSnapshot,
  isLovablePreviewHost,
  markPreviewForRefreshOnResume,
  PREVIEW_MAX_AGE_MS,
  PREVIEW_SW_RESET_FLAG,
  SW_REFRESH_FLAG,
  refreshPreviewNow,
  releasePreviewBootGuard,
  shouldRefreshPreviewOnLoad,
  uncoverPreviewSnapshot,
} from "./lib/preview";

initAnalytics();

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.2,
  enabled: import.meta.env.PROD,
});

function setupPreviewFreshnessGuards() {
  if (!isLovablePreviewHost) return;

  let resumeWatchFrame = 0;
  let lastPaintAt = window.performance.now();

  const refreshPreview = () => {
    coverPreviewSnapshot();
    refreshPreviewNow();
  };

  const resumeIfNeeded = () => {
    if (!consumePreviewRefreshOnResume()) return false;
    refreshPreview();
    return true;
  };

  const syncPaintWatch = (timestamp: number) => {
    if (timestamp - lastPaintAt > PREVIEW_MAX_AGE_MS) {
      refreshPreview();
      return;
    }

    lastPaintAt = timestamp;
    resumeWatchFrame = window.requestAnimationFrame(syncPaintWatch);
  };

  const startResumeWatchdog = () => {
    if (resumeWatchFrame) return;
    resumeWatchFrame = window.requestAnimationFrame(syncPaintWatch);
  };

  const resetPaintClock = () => {
    lastPaintAt = window.performance.now();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      resetPaintClock();
      markPreviewForRefreshOnResume();
      coverPreviewSnapshot();
      return;
    }

    startResumeWatchdog();

    if (resumeIfNeeded() || shouldRefreshPreviewOnLoad()) {
      refreshPreview();
      return;
    }

    uncoverPreviewSnapshot();
  };

  const onWindowFocus = () => {
    resetPaintClock();

    if (resumeIfNeeded()) {
      return;
    }

    uncoverPreviewSnapshot();
  };

  const onPageHide = () => {
    resetPaintClock();
    markPreviewForRefreshOnResume();
    freezePreviewSnapshot();
  };

  const onBeforeUnload = () => {
    coverPreviewSnapshot();
  };

  const onUnload = () => {
    freezePreviewSnapshot();
  };

  const onResumeInteraction = () => {
    resetPaintClock();
    resumeIfNeeded();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onWindowFocus);
  window.addEventListener("pointerdown", onResumeInteraction, { capture: true, passive: true });
  window.addEventListener("pagehide", onPageHide, { capture: true });
  window.addEventListener("beforeunload", onBeforeUnload, { capture: true });
  window.addEventListener("unload", onUnload, { capture: true });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      freezePreviewSnapshot();
      refreshPreview();
      return;
    }

    startResumeWatchdog();

    if (resumeIfNeeded() || shouldRefreshPreviewOnLoad()) {
      refreshPreview();
      return;
    }

    uncoverPreviewSnapshot();
  });

  startResumeWatchdog();
}

function setupPreviewHMRGuards() {
  if (!isLovablePreviewHost || !import.meta.hot) return;

  let releaseFrame = 0;

  const coverForHotUpdate = () => {
    coverPreviewSnapshot();
  };

  const releaseAfterHotUpdate = () => {
    if (releaseFrame) {
      window.cancelAnimationFrame(releaseFrame);
    }

    window.requestAnimationFrame(() => {
      releaseFrame = window.requestAnimationFrame(() => {
        releasePreviewBootGuard();
        releaseFrame = 0;
      });
    });
  };

  import.meta.hot.on("vite:beforeUpdate", coverForHotUpdate);
  import.meta.hot.on("vite:beforeFullReload", coverForHotUpdate);
  import.meta.hot.on("vite:ws:disconnect", coverForHotUpdate);
  import.meta.hot.on("vite:afterUpdate", releaseAfterHotUpdate);
  import.meta.hot.on("vite:error", releaseAfterHotUpdate);
  import.meta.hot.on("vite:ws:connect", releaseAfterHotUpdate);
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
    coverPreviewSnapshot();
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
  // Sweep any Live Activity orphans from a previous force-killed session so
  // they don't stack on the lock screen forever.
  void LiveActivity.endAll();
  createRoot(document.getElementById("root")!).render(
    <Sentry.ErrorBoundary fallback={<p style={{ padding: 24, color: '#fff', background: '#0d0d0d', minHeight: '100dvh' }}>Something went wrong. Please restart the app.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  );

  if (isLovablePreviewHost) {
    setupPreviewHMRGuards();
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          releasePreviewBootGuard();
        });
      });
    });
  }
}

void bootstrap();
