import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    {
      name: 'everstep-development-csp',
      apply: 'serve',
      transformIndexHtml(html) {
        // Vite React Refresh and local HMR are enabled only on 127.0.0.1 during development.
        return html
          .replace("script-src 'self';", "script-src 'self' 'unsafe-inline';")
          .replace("connect-src 'none';", "connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:*;");
      }
    },
    react()
  ],
  base: './',
  server: {
    host: '127.0.0.1',
    strictPort: true,
    port: 5173
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  }
});
