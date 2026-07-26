import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kavanasystems.warehouse',
  appName: 'KAVANA WAREHOUSE',
  webDir: 'dist',
  server: {
    url: 'https://warehouse.kavanasystems.com/empleado',
    cleartext: false
  }
};

export default config;
