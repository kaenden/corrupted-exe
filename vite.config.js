import { defineConfig } from 'vite';

// CrazyGames/Poki want a small, self-contained build. Relative base so the bundle
// works from any sub-path the portal serves it from.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1500,
  },
});
