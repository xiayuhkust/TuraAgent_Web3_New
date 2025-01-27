import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'tura-web-app-tunnel-do83hq6o.devinapps.com',
      'tura-web-app-tunnel-fjtb8gdh.devinapps.com',
      'tura-web-app-tunnel-z1uga9gq.devinapps.com',
      'tura-web-app-tunnel-ewgwj87v.devinapps.com'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
