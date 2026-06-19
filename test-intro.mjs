import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:720} })).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('https://kaenden.github.io/corrupted-exe/',{waitUntil:'load'});
await p.waitForFunction(()=>window.game?.scene?.isActive('MenuScene'),undefined,{timeout:20000});
await p.waitForTimeout(700);
await p.screenshot({path:'curtain.png'});  // curtain + loading
// wait for reveal (title alpha animates up)
await p.waitForFunction(()=>{const m=window.game.scene.getScene('MenuScene');return m.title && m.title.alpha>0.8;},undefined,{timeout:30000});
await p.waitForTimeout(900); // let ticker type a bit
await p.screenshot({path:'menu.png'});
const tick=await p.evaluate(()=>window.game.scene.getScene('MenuScene')._ticker.text);
console.log('TICKER "'+tick+'"');
// wall warning on a chase level
await p.evaluate(()=>{window.game.scene.stop('MenuScene');window.game.scene.start('GameScene',{world:'alpha',levelIndex:6});});
await p.waitForTimeout(900);
const warn=await p.evaluate(()=>{const g=window.game.scene.getScene('GameScene');const ws=g.children.list.filter(o=>o.type==='Text'&&o.text&&o.text.includes('BREACH'));return ws.length;});
console.log('BREACH_TEXTS '+warn);
await p.screenshot({path:'warn.png'});
console.log('ERR '+(errs.length?errs.slice(0,3).join(' | '):'none'));
await b.close();
