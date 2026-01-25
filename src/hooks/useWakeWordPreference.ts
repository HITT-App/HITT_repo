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

async function requestMicrophonePermission() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Immediately stop tracks so we don't keep the mic active.
  for (const track of stream.getTracks()) track.stop();
}

/**
 * Single source of truth for the app-wide wake-word setting.
 *
 * IMPORTANT: `storage` events do not fire in the same tab, so we also emit a
 * custom event to keep `VoiceController` and Profile in sync instantly.
 */
export function useWakeWordPreference() {
  const enabled = useSyncExternalStore(
    subscribe,
    readStoredValue,
    () => false
  );

  const setEnabled = useCallback(
    async (next: boolean) => {
      const current = readStoredValue();
      if (next === current) return;

      if (next) {
        try {
          await requestMicrophonePermission();
          writeStoredValue(true);
          toast.success('"Ok HIIT" voice activation enabled');
        } catch (error) {
          console.error("[WakeWord] Microphone permission denied:", error);
          writeStoredValue(false);
          toast.error("Microphone permission is required for voice activation");
        }
        return;
      }

      writeStoredValue(false);
      toast.info('"Ok HIIT" voice activation disabled');
    },
    []
  );

  const toggle = useCallback(async () => {
    await setEnabled(!readStoredValue());
  }, [setEnabled]);

  return { enabled, setEnabled, toggle };
}
