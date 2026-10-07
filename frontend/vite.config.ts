import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api y /health se reenvían al gateway local (igual que hace Render en producción).
const gateway = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: gateway, changeOrigin: true },
      '/health': { target: gateway, changeOrigin: true },
    },
  },
});
