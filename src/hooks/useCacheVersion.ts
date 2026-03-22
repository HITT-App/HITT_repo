import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_VERSION_KEY = "app_cache_version";
const isEmbeddedPreview =
  typeof window !== "undefined" && window.self !== window.top;

const isLovablePreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("preview--") ||
    window.location.hostname === "lovableproject.com" ||
    window.location.hostname.endsWith(".lovableproject.com") ||
    (window.location.hostname.endsWith(".lovable.app") && isEmbeddedPreview));

export const useCacheVersion = () => {
  useEffect(() => {
    if (isLovablePreviewHost) {
      localStorage.removeItem(CACHE_VERSION_KEY);
      return;
    }

    const checkCacheVersion = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "cache_version")
          .maybeSingle();

        if (!data?.value) return;

        const serverVersion = data.value;
        const localVersion = localStorage.getItem(CACHE_VERSION_KEY);

        if (localVersion && localVersion !== serverVersion) {
          console.log("[CacheVersion] Server version changed, purging caches...");
          // Clear service worker caches
          if ("caches" in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));
          }
          // Unregister service workers so they re-install fresh
          if ("serviceWorker" in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((r) => r.unregister()));
          }
          // Save new version before reload
          localStorage.setItem(CACHE_VERSION_KEY, serverVersion);
          // Hard reload to bypass any remaining cache
          window.location.reload();
          return;
        }

        // First visit or same version – just store it
        if (!localVersion) {
          localStorage.setItem(CACHE_VERSION_KEY, serverVersion);
        }
      } catch (err) {
        console.warn("[CacheVersion] Check failed:", err);
      }
    };

    checkCacheVersion();
  }, []);
};
