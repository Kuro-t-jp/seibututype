const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1280,height:1000}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8766/');await p.locator('#shopBtn').click();await p.locator('#habitatPlace').click();
 assert.equal(await p.locator('.habitat-growth ol li').count(),12);
 assert.match(await p.locator('.habitat-growth').innerText(),/あと 5 問/);
 await p.evaluate(()=>{advanceBiomeLearning([{ok:true},{ok:true},{ok:false},{ok:true,revealed:true}],'quiz');persist();renderShop()});
 assert.match(await p.locator('.habitat-growth').innerText(),/あと 3 問/);
 assert.equal(await p.locator('.habitat-growth progress').getAttribute('value'),'40');
 await p.reload();await p.locator('#shopBtn').click();assert.match(await p.locator('.habitat-growth').innerText(),/あと 3 問/);
 await p.evaluate(()=>{advanceBiomeLearning(Array.from({length:3},()=>({ok:true})),'quiz');persist();renderShop()});
 assert.match(await p.locator('.habitat-growth').innerText(),/育成 2\/12/);
 await p.locator('[data-inspect="plant:0"]').click();assert.match(await p.locator('#habitatObservation').innerText(),/育成 2\/12/);
 await p.locator('#habitatObservation').scrollIntoViewIfNeeded();await p.screenshot({path:'/tmp/biome-paced-observation-desktop.png'});
 await p.setViewportSize({width:390,height:844});await p.locator('#habitatObservation').scrollIntoViewIfNeeded();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:'/tmp/biome-paced-observation-mobile.png'});
 assert.deepEqual(errors,[]);await b.close();console.log('PASS growth UI: twelve steps, per-question meter, answer exclusions, reload persistence, observation, desktop/mobile');
})().catch(e=>{console.error(e);process.exit(1)});
