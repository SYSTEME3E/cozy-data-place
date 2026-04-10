import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'africa.nexora.app',
  appName: 'Nexora',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#1a2235',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
