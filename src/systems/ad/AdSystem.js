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

  async init(sound) {
    this.sound = sound;
    const choice = import.meta.env?.VITE_AD_PROVIDER ?? 'crazygames';
    const P = choice === 'poki' ? PokiProvider : CrazyGamesProvider;
    try {
      const p = new P(sound);
      await p.init();
      this.provider = p;
    } catch {
      // No SDK (local dev / portal preview). Use DevProvider in dev, NullProvider in prod.
      this.provider = import.meta.env?.DEV ? new DevProvider() : new AdProvider();
    }
  },

  loadingStart() { this.provider.loadingStart(); },
  loadingStop() { this.provider.loadingStop(); },
  gameplayStart() { this.provider.gameplayStart(); },
  gameplayStop() { this.provider.gameplayStop(); },
  showInterstitial() { return this.provider.showInterstitial(); },

  // onComplete fires ONLY when the ad truly finished (never on error/no-fill/cooldown).
  async showRewarded(onComplete) {
    const watched = await this.provider.showRewarded();
    if (watched) onComplete?.();
    return watched;
  },
};
