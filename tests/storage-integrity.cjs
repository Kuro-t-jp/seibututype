const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'}),c=await b.newContext(),p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8766/');
 await p.evaluate(()=>{SAVE.coins=100;persist();renderShop();window.nativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')};document.querySelector('#upgradeList button').click()});
 assert.deepEqual(await p.evaluate(()=>({memory:SAVE.coins,saved:JSON.parse(localStorage.getItem(SAVE_KEY)).coins,success:!!document.querySelector('.reveal-ov'),level:SAVE.up.atp})),{memory:100,saved:100,success:false,level:0});
 assert.match(await p.locator('#saveProblem').innerText(),/保存できません/);
 // A complete real typing session must survive a temporary storage failure without duplicating rewards.
 await p.evaluate(()=>{mode={type:'count',val:15};playMode='type';show('game');beginGame()});
 for(let i=0;i<15;i++)await p.locator('#typingInput').pressSequentially(await p.evaluate(()=>G.units.map((_,i)=>canonical(G.units,i,'')).join('')));
 assert.equal(await p.evaluate(()=>SAVE.coins),100);assert.match(await p.locator('#rEarned').innerText(),/未保存/);assert.equal(await p.evaluate(()=>pendingRewards.length),1);assert.equal(await p.evaluate(()=>pendingLearningAnswers.length),15);
 await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'/tmp/seibutu-storage-mobile.png'});await p.setViewportSize({width:1280,height:900});
 await p.evaluate(()=>{Storage.prototype.setItem=nativeSet});await p.locator('#saveProblem button').click();
 assert.equal(await p.evaluate(()=>SAVE.coins),134);assert.equal(await p.evaluate(()=>pendingRewards.length),0);assert.equal(await p.evaluate(()=>pendingLearningAnswers.length),0);assert.equal(await p.evaluate(()=>Object.values(LEARNING).reduce((n,r)=>n+(r.type?.attempts||0),0)),15);assert.doesNotMatch(await p.locator('#rEarned').innerText(),/未保存/);
 await p.evaluate(()=>flushRewards());assert.equal(await p.evaluate(()=>SAVE.coins),134);await p.reload();assert.equal(await p.evaluate(()=>SAVE.coins),134);
 // A stale shop view cannot overwrite a newer award, nor falsely reveal a purchase.
 const q=await c.newPage();await q.goto('http://127.0.0.1:8766/');await q.evaluate(()=>renderShop());
 await p.evaluate(()=>saveRunReward([],'type',20));
 await q.evaluate(()=>document.querySelector('#upgradeList button').click());
 assert.equal(await q.evaluate(()=>SAVE.coins),154);assert.equal(await q.locator('.reveal-ov').count(),0);assert.match(await q.locator('#saveProblem').innerText(),/別のタブ/);
 // Learning from both tabs merges with the latest collection and balance.
 await q.evaluate(()=>saveRunReward([{ok:true}],'quiz',10));await p.evaluate(()=>saveRunReward([{ok:true}],'quiz',5));
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(SAVE_KEY)).coins),169);
 await q.reload();assert.equal(await q.evaluate(()=>SAVE.coins),169);assert.equal(await q.evaluate(()=>SAVE.biome.study),2);
 // Two tabs answer the same word and thinking question: neither attempt is lost.
 await q.evaluate(()=>{playMode='quiz';saveLearningAnswer({word:WORDS[0],ok:true});recordThinkingHistory('fk01',true,false)});
 await p.evaluate(()=>{playMode='quiz';saveLearningAnswer({word:WORDS[0],ok:false});recordThinkingHistory('fk01',false,false)});
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(LEARNING_KEY))[WORDS[0].t].quiz.attempts),2);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(THINK_KEY)).fk01.attempts),2);
 // Independent notes and exhaustive-course answers from two tabs are both retained.
 await q.evaluate(()=>{setNotebookEntry(notebookQuestions[0],{note:'first'});superProgress.basic.answers['type:細胞']={clean:true};saveSuperProgress()});
 await p.evaluate(()=>{setNotebookEntry(notebookQuestions[1],{note:'second'});superProgress.basic.answers['quiz:細胞']={clean:false};saveSuperProgress()});
 assert.deepEqual(await p.evaluate(()=>[JSON.parse(localStorage.getItem(NOTEBOOK_KEY))[notebookQuestions[0].id].note,JSON.parse(localStorage.getItem(NOTEBOOK_KEY))[notebookQuestions[1].id].note]),['first','second']);
 assert.deepEqual(await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem(SUPER_KEY)).basic.answers).sort()),['quiz:細胞','type:細胞']);
 // Corrupted data is preserved, not silently overwritten by automatic migration.
 const bad=await b.newContext();await bad.addInitScript(()=>localStorage.setItem('seibutuTypeSave_v2','broken-json'));
 const r=await bad.newPage();await r.goto('http://127.0.0.1:8766/');assert.equal(await r.evaluate(()=>localStorage.getItem(SAVE_KEY)),'broken-json');assert.match(await r.locator('#saveProblem').innerText(),/保存できません/);
 assert.deepEqual(errors,[]);await b.close();console.log('PASS storage failure rolls back purchase; real typing reward retry exactly once; stale tab purchase protected; two-tab rewards retained; corrupt source preserved');
})().catch(e=>{console.error(e);process.exit(1)});
