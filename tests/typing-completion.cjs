const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'}),p=await browser.newPage();await p.goto('http://127.0.0.1:8766/');await p.evaluate(()=>document.querySelectorAll('#start details').forEach(e=>e.open=true));
 await p.clock.install();await p.clock.pauseAt(new Date());
 await p.locator('#startBtn').click();await p.locator('#typingInput').waitFor();
 for(const [term,reading,kind] of [['細胞','saibou','type'],['インスリン','insurinn','type'],['細胞','saibou','recall']]){
  await p.evaluate(({term,kind})=>{playMode=kind;G.recall=kind==='recall';G.queue=[WORDS.find(w=>w.t===term)];G.idx=0;loadWord()},{term,kind});
  await p.locator('#typingInput').pressSequentially(reading.slice(0,-1));
  assert.equal(await p.evaluate(()=>G.locked),false,'last character is still required');
  await p.locator('#typingInput').pressSequentially(reading.slice(-1));
  assert.equal(await p.evaluate(()=>G.locked),true,'last character completes the answer');
  assert.equal(await p.locator('#gRomaji .typed').textContent(),reading,'accepted final character must be rendered');
  assert.equal(await p.locator('#gRomaji .rest').textContent(),'','no pending characters after success');
  assert.equal(await p.locator('#gKana .cur, #gKana .todo, #gKana .mask').count(),0);
  assert.equal(await p.locator('#gBar').evaluate(el=>el.style.width),'100%');
  assert.equal(await p.locator('#wordNext').isVisible(),kind==='recall');
  if(kind==='type'){await p.clock.runFor(160);assert.equal(await p.evaluate(()=>G.locked),false);assert.equal(await p.locator('#typingInput').evaluate(e=>e===document.activeElement),true);}
 }
 await browser.close();console.log('PASS final character renders before input locks: typing, final nn, recall');
})().catch(e=>{console.error(e);process.exit(1)});
