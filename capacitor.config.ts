import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amda.app',
  appName: 'AMDA',
  webDir: 'dist',
  androidScheme: 'https',
  backgroundColor: '#ffffff',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;