const {chromium}=require('playwright'),assert=require('node:assert/strict'),{fixture}=require('./gas-server.cjs');
(async()=>{
 const f=fixture(),b=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'}),ctx=await b.newContext({viewport:{width:1366,height:1000},reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];
 console.log('Browser:',b.version());
 p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('http://127.0.0.1:8766/',route=>route.fulfill({contentType:'text/html',body:require('node:fs').readFileSync('index.html','utf8')}));
 await ctx.route('http://127.0.0.1:8766/dist/gas/index.html',route=>route.fulfill({contentType:'text/html',body:require('./gas-assets.cjs').delivered}));
 await ctx.exposeBinding('testGasRpc',async(source,method,args)=>{
  assert.ok(['getAppInfo','getRanking','submitScore'].includes(method));
  return JSON.parse(JSON.stringify(f.ctx[method](...args)));
 });
 await ctx.addInitScript(()=>{
  window.gasTest={failNext:false,delayType:0};
  function runner(success=()=>{},failure=()=>{}){
   const chain={withSuccessHandler(fn){return runner(fn,failure)},withFailureHandler(fn){return runner(success,fn)}};
   for(const method of ['getAppInfo','getRanking','submitScore'])chain[method]=(...args)=>{
    if(window.gasTest.failNext){window.gasTest.failNext=false;setTimeout(()=>failure({message:'テスト用の通信失敗'}),10);return;}
    const delay=method==='getRanking'&&args[1]==='type'?window.gasTest.delayType:0;
    window.testGasRpc(method,args).then(r=>setTimeout(()=>success(r),delay),e=>failure({message:e.message}));
   };return chain;
  }
  window.google={script:{run:runner()}};
 });
 await p.goto('http://127.0.0.1:8766/');await p.getByText('GAS版 · 学習できます。',{exact:false}).waitFor();assert.equal(await p.locator('#start').isVisible(),true);
 f.ctx.setupApp_();await p.reload();await p.getByText('共有ランキングに接続。',{exact:false}).waitFor();
 await p.locator('.account-options > summary').click();await p.locator('#nameInput').fill('テスト生徒');await p.locator('#nameSave').click();
 await p.locator('#termsMenu > summary').click();await p.locator('#termsMenu .fine-settings').last().locator('summary').click();await p.locator('[data-play="quiz"]').click();await p.locator('#learnFocus').selectOption('all');await p.locator('[data-mode="count"][data-val="15"]').click();
 await p.locator('#startBtn').click();await p.locator('#qChoices button').first().waitFor();
 const answer=await p.evaluate(()=>G.choices.findIndex(w=>w.t===G.cur.t));await p.locator('#qChoices button').nth(answer).click();
 await p.locator('#quiz .finish-run').click();await p.locator('#myRankLine').getByText(/あなたは 1位/).waitFor();
 assert.equal(f.ctx.rankingSheet_().getLastRow(),2);assert.equal(JSON.parse(f.ctx.rankingSheet_().data[1][2]),'テスト生徒');
 const id=await p.evaluate(()=>rankPlayer);await p.reload();assert.equal(await p.evaluate(()=>rankPlayer),id,'identity survives reload');
 await p.evaluate(()=>{
  mode={type:'count',val:15};$('learnFocus').value='all';window.gasTest.failNext=true;
  show('result');submitAndShow({name:'テスト生徒',score:100,done:1,kpm:50,acc:100,mode:'quiz',context:rankingContext('quiz')});
 });
 await p.locator('#rankResult').getByRole('button',{name:'再試行'}).waitFor();assert.match(await p.locator('#rankResult').textContent(),/通信失敗/);
 await p.locator('#rankResult').getByRole('button',{name:'再試行'}).click();await p.locator('#myRankLine').getByText(/あなたは 1位/).waitFor();assert.equal(f.ctx.rankingSheet_().getLastRow(),2,'retry updates one best');
 await p.locator('#menuBtn').click();
 // A slow response from a previous tab cannot overwrite the new ranking.
 await p.evaluate(()=>{mode={type:'count',val:15};$('learnFocus').value='all';window.gasTest.delayType=250;loadRankingInto($('rankStart'),'type');loadRankingInto($('rankStart'),'quiz');});
 await p.locator('#rankStart .rankrow').waitFor({state:'attached'});await p.waitForTimeout(350);assert.match(await p.locator('#rankStart').textContent(),/テスト生徒/);
 // Actual sandboxed iframe; anchors must not navigate the hosting page.
 await p.setContent('<iframe id="gasFrame" title="GAS simulation" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-modals allow-top-navigation-by-user-activation" src="http://127.0.0.1:8766/dist/gas/index.html" style="width:100%;height:950px;border:0"></iframe>');
 const frame=p.frameLocator('#gasFrame');await frame.locator('#gasStatus').getByText('共有ランキングに接続。',{exact:false}).waitFor();
 const frameCount=p.frames().length;await frame.locator('a[href="#learningSetup"]').click();assert.equal(p.frames().length,frameCount);assert.equal(await frame.locator('#learningSetup').evaluate(e=>document.activeElement===e),true);await frame.locator('.hero-photo img').evaluate(e=>e.decode());assert.equal(await frame.locator('.hero-photo img').evaluate(e=>e.naturalWidth>0),true);
 await p.screenshot({path:'/tmp/gas-iframe-desktop.png'});
 await frame.locator('#examMenu > summary').click();await frame.locator('#fiveLaunch').click();await frame.locator('#thinkBegin').click();await frame.locator('#questionBookmark').click();assert.equal(await frame.locator('#questionBookmark').getAttribute('aria-pressed'),'true');
 await p.setViewportSize({width:390,height:844});await frame.locator('#thinkStop').click();await frame.locator('#thinkBack').click();
 assert.equal(await frame.locator('html').evaluate(e=>e.scrollWidth<=innerWidth),true);await p.screenshot({path:'/tmp/gas-iframe-mobile.png'});
 assert.deepEqual(errors,[]);await b.close();console.log('PASS GAS UI: preparation/connected states, actual score submission, persisted identity, retry, stale responses, packaged iframe navigation, embedded images, 5-choice/bookmark, mobile, no runtime errors');
})().catch(e=>{console.error(e);process.exit(1)});
