const{chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch(),p=await b.newPage();await p.goto('http://127.0.0.1:8766');
// A fixed session must survive exhausting the live new/due pool.
await p.evaluate(()=>{playMode='quiz';mode={type:'count',val:15};$('learnFocus').value='new';beginQuiz();G.queue=[G.cur];G.idx=0;answerQuiz(G.choices.findIndex(w=>w.t===G.cur.t));clearTimeout(G.nextId);$('learnUnit').value=G.cur.unit;LEARNING=Object.fromEntries(WORDS.map(w=>[w.t,{quiz:{attempts:1,successes:1,stage:1,due:Date.now()+86400000,last:Date.now(),lastOk:true}}]));loadQuestion();});
assert.equal(await p.evaluate(()=>!!G.cur),true);await p.evaluate(()=>endGame());
// Revealing one answer still consumes one of a fifteen-question session.
await p.evaluate(()=>{LEARNING={};$('learnUnit').value='all';$('learnFocus').value='all';playMode='recall';mode={type:'count',val:15};show('game');beginRecall();$('revealAnswer').click();$('wordNext').click();for(let i=0;i<14;i++){G.ui=G.units.length;wordCleared();}});
assert.equal(await p.evaluate(()=>G.running),false);assert.equal(await p.evaluate(()=>G.review.length),15);
await p.evaluate(()=>{playMode='recall';mode={type:'learn',val:10};show('game');beginRecall();});await p.locator('#typingInput').focus();await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>G.hinted),false);
await p.evaluate(()=>endGame());
const grade=await p.evaluate(()=>performanceGrade({done:10,miss:0,review:Array.from({length:10},()=>({ok:true,uncertain:true}))},'quiz',true,100));assert.notEqual(grade,'SS');
assert.equal(await p.locator('#nameInput').count(),0);
await b.close();console.log('PASS edge cases: exhausted live pools, revealed answer counts, keyboard hints, confidence grade, browser-only UI');
})().catch(e=>{console.error(e);process.exit(1)});
