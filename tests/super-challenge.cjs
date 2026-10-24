const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'}),p=await b.newPage({viewport:{width:1366,height:1000},reducedMotion:'reduce'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8766/');
 assert.deepEqual(await p.evaluate(()=>Object.fromEntries(Object.keys(SUPER_SUBJECTS).map(c=>[c,superStats(c).phases.map(p=>p.items.length)]))),{basic:[243,213,243,50,49],advanced:[616,565,616,58,49]});
 assert.equal(await p.evaluate(()=>superStats('basic').total),798);assert.equal(await p.evaluate(()=>superStats('advanced').total),1904);
 await p.locator('a[href="#superChallenge"]').click();await p.screenshot({path:'/tmp/super-challenge-desktop.png'});
 // Normal study records do not falsely complete the exhaustive course.
 await p.locator('#quickTypeStart').click();const text=await p.evaluate(()=>G.units.map((u,i)=>canonical(G.units,i,'')).join(''));await p.locator('#typingInput').pressSequentially(text);await p.waitForFunction(()=>G.done===1);await p.locator('#game .finish-run').click();await p.locator('#menuBtn').click();assert.equal(await p.evaluate(()=>superStats('basic').done),0);
 // Existing subject/category/focus filters must not restrict the exhaustive queue.
 await p.locator('#learnSubject').selectOption('生物');await p.locator('#learnUnit').selectOption('A2a');await p.locator('#learnFocus').selectOption('due');
 await p.locator('#super-basic .super-start').click();assert.equal(await p.evaluate(()=>G.targetCount),243);assert.equal(await p.evaluate(()=>G.queue.every(w=>w.unit==='P'||w.unit.startsWith('B'))),true);
 const answered=await p.evaluate(()=>G.cur.t);await p.locator('#typingInput').pressSequentially(await p.evaluate(()=>G.units.map((u,i)=>canonical(G.units,i,'')).join('')));await p.waitForFunction(()=>superStats('basic').done===1);
 await p.locator('#superPause').click();assert.match(await p.locator('#superResult').textContent(),/残り 797問/);await p.reload();
 await p.locator('#super-basic .super-start').click();assert.equal(await p.evaluate(()=>G.targetCount),242);assert.equal(await p.evaluate(t=>G.queue.some(w=>w.t===t),answered),false);await p.locator('#superPause').click();
 // Finish each real engine queue, bypassing only physical keystrokes/animation delays.
 for(const course of ['basic','advanced']){
  for(const kind of ['type','quiz','recall','thinking','five']){
   const result=await p.evaluate(({course,kind})=>{
    startSuperChallenge(course,kind);const run=['thinking','five'].includes(kind)?T:G;
    const expected=superStats(course).phases.find(p=>p.kind===kind).left.length,seen=[];
    while(run.running){
     if(run===G){
      seen.push(G.cur.t);
      if(kind==='quiz'){const index=G.choices.findIndex(w=>w.t===G.cur.t);answerQuiz(index);nextLearningQuestion();}
      else {G.ui=G.units.length;wordCleared();if(kind==='type'){clearTimeout(G.nextId);if(G.done>=G.targetCount)endGame('complete');else loadWord();}else nextLearningQuestion();}
     }else{
      const q=T.items[T.index];seen.push(q.id);T.choicesRevealed=true;T.selected=thinkingAnswers(q).slice();
      $('thinkUncertain').checked=course==='basic'&&kind==='five'&&seen.length===1;submitThinking();$('thinkNext').click();
     }
     if(seen.length>2000)throw new Error('queue did not terminate');
    }
    return {expected,count:seen.length,unique:new Set(seen).size,left:superStats(course).phases.find(p=>p.kind===kind).left.length};
   },{course,kind});
   assert.equal(result.count,result.expected,course+' '+kind);assert.equal(result.unique,result.expected);assert.equal(result.left,0);
  }
  assert.equal(await p.evaluate(c=>superStats(c).left,course),0);console.log('PASS exhaustive course:',course);
 }
 assert.equal(await p.evaluate(()=>superStats('basic').done),798);assert.equal(await p.evaluate(()=>superStats('advanced').done),1904);assert.equal(await p.evaluate(()=>superStats('basic').weak),1);
 await p.evaluate(()=>show('start'));await p.locator('#super-basic').getByRole('button',{name:'要復習 1問を解き直す'}).click();assert.equal(await p.evaluate(()=>T.items.length),1);
 await p.evaluate(()=>{T.selected=thinkingAnswers(T.items[0]).slice();submitThinking();});await p.locator('#thinkNext').click();assert.equal(await p.evaluate(()=>superStats('basic').weak),0);assert.match(await p.locator('#superThinkResult').textContent(),/全798問/);
 await p.reload();assert.equal(await p.evaluate(()=>superStats('basic').done),798);assert.equal(await p.evaluate(()=>superStats('advanced').done),1904);
 await p.locator('#super-basic .super-new-round').click();assert.equal(await p.evaluate(()=>superStats('basic').done),0);assert.equal(await p.evaluate(()=>superProgress.basic.round),2);assert.equal(await p.evaluate(()=>superStats('advanced').done),1904);
 // Pausing without an answer leaves it pending, and a revealed answer remains weak.
 await p.locator('#super-basic button[data-kind="recall"]').click();assert.equal(await p.evaluate(()=>G.targetCount),243);await p.locator('#revealAnswer').click();assert.equal(await p.evaluate(()=>superStats('basic').weak),1);await p.locator('#superPause').click();await p.reload();
 assert.equal(await p.evaluate(()=>superStats('basic').done),1);await p.locator('#super-basic .super-start').click();assert.equal(await p.evaluate(()=>playMode),'recall');assert.equal(await p.evaluate(()=>G.targetCount),242);await p.locator('#superPause').click();
 // A usual 10-question round must not be linked to the previous super run.
 await p.locator('#menuBtn').click();await p.locator('#learnSubject').selectOption('all');await p.locator('#learnUnit').selectOption('all');await p.locator('#quickTypeStart').click();assert.equal(await p.evaluate(()=>G.targetCount),10);assert.equal(await p.locator('#superLive').isVisible(),false);await p.locator('#game .finish-run').click();assert.equal(await p.locator('#superResult').isVisible(),false);
 await p.locator('#menuBtn').click();await p.locator('#super-basic button[data-kind="five"]').click();await p.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('quota')};T.selected=thinkingAnswers(T.items[0]).slice();submitThinking();});assert.match(await p.locator('#superSaveStatus').textContent(),/保存できません/);await p.reload();assert.equal(await p.evaluate(()=>superStats('basic').done),1);
 await p.evaluate(()=>localStorage.setItem(SUPER_KEY,JSON.stringify({basic:{round:-8,lastKind:'not-a-mode',answers:{'type:unknown':{clean:true},'type:細胞':{clean:'yes'}}}})));await p.reload();assert.equal(await p.evaluate(()=>superStats('basic').done),0);assert.equal(await p.evaluate(()=>superProgress.basic.round),1);
 await p.setViewportSize({width:390,height:844});await p.locator('a[href="#superChallenge"]').click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:'/tmp/super-challenge-mobile.png'});
 await p.locator('#super-basic button[data-kind="five"]').click();await p.screenshot({path:'/tmp/super-challenge-running.png'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);await b.close();console.log('PASS super challenge: all 2702 questions, independent subjects, no caps/duplicates, resume, review, next round, ordinary practice isolation, storage failure, corrupt data, desktop/mobile');
})().catch(e=>{console.error(e);process.exit(1)});
