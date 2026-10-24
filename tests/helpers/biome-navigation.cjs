// Navigate via the same visible controls as a learner before exercising a detail.
module.exports=async function reveal(page,selector){
 const target=page.locator(selector).first();
 const view=await target.evaluate(e=>e.closest('[data-biome-panel]')?.dataset.biomePanel);
 if(view&&await page.locator('#biomePanel-'+view).isHidden())await page.locator('#biomeView-'+view).click();
 const ancestors=target.locator('xpath=ancestor::details');
 const count=await ancestors.count()-(await target.evaluate(e=>e.tagName==='SUMMARY')?1:0);
 for(let i=0;i<count;i++){
  const details=ancestors.nth(i);
  if(!await details.evaluate(e=>e.open))await details.locator(':scope > summary').click();
 }
};
