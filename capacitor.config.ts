import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.tapastracker',
  appName: 'Tapas Tracker',
  webDir: 'public',
  server: {
    androidScheme: "https"
  }
};

export default config;
