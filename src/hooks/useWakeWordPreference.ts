import { useCallback, useSyncExternalStore } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "hiit-wake-word-enabled";
const EVENT_NAME = "hiit-wake-word-changed";

function readStoredValue(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function emitChange() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

function writeStoredValue(next: boolean) {
  localStorage.setItem(STORAGE_KEY, next ? "true" : "false");
  emitChange();
}

function subscribe(callback: () => void) {
  const onCustom = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };

  window.addEventListener(EVENT_NAME, onCustom);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Single source of truth for the app-wide wake-word setting.
 *
 * We enable the preference immediately; the actual microphone permission
 * request happens in WakeWordListener when it tries to connect to Scribe.
 * This prevents blocking the toggle action if permission is pending.
 */
export function useWakeWordPreference() {
  const enabled = useSyncExternalStore(subscribe, readStoredValue, () => false);

  const setEnabled = useCallback(async (next: boolean) => {
    const current = readStoredValue();
    if (next === current) return;

    writeStoredValue(next);

    if (next) {
      toast.success('"Ok HIIT" voice activation enabled');
    } else {
      toast.info('"Ok HIIT" voice activation disabled');
    }
  }, []);

  const toggle = useCallback(async () => {
    await setEnabled(!readStoredValue());
  }, [setEnabled]);

  return { enabled, setEnabled, toggle };
}
