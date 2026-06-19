import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:720}, hasTouch:true })).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('https://kaenden.github.io/corrupted-exe/',{waitUntil:'load'});
await p.waitForFunction(()=>window.game?.scene?.isActive('MenuScene'),undefined,{timeout:20000});
await p.touchscreen.tap(640,360); await p.waitForTimeout(300);
await p.evaluate(()=>window.game.scene.start('GameScene',{world:'alpha',levelIndex:17}));
await p.waitForTimeout(1500);
const init=await p.evaluate(()=>{const g=window.game.scene.getScene('GameScene');return{code:g.levelData.code,accel:g.chaseAccel,bugs:g.bugs.length,keys:g.bkeys.length};});
console.log('INIT '+JSON.stringify(init));
// accel: advance the wall and check speed grows
const acc=await p.evaluate(()=>{const g=window.game.scene.getScene('GameScene');g._chaseT=2000;const s0=g.chaseSpeed;g._updateChase(1000);return{s0:Math.round(s0),s1:Math.round(g.chaseSpeed)};});
console.log('ACCEL '+JSON.stringify(acc)+' grew='+(acc.s1>acc.s0));
// collect a bug → chaseSlowT>0
const bug=await p.evaluate(()=>{const g=window.game.scene.getScene('GameScene');g._collect(g.bugs[0],'bug');return{slowT:Math.round(g.chaseSlowT)};});
console.log('BUG '+JSON.stringify(bug)+' slowed='+(bug.slowT>0));
// collect all keys → keysThisLevel; then clean complete → bank
const res=await p.evaluate(()=>{const g=window.game.scene.getScene('GameScene');g.bkeys.forEach(k=>g._collect(k,'key'));const k=g._keysThisLevel;const before=(JSON.parse(localStorage.getItem("corrupted_exe_v1")).backdoor||{}).keys||0;g.deathCount=0;g.complete();const after=JSON.parse(localStorage.getItem("corrupted_exe_v1")).backdoor.keys;return{collected:k,before,after};});
console.log('KEYS '+JSON.stringify(res));
console.log('ERRORS '+(errs.length?errs.slice(0,4).join(' || '):'none'));
await b.close();
