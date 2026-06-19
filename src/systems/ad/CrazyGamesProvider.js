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
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) throw new Error('CrazyGames SDK missing');
    await sdk.init(); // MUST await — SDK unusable until initialized
    // On an UNAPPROVED domain (GitHub Pages, tunnels, pre-approval hosting) environment is
    // 'disabled' and every SDK method THROWS. Reject so the facade falls back to the safe
    // NullProvider and scene code never touches a throwing SDK. (Real CG host → 'crazygames'.)
    if (sdk.environment === 'disabled') throw new Error('CrazyGames environment disabled');
    this.sdk = sdk;
    this.loadingStart(); // signal "loading" now that the SDK is live; BootScene calls loadingStop when ready
  }

  // Every call is try/catch-guarded — even on an approved domain a transient SDK hiccup must
  // never bubble into scene create()/update() and break the game loop.
  loadingStart() { try { this.sdk?.game.loadingStart(); } catch {} }
  loadingStop() { try { this.sdk?.game.loadingStop(); } catch {} }
  gameplayStart() { try { this.sdk?.game.gameplayStart(); } catch {} } // do NOT call on tab focus/blur — SDK handles that
  gameplayStop() { try { this.sdk?.game.gameplayStop(); } catch {} }

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
