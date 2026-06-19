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
    this.loadingStart(); // SDK live → signal load begin; BootScene calls loadingStop when ready
  }

  loadingStart() { try { this.sdk?.gameLoadingStart(); } catch {} }
  loadingStop() { try { this.sdk?.gameLoadingFinished(); } catch {} }
  gameplayStart() { try { this.sdk?.gameplayStart(); } catch {} }
  gameplayStop() { try { this.sdk?.gameplayStop(); } catch {} }

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
