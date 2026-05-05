import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const showListener = Keyboard.addListener("keyboardWillShow", (info) => {
      setKeyboardHeight(info.keyboardHeight);
    });
    const hideListener = Keyboard.addListener("keyboardWillHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showListener.then((l) => l.remove());
      hideListener.then((l) => l.remove());
    };
  }, []);

  return keyboardHeight;
}
