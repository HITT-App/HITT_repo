import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

const SW_REFRESH_FLAG = "sw-refresh-pending";

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

    const interval = window.setInterval(checkForUpdates, 30_000);
    window.addEventListener(
      "beforeunload",
      () => {
        window.clearInterval(interval);
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

createRoot(document.getElementById("root")!).render(<App />);

