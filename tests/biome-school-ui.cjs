const reveal=require('./helpers/biome-navigation.cjs');
const {chromium}=require('playwright'),assert=require('node:assert/strict'),rows=require('../data/biome-school-expansion.json').concat(require('../data/biome-extra-expansion.json'),require('../data/biome-more-expansion.json'));
(async()=>{const browser=await chromium.launch({channel:'chrome'}),p=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(require('node:url').pathToFileURL(require('node:path').resolve('index.html')).href);await reveal(p,'#shopBtn');await p.locator('#shopBtn').click();
 await reveal(p,'[data-habitat-tab="observation"]');await p.locator('[data-habitat-tab="observation"]').click();assert.equal(await p.locator('.mystery-species').count(),44);assert.equal(await p.locator('#habitatSelection [data-plant-card]').count(),0);assert.equal(await p.locator('#habitatSelection .bio-sprite').count(),0);
 assert.equal(await p.locator('.collection-page').count(),152);
 for(const c of rows){
  await p.evaluate(id=>{SAVE.biome=Biome.normalize({pending:{id,age:0,tier:2}});persist();renderBiomeShop();},c.id);
  await reveal(p,'#biomeReplay');await p.locator('#biomeReplay').click();assert((await p.locator('#discoveryTitle').innerText()).includes(c.name));assert(await p.locator('.discovery-first-seal').isVisible());await reveal(p,'.discovery-keep');await p.locator('.discovery-keep').click();
  await reveal(p,`[data-habitat-tab="${c.kind}"]`);await p.locator(`[data-habitat-tab="${c.kind}"]`).click();await reveal(p,`[data-species="${c.id}"]`);await p.locator(`[data-species="${c.id}"]`).click();
  await reveal(p,'#habitatSelection [data-plant-card]');const card=p.locator('#habitatSelection [data-plant-card]');assert.equal(await card.getAttribute('data-plant-card'),c.id);assert((await card.innerText()).includes(c.card.learning));
  const loaded=await card.locator('.plant-card-art').evaluate(e=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(true);img.onerror=()=>resolve(false);img.src=getComputedStyle(e).backgroundImage.slice(5,-2)}));assert(loaded,c.id+' image');
  if(c.kind==='observation')assert.equal(await card.locator('.plant-card-art').evaluate(e=>getComputedStyle(e).backgroundSize),'contain');
  await reveal(p,'#habitatPlace');await p.locator('#habitatPlace').click();await reveal(p,`[data-inspect="${c.kind}:0"]`);await p.locator(`[data-inspect="${c.kind}:0"]`).focus();await p.keyboard.press('Enter');assert((await p.locator('.habitat-observe').innerText()).includes(c.name));
  await reveal(p,'.habitat-quiz summary');await p.locator('.habitat-quiz summary').click();await reveal(p,'[data-bio-answer="1"]');await p.locator('[data-bio-answer="1"]').click();assert((await p.locator('.habitat-quiz [role="status"]').innerText()).includes(c.explanation));await reveal(p,'[data-bio-answer="0"]');await p.locator('[data-bio-answer="0"]').click();assert(await p.evaluate(id=>SAVE.biome.checked[id],c.id));
 }
 await p.evaluate(()=>{SAVE.biome=Biome.normalize({observations:['euglena','paramecium','volvox','buddingyeast'].map(id=>({id,age:3})),speciesKnown:Biome.SPECIES.map(c=>c.id)});persist();renderBiomeShop();});
 await reveal(p,'[data-habitat-tab="observation"]');await p.locator('[data-habitat-tab="observation"]').click();await reveal(p,'[data-species="euglena"]');await p.locator('[data-species="euglena"]').click();await p.locator('#habitatSelection').screenshot({path:'/tmp/school-card-desktop.png'});
 for(const width of [390,320]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);if(width===390)await p.locator('#habitatSelection').screenshot({path:'/tmp/school-card-mobile.png'});}
 await p.setViewportSize({width:1280,height:1000});await p.locator('#observationShelf').screenshot({path:'/tmp/school-shelf.png'});await p.reload();await reveal(p,'#shopBtn');await p.locator('#shopBtn').click();assert.equal(await p.locator('#observationShelf [data-inspect]').count(),4);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS 60 new images/cards, mystery/reveal/keep/place, quizzes, observation display, persistence and 320/390px layout');
})().catch(e=>{console.error(e);process.exit(1)});
