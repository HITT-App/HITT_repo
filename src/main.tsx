import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true);
  },
  onRegisteredSW(_, registration) {
    if (!registration) return;

    setInterval(() => {
      if (document.visibilityState === "visible") {
        void registration.update();
      }
    }, 60_000);
  },
});

createRoot(document.getElementById("root")!).render(<App />);

