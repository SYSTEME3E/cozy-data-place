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
    // Pour la production, l'app tourne en local (pas de serveur distant)
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0e27',
      showSpinner: false,
    },
  },
};

export default config;
