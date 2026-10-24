const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),rows=require('../data/biome-classroom.json');
(async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1280,height:1000}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto(require('node:url').pathToFileURL(path.resolve('index.html')).href);await p.locator('#shopBtn').click();
 await p.evaluate(()=>{SAVE.biome=Biome.normalize({speciesKnown:['pea']});persist();renderBiomeShop();});await p.locator('[data-classroom="lesson"]').click();assert.equal(await p.locator('[data-species]').count(),20);
 await p.locator('[data-species="pea"]').click();assert((await p.locator('#habitatSelection').innerText()).includes('遺伝の法則'));assert.equal(await p.locator('#habitatPlace').isDisabled(),true);assert.equal(await p.locator('#habitatSelection .bio-sprite').first().evaluate(e=>getComputedStyle(e).backgroundSize),'200% 200%');assert.equal(await p.locator('.habitat-topic').first().evaluate(e=>getComputedStyle(e).fontSize),'10px');
 await p.locator('[data-habitat-tab="animal"]').click();assert.equal(await p.locator('[data-species]').count(),4);
 await p.locator('[data-classroom="all"]').click();assert.equal(await p.locator('[data-species]').count(),39);
 for(const c of rows){
  await p.evaluate(c=>{SAVE.biome=Biome.normalize({moisture:100,soil:100,plants:[{id:c.kind==='plant'?c.id:'grass',age:6}],animals:c.kind==='animal'?[{id:c.id,age:6}]:[]});persist();renderBiomeShop();},c);
  await p.locator(`[data-inspect="${c.kind}:0"]`).click();assert(await p.locator('.habitat-observe .habitat-classroom-card').isVisible());assert.equal(await p.locator('.habitat-observe .habitat-life .bio-sprite').count(),4);
  await p.locator('.habitat-quiz summary').click();await p.locator('[data-bio-answer="1"]').click();assert((await p.locator('.habitat-quiz').innerText()).includes(c.explanation));await p.locator('[data-bio-answer="0"]').click();assert((await p.locator('.habitat-quiz').innerText()).includes('育成経験 +2 XP'));
 }
 await p.locator('[data-habitat-tab="plant"]').click();await p.locator('[data-classroom="lesson"]').click();await p.locator('[data-species="pea"]').click();await p.locator('.habitat-collection-filter').scrollIntoViewIfNeeded();await p.screenshot({path:'artifacts/classroom-desktop.png'});
 await p.setViewportSize({width:390,height:844});await p.locator('#habitatSelection').scrollIntoViewIfNeeded();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'artifacts/classroom-mobile.png'});
 assert.deepEqual(errors,[]);await b.close();console.log('PASS classroom filters, all 12 observation cards, 48 stages, feedback, correct-answer bonus, locked placement and mobile');
})().catch(e=>{console.error(e);process.exit(1)});
