import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

export async function initNativePlugins() {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    // Android 15 (SDK 35+) enforces edge-to-edge — the system bars are
    // transparent and the WebView draws underneath them. MainActivity calls
    // EdgeToEdge.enable() for backward-compat on older Androids. The
    // status-bar plugin's setBackgroundColor + setOverlaysWebView both wrap
    // deprecated Window APIs that Play Console flags on target SDK 35+,
    // so skip them on Android and let env(safe-area-inset-*) do the work.
    if (platform === 'ios') {
      await StatusBar.setBackgroundColor({ color: '#0a0a0a' });
    }
  } catch {
    // Status bar not available
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    // Auto-hidden by config, but ensure it hides after app is ready
    setTimeout(() => SplashScreen.hide(), 2500);
  } catch {
    // Splash screen not available
  }
}
