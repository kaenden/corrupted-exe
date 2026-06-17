import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:720}, hasTouch:true })).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('https://kaenden.github.io/corrupted-exe/',{waitUntil:'load'});
await p.waitForFunction(()=>window.GameState?.data && window.game?.scene?.isActive('MenuScene'),undefined,{timeout:20000});
await p.evaluate(()=>{window.GameState.data.backdoor.upgrades={speed:0,jump:0,slow:0,bug:0,platform:0,alarm:0,shield:0,keymult:0};window.GameState.save();});
async function check(world,idx){
  await p.evaluate(([w,i])=>window.game.scene.start('GameScene',{world:w,levelIndex:i}),[world,idx]);
  await p.waitForTimeout(900);
  return await p.evaluate(()=>{const g=window.game.scene.getScene('GameScene');
    // eff speed at exit (progress=1)
    const effExit=Math.round(g.chaseBaseSpeed*(1+g.chaseRush));
    return {code:g.levelData.code,wall:g.chaseEdge!=null,base:Math.round(g.chaseBaseSpeed),rush:g.chaseRush,effExit};});
}
console.log('ALPHA 0  (tier0)      '+JSON.stringify(await check('alpha',0)));
console.log('ALPHA 10 (tier1)      '+JSON.stringify(await check('alpha',10)));
console.log('ALPHA 29 (tier2)      '+JSON.stringify(await check('alpha',29)));
console.log('BETA 0   (tier0+world)'+JSON.stringify(await check('beta',0)));
console.log('ERRORS '+(errs.length?errs.slice(0,4).join(' || '):'none'));
await b.close();
