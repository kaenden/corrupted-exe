import { GameState } from '../state/GameState.js';

// Single audio bus (GDD §13b). Safe to call before any audio assets exist — play()
// no-ops when the key isn't cached, so the game runs silently until STEP 21 adds assets.
export const SoundSystem = {
  game: null,
  unlocked: false,
  _music: null,
  _musicKey: null,

  init(scene) {
    this.game = scene.game;
    // Web audio must start from a user gesture — unlock on the first input.
    scene.input.once('pointerdown', () => this.unlock());
    scene.input.keyboard?.once('keydown', () => this.unlock());
  },

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.game?.sound?.context?.state === 'suspended') this.game.sound.context.resume();
    this.applySettings();
  },

  _has(key) { return !!this.game && this.game.cache.audio.exists(key); },

  play(key) {
    if (!this.unlocked || !this._has(key)) return;
    if (!GameState.getSetting('soundEnabled')) return;
    this.game.sound.play(key);
  },

  playMusic(key) {
    if (this._musicKey === key) return;
    this._musicKey = key;
    this._music?.stop();
    if (!this._has(key) || !GameState.getSetting('musicEnabled')) { this._music = null; return; }
    this._music = this.game.sound.add(key, { loop: true, volume: 0.5 });
    if (this.unlocked) this._music.play();
  },

  muteForAd(on) { if (this.game) this.game.sound.mute = !!on; },

  pauseForMenu() { this._music?.pause?.(); },
  resumeFromMenu() { if (GameState.getSetting('musicEnabled')) this._music?.resume?.(); },

  applySettings() {
    if (!this.game) return;
    if (!GameState.getSetting('musicEnabled')) this._music?.pause?.();
    else if (this.unlocked) this._music?.resume?.();
  },
};
