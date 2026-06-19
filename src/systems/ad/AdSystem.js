import { AdProvider } from './AdProvider.js';
import { CrazyGamesProvider } from './CrazyGamesProvider.js';
import { PokiProvider } from './PokiProvider.js';

// Dev fallback: simulate ads locally so the 2× / interstitial flows are testable
// without a real SDK. Never used in a production build.
class DevProvider extends AdProvider {
  gameplayStart() {}
  gameplayStop() {}
  async showInterstitial() { console.log('[ad] dev interstitial'); }
  async showRewarded() { console.log('[ad] dev rewarded → granted'); return true; }
}

// Provider-agnostic facade. Scenes only call AdSystem.* (GDD §12).
export const AdSystem = {
  provider: new AdProvider(),  // NullProvider until init() swaps it
  sound: null,

  // CrazyGames BASIC LAUNCH force-disables ads platform-side (no revenue is shared), and QA
  // REJECTS a game that shows dead rewarded buttons while ads are off. So during Basic Launch we
  // keep ads OFF here: rewarded grants resolve INSTANTLY (no dead button) and interstitials are
  // skipped — while loading + gameplayStart/Stop still fire so the SDK is detected.
  // Flip to true ONLY after CrazyGames approves the game for FULL LAUNCH.
  adsEnabled: false,

  async init(sound) {
    this.sound = sound;
    // Only load a portal SDK when explicitly built for it (VITE_AD_PROVIDER=crazygames|poki).
    // Otherwise (GitHub Pages test build, local dev) stay ad-free so no SDK errors fire off-portal.
    const choice = import.meta.env?.VITE_AD_PROVIDER ?? 'none';
    if (choice !== 'crazygames' && choice !== 'poki') {
      this.provider = import.meta.env?.DEV ? new DevProvider() : new AdProvider();
      return;
    }
    const P = choice === 'poki' ? PokiProvider : CrazyGamesProvider;
    try {
      const p = new P(sound);
      await p.init();
      this.provider = p;
      // The SDK loads async — a level (gameplayStart) may have begun BEFORE the provider was ready,
      // so re-apply the current gameplay state to the real SDK now. Without this the very first
      // gameplayStart can be lost → CrazyGames' "First gameplay start" check stays No.
      if (this._gameplayActive) this.provider.gameplayStart();
    } catch {
      this.provider = import.meta.env?.DEV ? new DevProvider() : new AdProvider();
    }
  },

  loadingStart() { this.provider.loadingStart(); },
  loadingStop() { this.provider.loadingStop(); },
  // Track the gameplay state so init() can re-fire it once the real provider is swapped in.
  gameplayStart() { this._gameplayActive = true; this.provider.gameplayStart(); },
  gameplayStop() { this._gameplayActive = false; this.provider.gameplayStop(); },

  // Ads OFF (Basic Launch) → skip the interstitial, continue the transition immediately.
  showInterstitial() {
    if (!this.adsEnabled) return Promise.resolve();
    return this.provider.showInterstitial();
  },

  // Ads OFF (Basic Launch) → grant the reward INSTANTLY so the button is never dead.
  // Ads ON (Full Launch) → onComplete fires ONLY when the ad truly finished (never on error/no-fill/cooldown).
  async showRewarded(onComplete) {
    if (!this.adsEnabled) { onComplete?.(); return true; }
    const watched = await this.provider.showRewarded();
    if (watched) onComplete?.();
    return watched;
  },
};
