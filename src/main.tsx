import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const SW_REFRESH_FLAG = "sw-refresh-pending";
const isLovablePreviewHost =
  typeof window !== "undefined" && window.location.hostname.includes("preview--");

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
  if (!isLovablePreviewHost) return;

  sessionStorage.removeItem(SW_REFRESH_FLAG);

  try {
    if ("serviceWorker" in navigator) {
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
}

async function bootstrap() {
  await resetPreviewCacheIfNeeded();

  if (!isLovablePreviewHost) {
    await initSW();
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
