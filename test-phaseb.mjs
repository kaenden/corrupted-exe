import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:720}, hasTouch:true })).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('https://kaenden.github.io/corrupted-exe/',{waitUntil:'load'});
await p.waitForFunction(()=>window.GameState?.data && window.game?.scene?.isActive('MenuScene'),undefined,{timeout:20000});
// baseline OUTRUN with no upgrades
await p.evaluate(()=>{const g=window.GameState;g.data.backdoor.upgrades={speed:0,jump:0,slow:0,bug:0,platform:0,alarm:0,shield:0,keymult:0};g.save();});
await p.evaluate(()=>window.game.scene.start('GameScene',{world:'alpha',levelIndex:17}));
await p.waitForTimeout(1200);
const base=await p.evaluate(()=>{const g=window.game.scene.getScene('GameScene');return{speed:Math.round(g.player._speed),jump:Math.round(g.player._jumpV),bugMs:g._bugSlowMs,shield:!!g._shieldAvail,alarm:!!g._alarmOn,chaseBase:Math.round(g.chaseBaseSpeed)};});
console.log('BASE '+JSON.stringify(base));
// max upgrades
await p.evaluate(()=>{const g=window.GameState;g.data.backdoor.upgrades={speed:4,jump:4,slow:4,bug:4,platform:4,alarm:1,shield:1,keymult:3};g.save();});
await p.evaluate(()=>window.game.scene.start('GameScene',{world:'alpha',levelIndex:17}));
await p.waitForTimeout(1200);
const up=await p.evaluate(()=>{const g=window.game.scene.getScene('GameScene');return{speed:Math.round(g.player._speed),jump:Math.round(g.player._jumpV),bugMs:g._bugSlowMs,shield:!!g._shieldAvail,alarm:!!g._alarmOn,chaseBase:Math.round(g.chaseBaseSpeed)};});
console.log('MAXED '+JSON.stringify(up));
// shield: first death does not increment deathCount
const sh=await p.evaluate(()=>{const g=window.game.scene.getScene('GameScene');const d0=g.deathCount;g.die();const d1=g.deathCount;return{d0,d1,shieldLeft:!!g._shieldAvail};});
console.log('SHIELD '+JSON.stringify(sh)+' absorbed='+(sh.d1===sh.d0));
// backdoor shop scene loads
await p.evaluate(()=>window.game.scene.start('BackdoorScene'));
await p.waitForTimeout(500);
console.log('SHOP active='+await p.evaluate(()=>window.game.scene.isActive('BackdoorScene')));
console.log('ERRORS '+(errs.length?errs.slice(0,4).join(' || '):'none'));
await b.close();
