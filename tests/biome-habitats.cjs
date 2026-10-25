const assert=require('node:assert/strict'),B=require('../src/biome.js');
assert.equal(B.SPECIES.length,156);assert.equal(new Set(B.SPECIES.map(c=>c.id)).size,156);
const snapshot=x=>JSON.stringify(x),items=s=>[...s.plants,...s.animals,...s.observations,...s.reserve].filter(Boolean).map(x=>snapshot(x)).sort();
for(const c of B.SPECIES){
 const allowed=B.HABITATS.species[c.id];assert(Array.isArray(allowed));if(c.kind!=='observation')assert(allowed.length);
 assert(allowed.every(id=>B.environment(id)));assert(B.QUESTIONS[c.id]);
 for(const e of B.ENVIRONMENTS){
  const raw={version:7,environment:e.id,environmentsOwned:[e.id],moisture:100,soil:100,reserve:[{id:c.id,growth:0,tier:2}]};const s=B.normalize(raw),before=snapshot(s),fits=c.kind==='observation'||allowed.includes(e.id);
  assert.equal(B.habitatInfo(s,c.id).fits,fits);assert.equal(B.placementNeeds(s,c.id).length>0,!fits||c.kind==='animal'&&B.requirements(s,c.id).length>0);
  if(!fits)assert.throws(()=>B.place(s,999,c.id,0),/環境/);
  else if(!B.placementNeeds(s,c.id).length){const r=B.place(s,99,c.id,0);assert.equal(r.coins,99);assert.equal(r.state[B.slotKey(c.kind)][0].id,c.id);}
  assert.equal(snapshot(s),before);
 }
}
for(const e of B.ENVIRONMENTS){
 let s=B.normalize({version:7,environment:e.id,environmentsOwned:B.ENVIRONMENTS.map(e=>e.id),moisture:100,soil:100});
 const nonObservation=B.SPECIES.filter(c=>c.kind!=='observation'&&B.habitatInfo(s,c.id).fits);assert(nonObservation.length,e.id+' has no inhabitants');
 // Exercise every uniform-selection interval and rare tier boundary without changing odds.
 for(let k=0;k<400;k++){let n=0,r=B.draw(s,24,()=>n++?k/400:.99);assert.equal(r.state.pending.tier,2);assert(B.habitatInfo(s,r.state.pending.id).fits);assert.equal(r.coins,0);}
}
const raw={version:6,environment:'coast',environmentsOwned:['coast','satoyama','deciduousfloor'],plants:[{id:'birch',growth:76,tier:2},{id:'grass',growth:24,tier:1}],animals:[{id:'carp',growth:22,tier:2}],observations:[{id:'ecoli',growth:16,tier:0}],reserve:[{id:'birch',growth:6,tier:0}],pending:{id:'opuntia',growth:3,tier:1},xp:456,study:4,day:77};
const copy=snapshot(raw),s=B.normalize(raw);assert.equal(snapshot(raw),copy);assert.equal(s.version,7);assert.equal(s.reserve.length,4);assert.equal(s.plants.filter(Boolean).length,0);assert.equal(s.animals.filter(Boolean).length,0);assert.equal(s.observations[0].growth,16);assert.equal(s.pending.id,'opuntia');assert.deepEqual(s.habitatNotice,['birch','grass','carp']);assert.equal(s.xp,456);assert.equal(s.study,4);assert.equal(s.day,77);assert.deepEqual(B.normalize(s),s);
assert(s.reserve.some(p=>p.id==='birch'&&p.growth===76&&p.tier===2));
let next=B.chooseEnvironment(s,'deciduousfloor');next=B.place(next,9,'birch',0).state;assert.equal(next.plants[0].growth,6);assert.equal(next.reserve.filter(x=>x.id==='birch').length,1);
const allBefore=items(next),score=B.collectionScore(next).total;next=B.chooseEnvironment(next,'coast');assert.deepEqual(items(next),allBefore);assert.equal(B.collectionScore(next).total,score);assert.throws(()=>B.chooseEnvironment(next,'tundra'),/獲得/);
// Watering and growth cannot make a marine scene suitable for a freshwater fish.
let coastal=B.normalize({version:7,environment:'coast',environmentsOwned:['coast'],reserve:[{id:'carp'}],moisture:100});coastal=B.tend(coastal,8,'water').state;assert.throws(()=>B.place(coastal,99,'carp',0),/環境/);assert(!B.habitatInfo(coastal,'carp').fits);
for(const id of ['hamahirugao','sunagani','sphagnum','raicho','acacia']){const c=B.species(id);let a=B.normalize({version:7,environment:B.HABITATS.species[id][0],environmentsOwned:[B.HABITATS.species[id][0]],moisture:100,soil:100,reserve:[{id}]});a=B.place(a,0,id,0).state;const key=B.slotKey(c.kind);a=B.learn(a,5);assert.equal(a[key][0].growth,1);}
console.log('PASS 156 species x 20 scenes; placement/selection guards; all habitats populated; rare odds unchanged; migration and duplicate stock retained; switching/reload idempotence; growth and salt/freshwater distinction');
