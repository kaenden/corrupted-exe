import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:720} })).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('https://kaenden.github.io/corrupted-exe/',{waitUntil:'load'});
await p.waitForFunction(()=>window.GameState?.data && window.game?.scene?.isActive('MenuScene'),undefined,{timeout:20000});
// LevelSelect
await p.evaluate(()=>{window.game.scene.stop('MenuScene');window.game.scene.start('LevelSelectScene',{world:'alpha'});});
await p.waitForTimeout(800); await p.screenshot({path:'f-levels.png'});
// pause panel in-game
await p.evaluate(()=>{window.game.scene.stop('LevelSelectScene');window.game.scene.start('GameScene',{world:'alpha',levelIndex:6});});
await p.waitForTimeout(1400);
await p.evaluate(()=>window.game.scene.getScene('UIScene')._togglePause());
await p.waitForTimeout(500); await p.screenshot({path:'f-pause.png'});
// shop card darkness
await p.evaluate(()=>{window.game.scene.stop('GameScene');window.game.scene.stop('UIScene');window.game.scene.start('ShopScene');});
await p.waitForTimeout(700); await p.screenshot({path:'f-shop.png'});
console.log('ERR '+(errs.length?errs.slice(0,3).join(' | '):'none'));
await b.close();
