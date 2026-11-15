import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5183,
    // The web app talks to rpn-api same-origin through this proxy in dev, mirroring the
    // production topology (§9 of the plan). Same-origin is what lets the refresh token live
    // in an httpOnly cookie without third-party-cookie or CORS-preflight problems.
    proxy: {
      '/api': {
        target: process.env.VITE_API_ORIGIN ?? 'http://localhost:8080',
        // A remote API (e.g. VITE_API_ORIGIN=https://rpn-demo.onrender.com) routes on the Host
        // header, so it must see its own name; the local API doesn't care.
        changeOrigin: process.env.VITE_API_ORIGIN !== undefined,
      },
    },
  },
});
