const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch(),p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8766/');await p.locator('#thinkingLaunch').click();
 await p.locator('#thinkCollection').selectOption('entrance-2026-09');assert.equal(await p.evaluate(()=>thinkingPool().length),24);
 for(const [subject,n] of [['生物基礎',8],['生物',16]]){await p.locator('#thinkSubject').selectOption(subject);assert.equal(await p.evaluate(()=>thinkingPool().length),n);}
 await p.locator('#thinkKind').selectOption('graph');assert.equal(await p.locator('#thinkBegin').isDisabled(),true);assert.equal(await p.evaluate(()=>thinkingPool().length),0);await p.locator('#thinkKind').selectOption('all');await p.locator('#thinkSubject').selectOption('all');
 await p.locator('#thinkLength').selectOption('10');await p.locator('#thinkMode').selectOption('practice');assert.match(await p.locator('#thinkBegin').textContent(),/10問/);await p.screenshot({path:'/tmp/bio-entrance-setup.png',fullPage:true});await p.locator('#thinkBegin').click();
 assert.equal(await p.evaluate(()=>T.items.length),10);assert.equal(await p.evaluate(()=>T.items.every(q=>q.collection==='entrance-2026-09')),true);
 // Include the corrected two-material photoperiod experiment in a real 10-question run.
 await p.evaluate(()=>{T.items=[THINKING.find(q=>q.id==='a28'),...THINKING.filter(q=>q.collection==='entrance-2026-09'&&q.id!=='a28').slice(0,9)];loadThinking()});
 assert.equal(await p.locator('#thinkMaterial .thinking-material').count(),2);assert.match(await p.locator('#thinkMaterial').textContent(),/15時間50分/);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:'/tmp/bio-entrance-question.png',fullPage:true});
 for(let n=0;n<10;n++){
  const model=await p.evaluate(()=>T.items[T.index].recall.answer);assert.ok(!(await p.locator('#thinkFeedback').textContent()).includes(model));await p.locator('#thinkRevealChoices').click();
  if(n===0)await p.locator('#thinkUncertain').check();
  const indices=await p.evaluate(()=>thinkingAnswers(T.items[T.index]).map(a=>T.order.indexOf(a)));for(const i of indices)await p.locator('#thinkChoices button').nth(i).click();if(indices.length>1)await p.locator('#thinkConfirm').click();
  assert.doesNotMatch(await p.locator('#thinkFeedback').textContent(),/解答例|正解！/);await p.locator('#thinkNext').click();
 }
 assert.match(await p.locator('#thinkOutcome').textContent(),/10 \/ 10問正解/);assert.equal(await p.locator('#thinkReview section.thinking-recall').count(),10);assert.equal(await p.evaluate(()=>thinkingHistory.a28.uncertain),true);
 await p.locator('#thinkAgain').click();await p.locator('#thinkMistakes').check();assert.equal(await p.evaluate(()=>thinkingPool().length),1);assert.equal(await p.evaluate(()=>thinkingPool()[0].id),'a28');
 assert.deepEqual(errors,[]);await b.close();console.log('PASS entrance set: 24/8/16, empty filter, 10-question completion, delayed feedback, review, corrected photoperiod, mobile width');
})().catch(e=>{console.error(e);process.exit(1)});
