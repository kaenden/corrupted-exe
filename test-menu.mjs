import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:720} })).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('https://kaenden.github.io/corrupted-exe/',{waitUntil:'load'});
await p.waitForFunction(()=>window.game?.scene?.isActive('MenuScene'),undefined,{timeout:20000});
await p.waitForTimeout(1500); // let buttons cascade in + sweep
const btns=await p.evaluate(()=>window.game.scene.getScene('MenuScene').children.list.filter(o=>o.type==='Text'&&['▶  CAMPAIGN','∞  ESCAPE','SHOP','SETTINGS'].includes(o.text)).map(o=>({t:o.text,a:Math.round(o.alpha)})));
console.log('BTNS '+JSON.stringify(btns));
await p.screenshot({path:'menu.png'});
console.log('ERR '+(errs.length?errs.slice(0,3).join(' | '):'none'));
await b.close();
