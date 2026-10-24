const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'}),p=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8766/');await p.evaluate(()=>document.querySelectorAll('#start details').forEach(e=>e.open=true));
 assert.equal(await p.locator('#dailyCount').textContent(),'0');assert.equal(await p.locator('#fiveWeakStart').isDisabled(),true);
 // A copied term is offered as unaided recall, not treated as mastered.
 await p.evaluate(()=>{LEARNING=Learning.record({},'細胞','type',{ok:true});localStorage.setItem(LEARNING_KEY,JSON.stringify(LEARNING));refreshStudyNavigator()});
 assert.match(await p.locator('#nextStudyAction').textContent(),/記述/);
 await p.locator('#nextStudyAction').click();assert.equal(await p.evaluate(()=>G.recall),true);assert.deepEqual(await p.evaluate(()=>G.queue.map(w=>w.t)),['細胞']);
 await p.locator('#typingInput').pressSequentially('saibou');await p.keyboard.press('Enter');assert.equal(await p.locator('#result').isVisible(),true);
 await p.locator('#menuBtn').click();assert.equal(await p.locator('#dailyCount').textContent(),'1','same term in different lanes counts once');
 await p.locator('#dailyGoal').selectOption('20');await p.reload();await p.evaluate(()=>document.querySelectorAll('#start details').forEach(e=>e.open=true));assert.equal(await p.locator('#dailyGoal').inputValue(),'20');assert.equal(await p.locator('#dailyCount').textContent(),'1');
 await p.evaluate(()=>{
  const w=WORDS.find(w=>w.unit==='B2b'&&QUIZ_CHOICES[w.t]);LEARNING=Learning.record(LEARNING,w.t,'quiz',{ok:false});
  thinkingHistory={g1:{ok:false,attempts:1},fa01:{ok:false,uncertain:false,attempts:1,last:Date.now()}};
  localStorage.setItem(THINK_KEY,JSON.stringify(thinkingHistory));refreshStudyNavigator();
 });
 assert.equal(await p.locator('#dailyCount').textContent(),'3','legacy undated question excluded from today');
 assert.match(await p.locator('#nextStudyAction').textContent(),/4択で復習/);
 await p.locator('#learnSubject').selectOption('生物');assert.doesNotMatch(await p.locator('#nextStudyAction').textContent(),/4択で復習/,'respect selected subject');
 await p.locator('#learnSubject').selectOption('all');
 await p.locator('#fiveWeakStart').click();assert.equal(await p.evaluate(()=>T.mode),'learn');assert.deepEqual(await p.evaluate(()=>T.items.map(q=>q.id)),['fa01']);
 await p.locator('#thinkMemo').fill('根拠');await p.locator('#thinkMemo').press('Enter');assert.equal(await p.evaluate(()=>T.locked),false,'Enter in notes is not submit');
 const number=await p.evaluate(()=>T.order.indexOf(T.items[0].answer)+1);
 await p.locator('#thinkQuestionTitle').focus();await p.keyboard.press(String(number));await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>T.locked),true);assert.equal(await p.evaluate(()=>T.review.length),1);
 await p.locator('#thinkFeedback').dispatchEvent('keydown',{key:'Enter',repeat:true,bubbles:true});assert.equal(await p.locator('#thinkResult').isVisible(),false);
 await p.keyboard.press('Enter');assert.equal(await p.locator('#thinkResult').isVisible(),true);await p.locator('#thinkBack').click();assert.equal(await p.locator('#fiveWeakStart').isDisabled(),true);
 assert.equal(await p.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(12,0,0,0);return studyNavigatorState(d.getTime()).done}),0,'day boundary resets unique count');
 await p.reload();await p.evaluate(()=>document.querySelectorAll('#start details').forEach(e=>e.open=true));assert.equal(await p.locator('#fiveWeakStart').isDisabled(),true);assert.equal(await p.locator('#thinkingWeakStart').isDisabled(),false,'undated legacy mistakes remain reviewable');
 await p.locator('#dailyGoal').selectOption('30');
 await p.locator('.study-navigator').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.screenshot({path:'/tmp/study-navigator-desktop.png'});
 await p.setViewportSize({width:390,height:844});await p.locator('.study-navigator').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:'/tmp/study-navigator-mobile.png'});
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS study navigation: transfer to recall, scoped due review, unique daily count, rollover, goal persistence, legacy history, weak drill, Enter/notes/repeat protection, mobile');
})().catch(e=>{console.error(e);process.exit(1)});
