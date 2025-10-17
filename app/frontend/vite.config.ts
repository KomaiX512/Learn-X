import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ command, mode }) => {
  console.log('Vite config loaded:', { command, mode });
  return {
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: ['8b3231b46e03.ngrok-free.app', 'f3718157294a.ngrok-free.app'],
      hmr: {
        clientPort: 443,
        host: 'f3718157294a.ngrok-free.app',
        protocol: 'wss'
      },
      fs: {
        allow: ['..']
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',  // Correct backend port with IPv4
          changeOrigin: true,
          timeout: 120000,  // 120 seconds for clarification generation
          proxyTimeout: 120000,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying request:', req.method, req.url, 'to', proxyReq.host + proxyReq.path);
            });
            proxy.on('error', (err, _req, _res) => {
              console.error('[Proxy] Error:', err.message);
            });
            proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
              console.log('Proxying WebSocket:', req.url);
            });
          }
        },
        '/socket.io': {
          target: 'http://127.0.0.1:8000',  // Correct backend port with IPv4
          changeOrigin: true,
          ws: true,
          timeout: 0  // No timeout for WebSocket
        },
        '/audio': {
          target: 'http://127.0.0.1:8000',  // Correct backend port with IPv4
          changeOrigin: true,
          timeout: 60000  // 60 seconds for audio
        }
      }
    },
    resolve: {
      alias: {
        shared: path.resolve(new URL(import.meta.url).pathname, '../shared')
      }
    }
  }
});
