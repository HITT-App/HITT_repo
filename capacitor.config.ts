import type { CapacitorConfig } from '@capacitor/cli';

const isDevMode = process.env.CAPACITOR_DEV === 'true';

const config: CapacitorConfig = {
  appId: 'com.hiitfitness.app',
  appName: 'HIIT Fitness',
  webDir: 'dist',
  ...(isDevMode
    ? {
        server: {
          url: 'http://localhost:8080',
          cleartext: true,
        },
      }
    : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
      splashImmersive: true,
      splashFullScreen: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    // Xcode build scheme name — must match the scheme defined in App.xcodeproj.
    // The "hiitfitness://" URL scheme that opens the app from links lives in
    // Info.plist's CFBundleURLSchemes, not here.
    scheme: 'App',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#0a0a0a',
  },
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
