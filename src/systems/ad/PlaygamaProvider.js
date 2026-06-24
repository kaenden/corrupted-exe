import { GameState } from '../../state/GameState.js';

// Playgama Bridge provider. `window.bridge` comes from the static <head> script (injected by
// vite.config for the playgama build). Beyond ads, Playgama's review validates these platform signals,
// so we wire them all here: game_ready, AUDIO_STATE_CHANGED (mute), PAUSE_STATE_CHANGED (pause+mute),
// and progress saved/loaded via the SDK storage. Every bridge call is try/catch-guarded so a missing
// bridge / mock-mode never throws into the game loop.
export class PlaygamaProvider {
  constructor(sound, game) { this.sound = sound; this.game = game; this.bridge = null; this._paused = false; }

  async init() {
    // Bridge is loaded STATICALLY in index.html <head> → wait for window.bridge, then initialize.
    await new Promise((res, rej) => {
      if (window.bridge) return res();
      const t0 = Date.now();
      const iv = setInterval(() => {
        if (window.bridge) { clearInterval(iv); res(); }
        else if (Date.now() - t0 > 6000) { clearInterval(iv); rej(new Error('Playgama bridge script not loaded')); }
      }, 50);
    });
    const b = window.bridge;
    this.bridge = b;
    // initialize MUST run before any bridge call — but never let a stalled handshake block readiness:
    // race it against a timeout, and swallow a reject, so we always reach the game_ready signal below.
    try { await Promise.race([Promise.resolve(b.initialize()), new Promise((r) => setTimeout(r, 4000))]); } catch {}
    const EN = b.EVENT_NAME || {};

    // (C) game_ready — the FIRST call after initialize (matches the proven-working Swing Wreck order).
    // Drops the platform loader. NEVER gate it behind listeners or storage I/O. Send now + a couple of
    // retries (idempotent platform-side) so a not-quite-settled bridge on the harness still receives it.
    const sendReady = () => { try { b.platform.sendMessage('game_ready'); } catch {} };
    sendReady();
    setTimeout(sendReady, 700);
    setTimeout(sendReady, 1600);

    // (A) Platform MUTE — required (else "Platform mute signal ignored"). Mute on audio-off, restore on on.
    try { b.platform.on(EN.AUDIO_STATE_CHANGED, (isEnabled) => { try { this.sound?.muteForAd(!isEnabled); } catch {} }); } catch {}
    // (B) Platform PAUSE — pause + mute the game during an overlay/ad; resume after.
    try { b.platform.on(EN.PAUSE_STATE_CHANGED, (isPaused) => { isPaused ? this._pause() : this._resume(); }); } catch {}
    try { if (b.platform.isAudioEnabled === false) this.sound?.muteForAd(true); } catch {}   // honour the initial state

    // (D) SDK storage — wired AFTER readiness, FIRE-AND-FORGET (no await). save → storage.set,
    // one storage.get at boot → "progress saved/loaded via SDK" validation + cloud restore on a fresh device.
    try {
      GameState._cloud = {
        set: (k, d) => { try { b.storage.set(k, JSON.stringify(d)); } catch {} },
        get: async (k) => { try { const v = await b.storage.get(k); return v ? JSON.parse(v) : null; } catch { return null; } },
      };
      GameState.loadCloud().catch(() => {});
    } catch {}
  }

  // Playgama has no separate loading/gameplay events (game_ready covers readiness) → no-ops.
  loadingStart() {}
  loadingStop() {}
  gameplayStart() {}
  gameplayStop() {}

  _pause() {
    if (this._paused) return; this._paused = true;
    try { this.sound?.muteForAd(true); } catch {}
    try { this.game?.scene?.getScenes(true).forEach((s) => { if (s.scene.key !== 'BootScene') s.scene.pause(); }); } catch {}
  }
  _resume() {
    if (!this._paused) return; this._paused = false;
    try { this.game?.scene?.getScenes(true).forEach((s) => s.scene.resume()); } catch {}
    try { this.sound?.muteForAd(this.bridge?.platform.isAudioEnabled === false); } catch {}
  }

  // (F) INTERSTITIAL — mute while it's open, restore on close/fail. Resolves when the break ends.
  showInterstitial() {
    if (!this.bridge) return Promise.resolve();
    const adv = this.bridge.advertisement, EV = this.bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED;
    return new Promise((resolve) => {
      const h = (s) => {
        if (s === 'opened') { try { this.sound?.muteForAd(true); } catch {} }
        else if (s === 'closed' || s === 'failed') {
          try { adv.off(EV, h); } catch {}
          try { this.sound?.muteForAd(this.bridge.platform.isAudioEnabled === false); } catch {}
          resolve();
        }
      };
      try { adv.on(EV, h); adv.showInterstitial(); } catch { resolve(); }
    });
  }

  // (E) REWARDED — TRUE only when state === 'rewarded' (a bare 'closed' is NOT a reward).
  showRewarded() {
    if (!this.bridge) return Promise.resolve(false);
    const adv = this.bridge.advertisement, EV = this.bridge.EVENT_NAME.REWARDED_STATE_CHANGED;
    return new Promise((resolve) => {
      let got = false;
      const h = (s) => {
        if (s === 'opened') { try { this.sound?.muteForAd(true); } catch {} }
        else if (s === 'rewarded') got = true;
        else if (s === 'closed' || s === 'failed') {
          try { adv.off(EV, h); } catch {}
          try { this.sound?.muteForAd(this.bridge.platform.isAudioEnabled === false); } catch {}
          resolve(got);
        }
      };
      try { adv.on(EV, h); adv.showRewarded(); } catch { resolve(false); }
    });
  }
}
