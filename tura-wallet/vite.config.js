import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: [
      'tura-web-app-tunnel-do83hq6o.devinapps.com',
      'tura-web-app-tunnel-fjtb8gdh.devinapps.com',
      'tura-web-app-tunnel-z1uga9gq.devinapps.com',
      'tura-web-app-tunnel-ewgwj87v.devinapps.com',
      'tura-web-app-tunnel-98olszjh.devinapps.com',
      'tura-web-app-tunnel-ya85bqnb.devinapps.com',
      'tura-web-app-tunnel-w20u3ea8.devinapps.com'
    ]
  },
  server: {
    allowedHosts: [
      'tura-web-app-tunnel-do83hq6o.devinapps.com',
      'tura-web-app-tunnel-fjtb8gdh.devinapps.com',
      'tura-web-app-tunnel-z1uga9gq.devinapps.com',
      'tura-web-app-tunnel-ewgwj87v.devinapps.com',
      'tura-web-app-tunnel-98olszjh.devinapps.com',
      'tura-web-app-tunnel-ya85bqnb.devinapps.com',
      'tura-web-app-tunnel-w20u3ea8.devinapps.com'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  define: {
    'process.env': {
      VITE_DEEPSEEK_API_KEY: JSON.stringify(process.env.VITE_DEEPSEEK_API_KEY)
    },
    global: {}
  }
});
