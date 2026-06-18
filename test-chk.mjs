import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1280,height:720} })).newPage();
await p.goto('https://kaenden.github.io/corrupted-exe/',{waitUntil:'load'});
await p.waitForFunction(()=>window.game?.scene?.isActive('MenuScene'),undefined,{timeout:20000});
console.log('SCENES '+JSON.stringify(await p.evaluate(()=>({esc:!!window.game.scene.getScene('EscapeScene'),over:!!window.game.scene.getScene('EscapeOverScene')}))));
await b.close();
