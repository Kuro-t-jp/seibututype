const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),B=require('../src/biome.js');
const source=fs.readFileSync('index.html','utf8').match(/function coinReward\([\s\S]*?\n\}/)[0];
const context={};vm.createContext(context);vm.runInContext(source,context);
const reward=context.coinReward,zero={chloro:0,hemo:0},max={chloro:3,hemo:3};
const clean=n=>({miss:0,review:Array.from({length:n},()=>({ok:true}))});
assert.equal(reward(clean(15),'type',true,zero).total,34);
assert.equal(reward(clean(15),'type',true,max).total,41);
for(const kind of ['quiz','recall']){assert.equal(reward(clean(15),kind,true,zero).total,68);assert.equal(reward(clean(15),kind,true,max).total,83);}
const mixed={miss:1,review:[{ok:true},{ok:false},{ok:true,hinted:true},{ok:true,revealed:true},{ok:false,incomplete:true}]};
assert.equal(reward(mixed,'type',true,zero).total,9); // floor((3*3+1)/2) + 4
assert.equal(reward(mixed,'type',false,max).total,5);
assert.equal(reward({miss:0,review:[{ok:false}]},'type',false,zero).total,1);
for(const n of [0,1,2,3,5,15,30])for(const completed of [false,true])for(const up of [zero,max]){
 const r=reward(clean(n),'type',completed,up);assert(Number.isSafeInteger(r.total));assert(r.total>=0);
 if(n<3||!completed)assert.equal(r.finish,0);
}
const oldSpecies=[[70,25,5],[60,32,8],[50,38,12],[42,42,16],[35,45,20],[30,45,25]];
const oldBackgrounds=[[60,28,10,2],[56,30,11,3],[52,32,12,4],[48,33,14,5],[44,34,16,6],[40,34,20,6]];
for(const [odds,old,draw,grade] of [[B.ODDS,oldSpecies,B.draw,s=>s.pending.tier],[B.ENVIRONMENT_ODDS,oldBackgrounds,B.drawEnvironment,s=>B.environment(s.environmentPending).grade]]){
 for(let lv=0;lv<6;lv++){
  const percentages=odds[lv];assert(Math.abs(percentages.reduce((a,b)=>a+b)-100)<1e-10);
  for(let g=1;g<percentages.length;g++)assert(percentages[g]<old[lv][g]);
  let lower=0;for(let g=0;g<percentages.length;g++){
   const upper=lower+percentages[g];
   for(const percent of [lower+1e-8,(lower+upper)/2,upper-1e-8]){
    let calls=0;const initial={xp:B.THRESHOLDS[lv]};const r=draw(initial,48,()=>calls++?.1:percent/100);
    assert.equal(grade(r.state),g);assert.equal(r.coins,24);assert.deepEqual(initial,{xp:B.THRESHOLDS[lv]});
   }lower=upper;
  }
 }
}
const rows=require('../data/biome-extra-expansion.json');assert.equal(rows.length,12);
assert.equal(B.SPECIES.length,156);assert.equal(new Set(B.SPECIES.map(c=>c.id)).size,156);
for(const c of rows){assert(B.QUESTIONS[c.id]);assert.equal(c.artMode,'portrait');assert.equal(c.kind,'observation');assert.equal(B.requirements(B.normalize(),c.id).length,0);assert(fs.existsSync('assets/biome-runtime/species-'+c.id+'.webp'));}
console.log('PASS typing 34/41, quiz/recall 68/83, rounding/partial/hint/reveal; reduced odds across all 6 levels and grade interval edges; 12 new organisms reachable');
