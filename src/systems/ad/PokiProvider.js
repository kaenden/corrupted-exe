// Poki SDK. Different API + mandatory loading/commercial/rewarded calls (GDD §12).
export class PokiProvider {
  constructor(sound) { this.sound = sound; this.sdk = null; }

  async init() {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    this.sdk = window.PokiSDK;
    if (!this.sdk) throw new Error('Poki SDK missing');
    await this.sdk.init();
  }

  loadingStart() { this.sdk?.gameLoadingStart(); }
  loadingStop() { this.sdk?.gameLoadingFinished(); }
  gameplayStart() { this.sdk?.gameplayStart(); }
  gameplayStop() { this.sdk?.gameplayStop(); }

  async showInterstitial() {
    if (!this.sdk) return;
    this.gameplayStop(); this.sound?.muteForAd(true);
    await this.sdk.commercialBreak();
    this.sound?.muteForAd(false); this.gameplayStart();
  }

  async showRewarded() {
    if (!this.sdk) return false;
    this.gameplayStop(); this.sound?.muteForAd(true);
    const watched = await this.sdk.rewardedBreak();
    this.sound?.muteForAd(false); this.gameplayStart();
    return watched;
  }
}
