import Phaser from 'phaser';
import { hdCamera, buildTouchControls } from '../ui/widgets.js';

// Static overlay that hosts the on-screen touch controls for scenes whose own camera FOLLOWS the
// player (e.g. EscapeScene) — those can't host screen-fixed controls directly (pointer coords scroll
// with the camera). Launched in parallel; writes to the gameplay scene's shared `input` object.
export class ControlsScene extends Phaser.Scene {
  constructor() { super('ControlsScene'); }
  init(data) { this._input = data.input; this._hasGhost = !!data.hasGhost; this._gameKey = data.gameKey || null; }
  create() {
    hdCamera(this);
    buildTouchControls(this, this._input, { hasGhost: this._hasGhost, gameKey: this._gameKey });
  }
}
