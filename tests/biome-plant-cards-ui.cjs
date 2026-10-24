const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),cards=require('../data/biome-plant-cards.json');
Object.assign(cards,Object.fromEntries(require('../data/biome-school-expansion.json').filter(x=>x.kind==='plant').map(x=>[x.id,x.card])));
(async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1280,height:1100},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await p.goto(require('node:url').pathToFileURL(path.resolve('index.html')).href);await p.locator('#shopBtn').click();
 assert.equal(await p.locator('#habitatSelection [data-plant-card="grass"]').count(),1);
 await p.locator('[data-species="pea"]').click();assert.equal(await p.locator('#habitatSelection [data-plant-card]').count(),0);assert(!(await p.locator('#habitatSelection').innerText()).includes(cards.pea.signature));
 await p.evaluate(()=>{SAVE.biome=Biome.normalize({speciesKnown:Biome.SPECIES.filter(c=>c.kind==='plant').map(c=>c.id)});persist();renderBiomeShop();});
 for(const [id,c] of Object.entries(cards)){
  await p.locator(`[data-species="${id}"]`).click();const card=p.locator('#habitatSelection [data-plant-card]');assert.equal(await card.getAttribute('data-plant-card'),id);assert((await card.innerText()).includes(c.appearance));assert((await card.innerText()).includes(c.misconception));assert.equal(await card.locator('.plant-card-art').count(),1);assert.equal(await p.locator('#habitatSelection .habitat-life .bio-sprite').count(),4);
  assert.equal(await card.locator('.plant-recall details').getAttribute('open'),null);await card.locator('.plant-recall summary').click();assert((await card.locator('.plant-recall').innerText()).includes(c.answer));await card.locator('.plant-sources summary').click();assert.equal(await card.locator('a').first().getAttribute('href'),c.sources[0].url);
 }
 await p.locator('[data-species="plantain"]').click();await p.locator('#habitatSelection').scrollIntoViewIfNeeded();await p.locator('#habitatSelection').screenshot({path:'artifacts/plant-card-desktop.png'});
 const snapshot=await p.evaluate(()=>localStorage.getItem(SAVE_KEY));
 // Open the collected plant's actual book page without spending coins or changing progress.
 await p.locator('.collection-pages summary').click();
 const entry=p.locator('[data-collection="plant:plantain"]');assert.equal(await entry.count(),1);await entry.click();assert.equal(await p.locator('#habitatSelection [data-plant-card]').getAttribute('data-plant-card'),'plantain');
 assert.equal(await p.evaluate(()=>localStorage.getItem(SAVE_KEY)),snapshot);
 for(const width of [390,320]){await p.setViewportSize({width,height:844});await p.locator('#habitatSelection').scrollIntoViewIfNeeded();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow '+width);if(width===390)await p.locator('#habitatSelection').screenshot({path:'artifacts/plant-card-mobile.png'});}
 await p.evaluate(()=>{SAVE.biome=Biome.normalize({plants:[{id:'plantain',age:6}]});persist();renderBiomeShop();});await p.locator('[data-inspect="plant:0"]').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('.habitat-observe [data-plant-card="plantain"]').count(),1);assert.equal(await p.locator('.habitat-observe .habitat-life .bio-sprite').count(),4);assert(await p.locator('.habitat-quiz').isVisible());
 await p.reload();await p.locator('#shopBtn').click();await p.locator('[data-species="plantain"]').click();assert.equal(await p.locator('#habitatSelection [data-plant-card="plantain"]').count(),1);
 assert.deepEqual(errors,[]);await b.close();console.log('PASS 45 plant cards, recall and sources, unknown secrecy, existing collection link, observation, reload, unchanged progress, 320/390px layout');
})().catch(e=>{console.error(e);process.exit(1)});
