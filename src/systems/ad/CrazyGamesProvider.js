// CrazyGames SDK v3. requestAd is CALLBACK-based, not a Promise (GDD §12).
export class CrazyGamesProvider {
  constructor(sound) { this.sound = sound; this.sdk = null; }

  async init() {
    // The SDK is loaded STATICALLY from index.html <head> (CrazyGames' prescribed integration, so their
    // automated checks detect it at page load). Wait for window.CrazyGames.SDK, then init.
    await new Promise((res, rej) => {
      if (window.CrazyGames?.SDK) return res();
      const t0 = Date.now();
      const iv = setInterval(() => {
        if (window.CrazyGames?.SDK) { clearInterval(iv); res(); }
        else if (Date.now() - t0 > 6000) { clearInterval(iv); rej(new Error('CrazyGames SDK script not loaded')); }
      }, 50);
    });
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) throw new Error('CrazyGames SDK missing');
    await sdk.init(); // MUST await — SDK unusable until initialized
    // Keep the SDK ACTIVE in EVERY environment (crazygames / local / qa / staging / undefined / even
    // 'disabled'). CrazyGames' QA & pre-approval preview can report a non-'crazygames' environment; if
    // we dropped the provider there, game.gameplayStart() would never reach the SDK and the QA
    // "First gameplay start" check fails. Every call below is try/catch-guarded, so on a genuinely
    // disabled domain the methods simply no-op — they never throw into the game loop.
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
