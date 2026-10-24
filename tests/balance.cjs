// Run with Node and an installed Playwright: NODE_PATH=... node tests/balance.cjs
// Start the app on http://127.0.0.1:8766 first.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');const vm=require('node:vm');
(async()=>{
 const b=await chromium.launch({channel:'chrome'});const p=await b.newPage({viewport:{width:1366,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(require('node:url').pathToFileURL(require('node:path').resolve('index.html')).href);
 const results=await p.evaluate(()=>{
   const zero={...DEFAULT_SAVE.up};const max=Object.fromEntries(UPGRADES.map(u=>[u.key,u.max]));
   const rows=[];
   for(const kind of ['type','quiz','recall']) for(const n of [5,15,30]){
     const run={done:n,miss:0,review:Array.from({length:n},()=>({ok:true,hinted:false}))};
     rows.push({kind,n,base:coinReward(run,kind,true,zero).total,max:coinReward(run,kind,true,max).total});
   }
   const noWork=coinReward({miss:0,review:[{ok:false,incomplete:true}]},'type',false,max).total;
   const perfect=coinReward({miss:1,review:Array.from({length:15},()=>({ok:true}))},'type',true,max).perfect;
   const quit=coinReward({miss:0,review:Array.from({length:15},()=>({ok:true}))},'type',false,max);
   const wrong=coinReward({miss:15,review:Array.from({length:15},()=>({ok:false}))},'quiz',true,max).total;
   return {rows,noWork,perfect,quit,wrong};
 });
 assert.equal(results.noWork,0);assert.equal(results.perfect,0);assert.equal(results.quit.finish,0);assert.equal(results.quit.perfect,0);assert.equal(results.wrong,0);
 for(const r of results.rows){assert.equal(r.base,r.kind==='type'?r.n*2+4:r.n*4+8);assert.ok(r.max/r.base<1.4)}
 console.log('PASS rewards: typing halved; quiz/recall unchanged, bounded growth, no partial/quit/rounded-accuracy bonus',results.rows);
 const run=await p.evaluate(()=>{
   SAVE.up=Object.fromEntries(UPGRADES.map(u=>[u.key,u.max]));persist();mode={type:'time',val:60};playMode='quiz';show('quiz');beginQuiz();
   const initial=G.timeLeft;
   for(let i=0;i<100;i++){answerQuiz(G.choices.findIndex(w=>w.t===G.cur.t));clearTimeout(G.nextId);G.idx=0;loadQuestion();}
   const data={initial,time:G.timeLeft,regen:G.regenUsed,score:G.score,combo:G.combo};endGame();return data;
 });
 assert.equal(run.initial,69);assert.equal(run.time,75);assert.equal(run.regen,6);assert.ok(run.score<20000);assert.equal(run.combo,100);
 console.log('PASS 100 correct answers cannot extend a 60-second run past 75 seconds');
 await p.evaluate(()=>{mode={type:'count',val:15};playMode='quiz';show('quiz');beginQuiz();for(let i=0;i<14;i++){answerQuiz(G.choices.findIndex(w=>w.t===G.cur.t));clearTimeout(G.nextId);loadQuestion();}});
 const choice=await p.evaluate(()=>G.choices.findIndex(w=>w.t===G.cur.t));await p.locator('#qChoices button').nth(choice).click();await p.waitForFunction(()=>!G.running);
 assert.equal(await p.locator('#rRank').textContent(),'SS');assert.match(await p.locator('#rEarned').textContent(),/83 コイン/);
 console.log('PASS actual 15-question quiz finishes with reachable SS and 83 max-upgrade coins');
 await p.clock.install();
 await p.evaluate(()=>{mode={type:'time',val:60};playMode='quiz';show('quiz');beginQuiz();for(let i=0;i<3;i++){answerQuiz(G.choices.findIndex(w=>w.t===G.cur.t));clearTimeout(G.nextId);loadQuestion();}});
 await p.clock.runFor(75000);assert.equal(await p.evaluate(()=>G.running),false);assert.equal(await p.locator('#result').isVisible(),true);
 console.log('PASS browser timer actually ends the maximally extended run at 75 seconds');
 await p.clock.resume();

 await p.evaluate(()=>{mode={type:'time',val:60};playMode='type';show('game');beginGame()});
 const char=await p.evaluate(()=>canonical(G.units,0,'')[0]);await p.locator('#typingInput').pressSequentially(char);await p.locator('#game .finish-run').click();assert.equal(await p.locator('#rScore').textContent(),'0');assert.match(await p.locator('#rEarned').textContent(),/\+0 コイン/);assert.equal(await p.locator('#rRank').textContent(),'—');
 console.log('PASS one-keystroke retirement yields no score, coins or grade');
 await p.evaluate(()=>localStorage.setItem(SAVE_KEY,JSON.stringify({...DEFAULT_SAVE,coins:7,up:{...DEFAULT_SAVE.up,atp:1},themes:['forest','ocean','chloro']})));await p.reload();assert.equal(await p.evaluate(()=>SAVE.coins),222);await p.reload();assert.equal(await p.evaluate(()=>SAVE.coins),222);
 await p.locator('#shopBtn').click();await p.locator('[data-shelf=upgrades]').click();assert.match(await p.locator('#upgradeList').textContent(),/購入後 得点\+10%/);await p.getByRole('button',{name:'リボソームを45コインで購入',exact:true}).click();await p.getByRole('button',{name:'なるほど！'}).click();assert.equal(await p.evaluate(()=>SAVE.coins),177);assert.equal(await p.evaluate(()=>SAVE.up.ribosome),1);
 console.log('PASS old purchase price refunded exactly once; real shop purchase deducts advertised price');
 fs.mkdirSync('/tmp/seibututype-balance',{recursive:true});await p.screenshot({path:'/tmp/seibututype-balance/shop.png',fullPage:true});await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:'/tmp/seibututype-balance/shop-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);await b.close();
 require('./gas-server.cjs').run();
})().catch(e=>{console.error(e);process.exit(1)});
