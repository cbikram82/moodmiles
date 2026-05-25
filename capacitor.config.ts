import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moodmiles.app',
  appName: 'MoodMiles',
  webDir: 'dist/client',
  server: {
    url: 'https://moodmiles-production.up.railway.app',
    cleartext: true
  }
};

export default config;
