// Gameplay recorder for CrazyGames preview videos. Runs the DEV build (window.game exposed),
// neutralizes death so footage is continuous, drives the player (hold-right + rhythmic jump),
// and records the canvas. Usage: node tools/rec.mjs <escape|campaign> <seconds>
import { chromium } from 'playwright';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const MODE = process.argv[2] || 'escape';
const SECS = Number(process.argv[3] || 30);
const OUT = 'tools/vid-raw';

const b = await chromium.launch({
  headless: false,
  args: ['--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } } });
// force non-touch so the on-screen joystick/JUMP controls never build (this PC may be a touchscreen)
await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0, configurable: true }); } catch {} });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.game && window.GameState, { timeout: 20000 });
await p.evaluate(() => { try { localStorage.clear(); } catch {} window.GameState.data.settings.musicEnabled = false; window.GameState.data.settings.soundEnabled = false; });

// stop EVERY active scene except Boot (otherwise MenuScene renders ON TOP of gameplay), then start
await p.evaluate((mode) => {
  const g = window.game;
  g.scene.getScenes(true).forEach((x) => { if (x.scene.key !== 'BootScene') g.scene.stop(x.scene.key); });
  if (mode === 'escape') g.scene.start('EscapeScene');
  else g.scene.start('GameScene', { world: 'alpha', levelIndex: Number(window.__lvl ?? 16) });
}, MODE);
await wait(1400);

// neutralize death + a fall-catch; the player can't game-over so footage stays continuous
await p.evaluate((mode) => {
  const g = window.game;
  const key = mode === 'escape' ? 'EscapeScene' : 'GameScene';
  const s = g.scene.getScene(key);
  if (mode === 'escape') { s._die = () => {}; }
  else {
    s.die = () => {};
    s._updateChase = () => {};                                          // disable the chase wall for clean campaign footage
    [s.chaseFill, s.chaseEdge, s.chaseParticles].forEach((o) => o?.setVisible?.(false));
  }
  // hide the DEV key hint (dev build only) across every active scene so it never shows in the clip
  g.scene.getScenes(true).forEach((sc) => sc.children?.list?.forEach((o) => { if (o.text && /DEV[:\s]/.test(o.text)) o.setVisible(false); }));
  window.__catch = setInterval(() => {
    const sc = g.scene.getScene(key); if (!sc || !sc.player || !sc.player.sprite) return;
    const sp = sc.player.sprite;
    // fell into a pit → drop back to floor level (lands and keeps running right, stays ahead of the wall)
    if (mode === 'escape') { if (sp.y > 560) { sp.y = 300; sp.body.setVelocityY(0); } }
    else if (sp.y > 420) { sp.y = 360; sp.body.setVelocityY(0); }
    if (mode !== 'escape' && sc.finished) { window.__lvl = (Number(window.__lvl ?? 16) + 1); g.scene.start('GameScene', { world: 'alpha', levelIndex: window.__lvl }); }
  }, 100);
}, MODE);

await p.bringToFront();
if (MODE === 'escape') {
  // escape: natural keyboard run + rhythmic jump (procedural route is forgiving, looks great)
  await p.keyboard.down('ArrowRight');
  const t0 = Date.now();
  while (Date.now() - t0 < SECS * 1000) { await p.keyboard.down('Space'); await wait(90); await p.keyboard.up('Space'); await wait(Math.random() * 360 + 380); }
  await p.keyboard.up('ArrowRight');
} else {
  // campaign: kinematic glide (collisions+gravity off) hugging platform tops → always visible, smooth,
  // showcases level design/traps/keys/tear without auto-play falling into precision gaps. Cycles levels.
  await p.evaluate(() => {
    const g = window.game; const s = g.scene.getScene('GameScene');
    const sp = s.player.sprite; sp.body.setAllowGravity(false); sp.body.checkCollision.none = true;
    window.__glide = setInterval(() => {
      const sc = g.scene.getScene('GameScene'); if (!sc?.player?.sprite) return;
      const q = sc.player.sprite;
      if (q.x > (sc.levelData.bounds.width - 70)) {                      // reached the exit → next level
        window.__lvl = Number(window.__lvl ?? 16) + 1; if (window.__lvl > 24) window.__lvl = 16;
        g.scene.start('GameScene', { world: 'alpha', levelIndex: window.__lvl });
        g.scene.getScenes(true).forEach((x) => { if (!['GameScene', 'BootScene', 'UIScene'].includes(x.scene.key)) g.scene.stop(x.scene.key); });
        setTimeout(() => { const ns = g.scene.getScene('GameScene'); if (ns?.player?.sprite) { ns.die = () => {}; ns._updateChase = () => {}; [ns.chaseFill, ns.chaseEdge, ns.chaseParticles].forEach((o) => o?.setVisible?.(false)); ns.player.sprite.body.setAllowGravity(false); ns.player.sprite.body.checkCollision.none = true; }
          g.scene.getScenes(true).forEach((sc) => sc.children?.list?.forEach((o) => { if (o.text && /DEV[:\s]/.test(o.text)) o.setVisible(false); })); }, 200);
        return;
      }
      q.x += 6;                                                         // advance right (~180 px/s)
      let top = null;
      for (const o of [...(sc.tricks.solids || []), ...(sc.tricks.moving || [])]) {
        const b = o.getBounds(); if (q.x > b.left - 12 && q.x < b.right + 12 && b.top > q.y - 44) { if (top == null || b.top < top) top = b.top; }
      }
      const targetY = (top != null ? top : 378) - 13;
      q.y += (targetY - q.y) * 0.22;                                    // glide onto platform tops
      q.body.setVelocity(0, 0);
    }, 33);
  });
  await wait(SECS * 1000);
  await p.evaluate(() => clearInterval(window.__glide));
}

await p.evaluate(() => clearInterval(window.__catch));
console.log('errors:', errs.length, errs.slice(0, 3));
await ctx.close(); await b.close();
console.log('recorded ->', OUT);
