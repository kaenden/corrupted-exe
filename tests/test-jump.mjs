import { chromium } from 'playwright';

const URL = 'http://localhost:4173/';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 }, // landscape phone
  hasTouch: true, isMobile: true, deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(m.type() + ':' + m.text()));
page.on('pageerror', (e) => logs.push('PAGEERROR:' + e.message));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1500);

// first tap (unlock audio etc.)
await page.touchscreen.tap(422, 195);
await page.waitForTimeout(400);

// jump straight into alpha level 1 via the exposed game
await page.evaluate(() => {
  const g = window.game;
  g.scene.getScenes(true).forEach((s) => {
    const k = s.scene.key;
    if (k !== 'GameScene' && k !== 'UIScene') g.scene.stop(k);
  });
  g.scene.start('GameScene', { world: 'alpha', levelIndex: 0 });
});
await page.waitForTimeout(2200);

const before = await page.evaluate(() => {
  const gs = window.game.scene.getScene('GameScene');
  const ui = window.game.scene.getScene('UIScene');
  const b = gs?.player?.sprite?.body;
  return {
    gsActive: window.game.scene.isActive('GameScene'),
    uiActive: window.game.scene.isActive('UIScene'),
    hasPlayer: !!gs?.player,
    onFloor: b ? (b.blocked.down || b.touching.down) : null,
    vy: b ? Math.round(b.velocity.y) : null,
    py: gs?.player ? Math.round(gs.player.sprite.y) : null,
    mobile: ui ? { ...ui.mobileInput } : null,
    pointers: window.game.input.pointers ? window.game.input.pointers.length : null,
  };
});
console.log('BEFORE ' + JSON.stringify(before));

// tap bottom-right = jump region
const vp = page.viewportSize();
await page.touchscreen.tap(Math.round(vp.width * 0.82), Math.round(vp.height * 0.8));
await page.waitForTimeout(100);
const after = await page.evaluate(() => {
  const gs = window.game.scene.getScene('GameScene');
  const ui = window.game.scene.getScene('UIScene');
  const b = gs.player.sprite.body;
  return { vy: Math.round(b.velocity.y), py: Math.round(gs.player.sprite.y), mobile: { ...ui.mobileInput } };
});
console.log('AFTER_TAP ' + JSON.stringify(after));

const jumped = after.vy < -100 || after.py < before.py - 5;
console.log('JUMPED: ' + jumped);
console.log('LOGS ' + logs.slice(-12).join(' || '));
await browser.close();
