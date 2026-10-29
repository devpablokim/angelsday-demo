import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// `--mode preview` builds a static, hash-routed bundle with relative asset paths
// so it can be opened from any static host (artifact preview, file server).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'preview' ? './' : '/',
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: mode === 'preview' ? 'dist-preview' : 'dist',
    chunkSizeWarningLimit: 1200,
  },
}));
