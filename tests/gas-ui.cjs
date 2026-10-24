const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});fs.mkdirSync('artifacts',{recursive:true});
 for(const gas of [false,true]){
  const context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),p=await context.newPage(),errors=[],unexpected=[];
  const html=gas?require('./gas-assets.cjs').delivered:fs.readFileSync('index.html','utf8');
  await context.route('https://biology.test/',r=>r.fulfill({contentType:'text/html',body:html}));
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!r.url().startsWith('data:')&&r.url()!=='https://biology.test/')unexpected.push(r.url())});
  await context.addInitScript(gas=>{
   window.rpcAttempts=0;
   if(gas)window.google={script:{get run(){window.rpcAttempts++;throw new Error('Student data must not access GAS RPC')}}};
   // An existing saved name must not be read, sent, or required after upgrading.
   localStorage.setItem('seibutuTypePlayer','old-test-name');localStorage.setItem('seibutuRankPlayer_v1','a'.repeat(32));
  },gas);
  await p.goto('https://biology.test/');await p.locator('#nextStudyAction').waitFor();
  assert.match(await p.locator('#gasStatus').innerText(),/ブラウザ内保存/);assert.equal(await p.locator('#nameInput,#nameInput2').count(),0);
  await p.locator('.account-options summary').click();assert.match(await p.locator('#localPrivacy').innerText(),/運営者へ送信しません/);
  await p.evaluate(()=>{SAVE.coins=123;SAVE.biome=Biome.normalize({xp:16,speciesKnown:['grass','crayfish'],reserve:[{id:'crayfish',age:2,tier:1}]});persist();mode={type:'count',val:15};playMode='type';show('game');beginGame();});
  for(let i=0;i<15;i++){const text=await p.evaluate(()=>G.units.map((_,i)=>canonical(G.units,i,'')).join(''));await p.locator('#typingInput').pressSequentially(text);}
  assert.match(await p.locator('#rEarned').innerText(),/34 コイン/);assert.equal(await p.evaluate(()=>SAVE.coins),157);assert.equal(await p.evaluate(()=>rpcAttempts),0);
  await p.reload();assert.equal(await p.evaluate(()=>SAVE.coins),157);assert(await p.evaluate(()=>SAVE.biome.speciesKnown.includes('crayfish')));assert.equal(await p.evaluate(()=>SAVE.biome.reserve[0].id),'crayfish');
  await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.locator('.account-options summary').click();await p.screenshot({path:`artifacts/privacy-${gas?'gas':'pages'}.png`});
  assert.equal(await p.evaluate(()=>rpcAttempts),0);assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);await context.close();
 }
 await browser.close();console.log('PASS Pages/GAS: zero RPC/network submissions, legacy name safe, actual typing reward, coins/collection persist after reload, mobile');
})().catch(e=>{console.error(e);process.exit(1)});
