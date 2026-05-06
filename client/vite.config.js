import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Proxy các file được tải lên để hiển thị đúng trên client
       '/uploads': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        configure: (proxy) => {
          // Suppress connection refused errors when backend is starting up
          proxy.on('error', (err, _req, res) => {
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
              // Silently return 503 instead of spamming Vite console
              if (!res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Backend starting up, please wait...' }));
              }
            }
          });
        },
      },
      // Thêm proxy cho các API request để client có thể gọi được server
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
              if (!res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Backend starting up, please wait...' }));
              }
            }
          });
        },
      },
    },
    // Đảm bảo Vite lắng nghe trên tất cả các network interfaces
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    // Thư mục output khi build, đi ra một cấp so với thư mục client hiện tại
    outDir: '../dist' 
  }
});