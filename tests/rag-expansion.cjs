const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
 const page=await browser.newPage({viewport:{width:1280,height:960},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766');
 await page.evaluate(()=>document.querySelectorAll('#start details').forEach(d=>d.open=true));
 for(const [five,total,basic] of [[true,72,24],[false,36,12]]){
  await page.locator(five?'#fiveLaunch':'#thinkingLaunch').click();
  await page.locator('#thinkCollection').selectOption('rag');
  assert.equal(await page.evaluate(()=>thinkingPool().length),total);
  assert.match(await page.locator('#thinkCollection option:checked').textContent(),new RegExp(`${total}問`));
  await page.locator('#thinkSubject').selectOption('生物基礎');
  assert.equal(await page.evaluate(()=>thinkingPool().length),basic);
  await page.locator('#thinkSubject').selectOption('生物');
  assert.equal(await page.evaluate(()=>thinkingPool().length),total-basic);
  await page.locator('#thinkSubject').selectOption('all');
  if(five){
   await page.locator('#fiveFamily').selectOption('knowledge');assert.equal(await page.evaluate(()=>thinkingPool().length),36);
   await page.locator('#fiveFamily').selectOption('all');
   assert.equal(await page.locator('#thinkCollection option[value="entrance-2026-09"]').evaluate(o=>o.disabled&&o.hidden),true);
  }
  await page.locator('#thinkBegin').click();
  assert.equal(await page.evaluate(()=>T.items.every(q=>q.collection==='rag')),true);
  if(!five)await page.locator('#thinkRevealChoices').click();
  assert.equal(await page.locator('#thinkFeedback .thinking-sources').count(),0);
  const correct=await page.evaluate(()=>T.order.indexOf(T.items[0].answer));
  await page.locator('#thinkChoices button').nth(correct).click();
  if(five)await page.locator('#thinkConfirm').click();
  assert.equal(await page.evaluate(()=>T.review[0].ok),true);
  await page.locator('#thinkFeedback .thinking-sources summary').click();
  assert.match(await page.locator('#thinkFeedback .thinking-sources').textContent(),/C\d+/);
  assert.equal(await page.locator('#thinkFeedback .thinking-sources a').count(),0);
  assert.doesNotMatch(await page.locator('#thinkFeedback').innerHTML(),/href="undefined"|\/Users\/|\/Volumes\//);
  await page.locator('#thinkStop').click();await page.locator('#thinkBack').click();
  await page.evaluate(()=>document.querySelectorAll('#start details').forEach(d=>d.open=true));
 }
 // All sources resolve; existing web citations stay clickable. Check escaping as well.
 assert.equal(await page.evaluate(()=>[...THINKING,...FIVE].filter(q=>q.sourcePack==='rag-20261030').every(q=>thinkingSourceNotes(q).includes('C'))),true);
 assert.ok(await page.evaluate(()=>thinkingSourceNotes(FIVE.find(q=>q.id==='fk01')).includes('href="https://')));
 assert.equal(await page.evaluate(()=>{FIVE_SOURCES.__test={title:'<unsafe>',url:'javascript:alert(1)'};const s=thinkingSourceNotes({sources:['__test']});delete FIVE_SOURCES.__test;return s.includes('&lt;unsafe&gt;')&&!s.includes('href=');}),true);
 // Representative graph/table and feedback on a small screen.
 for(const [id,width] of [['rag26t002',390],['rag26t035',390],['rag26t008',1280]]){
  await page.setViewportSize({width,height:900});
  await page.evaluate(id=>{T=null;launchThinkingMode(false);beginThinking([THINKING.find(q=>q.id===id)]);},id);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`/tmp/${id}-${width}.png`,fullPage:true});
  await page.locator('#thinkRevealChoices').click();
  await page.locator('#thinkChoices button').nth(await page.evaluate(()=>T.order.indexOf(T.items[0].answer))).click();
  await page.locator('#thinkFeedback .thinking-sources summary').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`/tmp/${id}-${width}-feedback.png`,fullPage:true});
  await page.locator('#thinkNext').click();
 }
 // New IDs persist as review items without touching legacy records.
 await page.evaluate(()=>{thinkingHistory={g1:{ok:true,attempts:1},rag26t002:{ok:false,uncertain:false,attempts:1}};localStorage.setItem(THINK_KEY,JSON.stringify(thinkingHistory));});
 await page.reload();await page.evaluate(()=>{launchThinkingMode(false);$('thinkCollection').value='rag';$('thinkMistakes').checked=true;thinkingSetup()});
 assert.deepEqual(await page.evaluate(()=>thinkingPool().map(q=>q.id)),['rag26t002']);
 assert.equal(await page.evaluate(()=>thinkingHistory.g1.ok),true);
 assert.deepEqual(errors,[]);await browser.close();
 console.log('PASS RAG filters, 108 source notes, safe links, actual answers, mobile graphs/tables, review persistence');
})().catch(e=>{console.error(e);process.exit(1)});
