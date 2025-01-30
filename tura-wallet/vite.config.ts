import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

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
        target: 'https://43.135.26.222:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/rpc/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying:', req.method, req.url, '=>', proxyReq.path);
            if ((req as any).body) {
              const bodyData = JSON.stringify((req as any).body);
              proxyReq.setHeader('Content-Type', 'application/json');
              proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
              proxyReq.write(bodyData);
            }
          });
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            console.log('Response:', proxyRes.statusCode);
          });
        }
      },
      '/api/v1/deploy-mytoken': {
        target: 'http://43.135.26.222:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Deploy proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req: any, _res) => {
            console.log('Deploy proxying:', req.method, req.url);
            let bodyData = '';
            req.on('data', (chunk: Buffer) => {
              bodyData += chunk.toString();
            });
            req.on('end', () => {
              if (bodyData) {
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
              }
            });
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

