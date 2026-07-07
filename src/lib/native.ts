import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

export async function initNativePlugins() {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a0a' });
    // Android-only: stop the WebView spanning under the status bar. Default
    // is overlay=true, which pushes app headers under the notification /
    // battery indicators (back-arrow untappable). iOS handles the notch
    // separately via env(safe-area-inset-top) so we don't call this there.
    if (platform === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: false });
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
