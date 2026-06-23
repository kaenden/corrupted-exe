import { defineConfig, loadEnv } from 'vite';

// Portals want a small, self-contained build. Relative base so the bundle works from any sub-path.
// The platform SDK <script> is injected into index.html per build mode (transformIndexHtml below) so
// each portal build ships exactly ONE portal script — no leftover scripts from the other platforms.
const SDK_TAG = {
  crazygames: '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>',
  playgama: '<script src="https://bridge.playgama.com/v1/stable/playgama-bridge.js"></script>',
  // poki: '' — the Poki provider injects its SDK at runtime, so no static tag.
};

export default defineConfig(({ mode }) => {
  const provider = loadEnv(mode, process.cwd(), '').VITE_AD_PROVIDER || '';
  // poki → no static tag; playgama → bridge; crazygames + plain build → CrazyGames (harmless off-portal).
  const sdk = provider === 'poki' ? '' : (SDK_TAG[provider] ?? SDK_TAG.crazygames);
  return {
    base: './',
    build: { target: 'es2020', assetsInlineLimit: 4096, chunkSizeWarningLimit: 1500 },
    plugins: [{
      name: 'platform-sdk-tag',
      transformIndexHtml: (html) => html.replace('<!--PLATFORM_SDK-->', sdk),
    }],
  };
});
