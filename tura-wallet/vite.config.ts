import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import type { IncomingMessage, ServerResponse } from "http"


export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: 'buffer',
      process: 'process/browser'
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/rpc': {
        target: 'https://43.135.26.222:8088',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/rpc/, ''),
        configure: (proxy) => {
          proxy.on('error', (err: Error) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq: { path: string; setHeader: (key: string, value: string | number) => void; write: (data: string) => void }, req: IncomingMessage & { body?: unknown }) => {
            if (req.method === 'POST' && req.body) {
              const bodyData = JSON.stringify(req.body);
              console.log('Proxying:', req.method, req.url, '=>', proxyReq.path);
              proxyReq.setHeader('Content-Type', 'application/json');
              proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
              proxyReq.write(bodyData);
            }
          });
          proxy.on('proxyRes', (proxyRes: { statusCode?: number }, _req: IncomingMessage, res: ServerResponse) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            console.log('Response:', proxyRes.statusCode);
          });
        }
      }
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  }
})

