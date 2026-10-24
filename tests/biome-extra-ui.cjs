const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(require('node:url').pathToFileURL(require('node:path').resolve('index.html')).href);
 await p.evaluate(()=>{SAVE.up={...DEFAULT_SAVE.up};SAVE.coins=123;mode={type:'count',val:15};playMode='type';show('game');beginGame();});
 for(let i=0;i<15;i++){
  const answer=await p.evaluate(()=>G.units.map((_,i)=>canonical(G.units,i,'')).join(''));
  await p.locator('#typingInput').pressSequentially(answer);
  assert.equal(await p.evaluate(()=>G.done),i+1);
 }
 assert.equal(await p.evaluate(()=>G.miss),0);assert.equal(await p.evaluate(()=>G.running),false);
 assert.match(await p.locator('#rEarned').innerText(),/34 コイン/);assert.equal(await p.evaluate(()=>SAVE.coins),157);
 await p.locator('#result').screenshot({path:'artifacts/extra-typing-reward.png'});
 await p.reload();assert.equal(await p.evaluate(()=>SAVE.coins),157);await p.locator('#shopBtn').click();
 await p.locator('.shop-rules summary').click();assert((await p.locator('.shop-rules').innerText()).includes('34コイン'));
 await p.evaluate(()=>{SAVE.biome=Biome.normalize({xp:0});renderBiomeShop();});
 assert((await p.locator('#shop').textContent()).includes('大きな発見 1%'));
 await p.locator('.environment-collection summary').click();assert((await p.locator('.environment-odds').innerText()).includes('0.5%'));
 await p.evaluate(()=>{SAVE.biome=Biome.normalize({xp:460,speciesKnown:['crayfish'],reserve:[{id:'crayfish',age:0,tier:2}]});renderBiomeShop();});
 assert((await p.locator('#shop').textContent()).includes('大きな発見 4%'));await p.locator('.environment-collection summary').click();assert((await p.locator('.environment-odds').innerText()).includes('1.5%'));
 await p.locator('[data-habitat-tab="observation"]').click();await p.locator('[data-species="crayfish"]').click();
 await p.locator('#habitatSelection').screenshot({path:'artifacts/extra-card-desktop.png'});
 await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('#habitatSelection').screenshot({path:'artifacts/extra-card-mobile.png'});
 assert.deepEqual(errors,[]);await b.close();console.log('PASS actual keyboard typing 15 clean = 34 coins, persisted balance, displayed Lv1/Lv6 odds, new crayfish card/mobile');
})().catch(e=>{console.error(e);process.exit(1)});
