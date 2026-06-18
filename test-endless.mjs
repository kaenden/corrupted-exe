import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:720} })).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('https://kaenden.github.io/corrupted-exe/',{waitUntil:'load'});
await p.waitForFunction(()=>window.GameState?.data && window.game?.scene?.isActive('MenuScene'),undefined,{timeout:20000});
await p.evaluate(()=>{window.game.scene.stop('MenuScene');window.game.scene.start('EscapeScene');});
await p.waitForTimeout(1200);
const init=await p.evaluate(()=>{const e=window.game.scene.getScene('EscapeScene');return{active:window.game.scene.isActive('EscapeScene'),hasPlayer:!!e.player?.sprite,plats:e.platforms.getChildren().length,gates:e.gates.length,wall:e.wallX!=null};});
console.log('INIT '+JSON.stringify(init));
// drive player right + jump to advance, watch score + wall
await p.evaluate(()=>{const e=window.game.scene.getScene('EscapeScene');e._mobile={left:false,right:true,jump:false,jumpJustPressed:false};});
await p.waitForTimeout(2500);
const run=await p.evaluate(()=>{const e=window.game.scene.getScene('EscapeScene');return{px:Math.round(e.player.sprite.x),score:e.score,wallX:Math.round(e.wallX),banked:e.banked,dead:e.dead,plats:e.platforms.getChildren().length};});
console.log('RUN '+JSON.stringify(run));
// force a bank: move player onto a gate + overlap
const bank=await p.evaluate(()=>{const e=window.game.scene.getScene('EscapeScene');const g=e.gates.find(x=>!x.banked);if(!g)return'nogate';e.player.sprite.x=g.x;e.player.sprite.body.x=g.x;e.player.sprite.y=g.img.y-20;e._bank(g);return{banked:e.banked};});
console.log('BANK '+JSON.stringify(bank));
// force death → over scene
await p.evaluate(()=>{const e=window.game.scene.getScene('EscapeScene');e._die();});
await p.waitForTimeout(1000);
const over=await p.evaluate(()=>({over:window.game.scene.isActive('EscapeOverScene'),hs:window.GameState.data.backdoor.highScore,keys:window.GameState.data.backdoor.keys}));
console.log('OVER '+JSON.stringify(over));
await p.screenshot({path:'endless.png'});
console.log('ERRORS '+(errs.length?errs.slice(0,4).join(' || '):'none'));
await b.close();
