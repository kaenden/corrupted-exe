import { GameState } from '../state/GameState.js';

// Procedural Web Audio sound (GDD §13b) — synthesizes neon/synth-style SFX + a light ambient
// music bed from oscillators, so the game has sound WITHOUT shipping any audio asset files.
// Falls back to silence if the browser only has HTML5 audio (no AudioContext).
export const SoundSystem = {
  game: null,
  ctx: null,
  unlocked: false,
  sfxGain: null,
  musicGain: null,
  _musicOn: false,
  _musicTimer: null,
  _musicKey: null,

  init(scene) {
    this.game = scene.game;
    // Window-level (not scene-level): BootScene transitions away before it ever gets a gesture,
    // so a scene listener would never fire and the AudioContext would stay suspended (silent).
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  },

  unlock() {
    if (this.unlocked || this._unlocking) return;
    const ctx = this.game?.sound?.context;
    if (!ctx) return; // NoAudio fallback → silent
    this.ctx = ctx;
    this._unlocking = true;
    const finish = () => {
      this._unlocking = false;
      if (this.unlocked) return;
      this.sfxGain = ctx.createGain(); this.sfxGain.gain.value = 0.5; this.sfxGain.connect(ctx.destination);
      this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0; this.musicGain.connect(ctx.destination);
      this.unlocked = true;
      this.applySettings();
      if (this._musicKey) this.playMusic(this._musicKey);
    };
    // Resume must complete before we route nodes, or the first sounds fire into a dead context.
    if (ctx.state === 'suspended') ctx.resume().then(finish).catch(finish);
    else finish();
  },

  // One oscillator note with an attack/decay envelope.
  _tone(freqStart, freqEnd, dur, type, vol, dest) {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freqStart, t);
    if (freqEnd && freqEnd !== freqStart) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.03);
  },

  _noise(dur, vol) {
    const ctx = this.ctx; if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(g).connect(this.sfxGain); src.start();
  },

  play(key) {
    if (!this.unlocked || !this.ctx || !GameState.getSetting('soundEnabled')) return;
    switch (key) {
      case 'sfx_jump':   this._tone(300, 620, 0.12, 'square', 0.16); break;
      case 'sfx_death':  this._tone(420, 60, 0.32, 'sawtooth', 0.20); this._noise(0.18, 0.10); break;
      case 'sfx_win':    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, f, 0.16, 'triangle', 0.15), i * 90)); break;
      case 'sfx_shard':  this._tone(1200, 1700, 0.09, 'sine', 0.15); break;
      case 'sfx_portal': this._tone(520, 780, 0.18, 'sine', 0.15); this._tone(780, 520, 0.18, 'sine', 0.08); break;
      case 'sfx_click':  this._tone(440, 440, 0.05, 'square', 0.10); break;
      case 'sfx_alarm':  this._tone(960, 760, 0.07, 'square', 0.13); break;
      default: break;
    }
  },

  playMusic(key) {
    if (this._musicKey === key && this._musicOn) return;
    this._musicKey = key;
    if (!this.unlocked || !this.ctx) return;
    this._stopMusic();
    if (!GameState.getSetting('musicEnabled')) return;
    const root = key === 'mus_beta' ? 110 : key === 'mus_menu' ? 87 : 98; // A2 / F2 / G2
    const scale = [0, 3, 5, 7, 10]; // minor pentatonic
    this._musicOn = true;
    let step = 0;
    const beat = () => {
      if (!this._musicOn) return;
      this._tone(root, root, 0.5, 'sine', 0.5, this.musicGain);
      const semi = scale[(step * 2) % scale.length];
      this._tone(root * 4 * Math.pow(2, semi / 12), 0, 0.22, 'triangle', 0.22, this.musicGain);
      step++;
      this._musicTimer = setTimeout(beat, 420);
    };
    beat();
  },

  _stopMusic() {
    this._musicOn = false;
    if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; }
  },

  muteForAd(on) {
    if (!this.ctx) return;
    this.sfxGain.gain.value = on ? 0 : 0.5;
    this.musicGain.gain.value = on ? 0 : (GameState.getSetting('musicEnabled') ? 0.14 : 0);
  },

  pauseForMenu() {},
  resumeFromMenu() {},

  applySettings() {
    if (!this.ctx) return;
    this.musicGain.gain.value = GameState.getSetting('musicEnabled') ? 0.14 : 0;
    if (!GameState.getSetting('musicEnabled')) this._stopMusic();
    else if (this._musicKey && !this._musicOn) this.playMusic(this._musicKey);
  },
};
