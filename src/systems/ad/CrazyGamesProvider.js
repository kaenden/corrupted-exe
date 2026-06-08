// CrazyGames SDK v3. requestAd is CALLBACK-based, not a Promise (GDD §12).
export class CrazyGamesProvider {
  constructor(sound) { this.sound = sound; this.sdk = null; }

  async init() {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    this.sdk = window.CrazyGames?.SDK;
    if (!this.sdk) throw new Error('CrazyGames SDK missing');
    await this.sdk.init(); // MUST await — SDK unusable until initialized
  }

  loadingStart() { this.sdk?.game.loadingStart(); }
  loadingStop() { this.sdk?.game.loadingStop(); }
  gameplayStart() { this.sdk?.game.gameplayStart(); } // do NOT call on tab focus/blur — SDK handles that
  gameplayStop() { this.sdk?.game.gameplayStop(); }

  // 'midgame' is the SDK string for an interstitial ('interstitial' is NOT valid).
  showInterstitial() {
    if (!this.sdk) return Promise.resolve();
    this.gameplayStop();
    return new Promise((resolve) => {
      this.sdk.ad.requestAd('midgame', {
        adStarted: () => this.sound?.muteForAd(true),
        adFinished: () => { this.sound?.muteForAd(false); this.gameplayStart(); resolve(); },
        adError: () => { this.sound?.muteForAd(false); this.gameplayStart(); resolve(); },
      });
    });
  }

  // Resolves TRUE only from adFinished. adError / no-fill / cooldown → FALSE (no reward).
  showRewarded() {
    if (!this.sdk) return Promise.resolve(false);
    this.gameplayStop();
    return new Promise((resolve) => {
      this.sdk.ad.requestAd('rewarded', {
        adStarted: () => this.sound?.muteForAd(true),
        adFinished: () => { this.sound?.muteForAd(false); this.gameplayStart(); resolve(true); },
        adError: () => { this.sound?.muteForAd(false); this.gameplayStart(); resolve(false); },
      });
    });
  }
}
