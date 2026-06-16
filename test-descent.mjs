import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:4173/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR:' + (e.stack || e.message)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('ERR:' + m.text()); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.game?.scene?.isActive('MenuScene'), { timeout: 15000 });
await page.waitForTimeout(300);

const keys = () => page.evaluate(() => window.game.scene.getScenes(true).map((s) => s.scene.key).join(','));
const sleep = (ms) => page.waitForTimeout(ms);
const startRoom = () => page.evaluate(() => {
  const r = window.RunState; const room = r.currentRoom();
  window.game.scene.start('GameScene', { world: room.world, levelIndex: room.levelIndex, run: true });
});
const rs = (k) => page.evaluate((kk) => window.RunState[kk], k);

// reset meta keys for a clean assertion
await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('corrupted_exe_v1') || '{}'); });

await page.evaluate(() => window.RunState.start());
await startRoom();
await sleep(1500);
console.log('ROOM1 ' + JSON.stringify(await page.evaluate(() => {
  const gs = window.game.scene.getScene('GameScene'); const r = window.RunState;
  return { runMode: gs.runMode, integ: r.integrity, max: r.maxIntegrity, idx: r.index, rooms: r.rooms.length, hud: window.game.scene.getScene('UIScene').runMode };
})));

// fresh complete → BoonDraftScene, idx=1, keys gained
await page.evaluate(() => window.game.scene.getScene('GameScene').complete());
await sleep(700);
console.log('COMPLETE idx=' + (await rs('index')) + ' keys=' + (await rs('keys')) + ' scenes=' + (await keys()));

// take a boon then next room
await page.evaluate(() => window.RunState.addBoon({ id: 'maxint', apply: (r) => { r.maxIntegrity++; r.integrity++; } }));
await startRoom();
await sleep(1300);
console.log('ROOM2 integ=' + (await rs('integrity')) + '/' + (await rs('maxIntegrity')) + ' scenes=' + (await keys()));

// run-over: set keys, call _endRun directly → bank + RunOverScene
await page.evaluate(() => { window.RunState.keys = 7; window.game.scene.getScene('GameScene')._endRun(false); });
await sleep(800);
console.log('RUN OVER scenes=' + (await keys()));
const meta = await page.evaluate(() => JSON.parse(localStorage.getItem('corrupted_exe_v1')).descent);
console.log('META ' + JSON.stringify(meta) + ' summary=' + JSON.stringify(await rs('lastSummary')));
console.log('ERRORS ' + (errs.length ? errs.slice(0, 6).join(' || ') : 'none'));
await browser.close();
