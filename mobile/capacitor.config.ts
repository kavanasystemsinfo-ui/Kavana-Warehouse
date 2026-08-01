import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kavanasystems.cleanstock',
  appName: 'Kavana CleanStock',
  webDir: 'dist',
  server: {
    url: 'https://cleanstock.kavanasystems.com/empleado',
    cleartext: false
  }
};

export default config;
