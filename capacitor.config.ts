import type { CapacitorConfig } from '@capacitor/cli';

const isDevMode = process.env.CAPACITOR_DEV === 'true';

const config: CapacitorConfig = {
  appId: 'app.lovable.hiitfitness',
  appName: 'HIIT Fitness',
  webDir: 'dist',
  ...(isDevMode
    ? {
        server: {
          url: 'https://48e3358b-68c7-4450-9b1d-2cd07f287edd.lovableproject.com?forceHideBadge=true',
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
    scheme: 'HIIT Fitness',
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
