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
      allowedHosts: [
        '34fc5cc6bbb6.ngrok-free.app',
        '.ngrok-free.app',
        '.ngrok.io',
        'localhost'
      ],
      hmr: {
        clientPort: 443,
        host: '34fc5cc6bbb6.ngrok-free.app',
        protocol: 'wss'
      },
      fs: {
        allow: ['..']
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying request:', req.method, req.url, 'to', proxyReq.host + proxyReq.path);
            });
          }
        },
        '/socket.io': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          ws: true
        },
        '/audio': {
          target: 'http://localhost:8000',
          changeOrigin: true
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
