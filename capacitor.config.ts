import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pro.asciende.app',
  appName: 'Asciende',
  webDir: 'dist',
  server: {
    // Cambiamos 'capacitor' por 'https' y agregamos el hostname para solucionar el Error 153 de YouTube
    hostname: 'localhost',
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: [
      '*.youtube.com', 
      '*.youtube-nocookie.com', 
      '*.ytimg.com', 
      '*.googlevideo.com', 
      'hub.asciende.pro', 
      'ngkcbygyoobqhlmlnuvl.supabase.co'
    ],
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
  },
};

export default config;