import { chromium } from 'playwright';
const URL = 'https://kaenden.github.io/corrupted-exe/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.game?.scene?.isActive('MenuScene'), undefined, { timeout: 20000 });
await page.touchscreen.tap(640, 360);
await page.waitForTimeout(300);

// OUTRUN is alpha index 17
await page.evaluate(() => window.game.scene.start('GameScene', { world: 'alpha', levelIndex: 17 }));
await page.waitForTimeout(1200);
const init = await page.evaluate(() => {
  const gs = window.game.scene.getScene('GameScene');
  return { code: gs.levelData.code, hasWall: gs.chaseEdge != null, chaseX: Math.round(gs.chaseX), px: Math.round(gs.player.sprite.x) };
});
console.log('INIT ' + JSON.stringify(init));

// idle (player stands still) → wall should advance and catch → death
await page.waitForTimeout(3200);
const after = await page.evaluate(() => {
  const gs = window.game.scene.getScene('GameScene');
  return { chaseX: Math.round(gs.chaseX), deaths: gs.deathCount, t: Math.round(gs._chaseT||0), active: window.game.scene.isActive("GameScene") };
});
console.log('AFTER IDLE ' + JSON.stringify(after));
console.log('WALL_ADVANCED ' + (after.chaseX > init.chaseX) + '  CAUGHT(deaths>0) ' + (after.deaths > 0));
console.log('ERRORS ' + (errs.length ? errs.slice(0, 5).join(' || ') : 'none'));
await browser.close();
