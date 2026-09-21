import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pro.asciende.app',
  appName: 'Asciende',
  webDir: 'dist',
  server: {
    androidScheme: 'capacitor',
    iosScheme: 'capacitor',
    allowNavigation: ['*'],
  },
  ios: {
    scheme: 'Asciende',
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: true,
    useLegacyBridge: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    YoutubePlayer: {
      patchRefererHeader: true,
      refererHeader: 'https://www.youtube.com',
    },
  },
};

export default config;
