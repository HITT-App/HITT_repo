import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

export async function initNativePlugins() {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a0a' });
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
