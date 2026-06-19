import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:720} })).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('https://kaenden.github.io/corrupted-exe/',{waitUntil:'load'});
await p.waitForFunction(()=>window.GameState?.data && window.game?.scene?.isActive('MenuScene'),undefined,{timeout:20000});
for (const i of [3,4,5,6]) {
  await p.evaluate((idx)=>{['GameScene','UIScene'].forEach(k=>window.game.scene.stop(k));window.game.scene.start('GameScene',{world:'alpha',levelIndex:idx});},i);
  await p.waitForTimeout(700);
  const d=await p.evaluate(()=>{const g=window.game.scene.getScene('GameScene');return{code:g.levelData.code,w:g.levelData.bounds.width,plats:g.tricks.solids.length+g.tricks.fakes.length+g.tricks.moving.length};});
  console.log(`idx${i} ${JSON.stringify(d)}`);
}
console.log('ERR '+(errs.length?errs.slice(0,3).join(' | '):'none'));
await b.close();
