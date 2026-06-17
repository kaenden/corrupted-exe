import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:720}, hasTouch:true })).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('https://kaenden.github.io/corrupted-exe/',{waitUntil:'load'});
await p.waitForFunction(()=>window.GameState?.data && window.game?.scene?.isActive('MenuScene'),undefined,{timeout:20000});
await p.evaluate(()=>{window.game.scene.stop('MenuScene');window.game.scene.start('GameScene',{world:'alpha',levelIndex:0});});
await p.waitForTimeout(1200);
// bring the wall close to the player → red vignette should rise
const chk=await p.evaluate(()=>{const g=window.game.scene.getScene('GameScene');
  g.player.sprite.x=520; g.player.sprite.body.x=520; g._chaseT=6000; g.chaseX=470; g._wallProx=1;
  const ui=window.game.scene.getScene('UIScene');
  return {hasVignette:!!ui.vignette, wallProx:g._wallProx, texExists:window.game.textures.exists('vignette')};});
console.log('VFX '+JSON.stringify(chk));
await p.waitForTimeout(1400); // let vignette lerp up + motes spawn
await p.screenshot({ path: 'vfx.png' });
const a=await p.evaluate(()=>Math.round((window.game.scene.getScene('UIScene').vignette?.alpha||0)*100)/100);
console.log('VIGNETTE_ALPHA '+a);
console.log('ERRORS '+(errs.length?errs.slice(0,4).join(' || '):'none'));
await b.close();
