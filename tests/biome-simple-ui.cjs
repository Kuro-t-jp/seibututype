const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1180,height:1000},reducedMotion:'reduce'}),errors=[];
 page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_URL||'http://127.0.0.1:8766/');await page.locator('#shopBtn').click();
 assert(await page.locator('#habitatWorld').isVisible());assert(await page.locator('#biomePanel-explore').isHidden());assert(await page.locator('#collectionBook').isHidden());assert(await page.locator('.plant-dossier').isHidden());assert(await page.locator('.habitat-species').isHidden());assert(await page.locator('[data-shelf="themes"]').isHidden());
 const original=await page.evaluate(()=>JSON.stringify(SAVE));
 for(const view of ['explore','book','grow']){await page.locator('#biomeView-'+view).click();assert.equal(await page.locator('[data-biome-panel]:visible').count(),1);assert.equal(await page.locator('#biomeView-'+view).getAttribute('aria-pressed'),'true');}
 assert.equal(await page.evaluate(()=>JSON.stringify(SAVE)),original,'view navigation must not change progress');
 await page.locator('#habitatPlace').click();assert.equal(await page.evaluate(()=>SAVE.biome.plants.filter(Boolean).length),1);
 await page.locator('[data-fold="environment"]>summary').click();await page.locator('[data-weather="sun"]').click();assert(await page.locator('#habitatEnvironment').isVisible(),'open fold survives render');
 await page.evaluate(()=>{SAVE.coins=240;persist();renderBiomeShop();Math.random=()=>.5;});
 await page.locator('#biomeView-explore').click();assert(await page.locator('#biomeDraw').isVisible());assert(await page.locator('#environmentDraw').isVisible());assert(await page.locator('.environment-odds').isHidden());
 await page.locator('[data-fold="odds-environment"]>summary').click();assert(await page.locator('.environment-odds').isVisible());await page.locator('[data-fold="odds-environment"]>summary').click();
 await page.locator('#biomeDraw').click();assert.equal(await page.evaluate(()=>SAVE.coins),216);await page.locator('.discovery-close').click();
 await page.reload();await page.locator('#shopBtn').click();assert(await page.locator('#biomeReplay').isVisible(),'pending find opens Explore on reload');assert.equal(await page.evaluate(()=>SAVE.coins),216);
 await page.locator('#biome-keep').click();assert.equal(await page.evaluate(()=>SAVE.biome.reserve.length),1);
 await page.locator('#biomeView-explore').click();await page.locator('#environmentDraw').click();await page.locator('.discovery-keep').click();assert.equal(await page.evaluate(()=>SAVE.coins),192);assert(await page.locator('#collectionBook').isVisible(),'new discovery leads to collection');
 const env=await page.evaluate(()=>SAVE.biome.environmentsOwned.find(x=>x!=='canyon'));
 await page.locator('[data-collection="environment:'+env+'"]').click();assert(await page.locator('#environment-card-'+env).isVisible());await page.locator('#environment-card-'+env).click();assert(await page.locator('#habitatWorld').isVisible());assert.equal(await page.evaluate(()=>SAVE.biome.environment),env);
 await page.locator('#biomeView-book').click();if(!(await page.locator('.collection-pages').evaluate(e=>e.open)))await page.locator('.collection-pages>summary').click();await page.locator('[data-collection="plant:grass"]').click();assert(await page.locator('#habitatSelection .plant-dossier').isVisible(),'collection entry reveals detailed card');
 await page.locator('[data-fold="species"]>summary').click();await page.locator('[data-species="pine"]').click();assert(await page.locator('#habitatPlace').isDisabled());assert(!(await page.locator('#habitatSelection').innerText()).includes('アカマツ'),'unseen names remain secret');
 await page.locator('#biomeView-grow').click();await page.locator('[data-inspect="plant:0"]').click();assert(await page.locator('.habitat-observe').isVisible(),JSON.stringify({errors,html:await page.locator('#habitatObservation').innerHTML()}));
 await page.locator('#shopExtras>summary').click();for(const shelf of ['upgrades','themes','badges']){await page.locator('[data-shelf="'+shelf+'"]').click();assert(await page.locator('#biomeShelf').isHidden());assert.equal(await page.locator('#shop').getAttribute('data-active-shelf'),shelf);}await page.locator('[data-shelf="biome"]').click();assert(await page.locator('#biomeShelf').isVisible());assert(await page.locator('[data-shelf="themes"]').isHidden());
 await page.reload();await page.locator('#shopBtn').click();assert.equal(await page.evaluate(()=>SAVE.biome.environment),env);assert.equal(await page.evaluate(()=>SAVE.coins),192);
 await page.locator('#biomeView-explore').focus();await page.keyboard.press('Enter');assert(await page.locator('#biomePanel-explore').isVisible());
 for(const width of [1180,390,320]){await page.setViewportSize({width,height:900});for(const view of ['grow','explore','book']){await page.locator('#biomeView-'+view).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${view}: no horizontal overflow`);if(width===1180&&view==='grow')await page.locator('#shop').screenshot({path:'artifacts/biome-simple-desktop.png'});if(width===390&&view==='explore')await page.locator('#shop').screenshot({path:'artifacts/biome-simple-mobile.png'});}}
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS simple views, details, pending reload, discovery/collection links, placement, weather, shop categories, saved coins, keyboard, desktop/mobile');
})().catch(e=>{console.error(e);process.exit(1)});
