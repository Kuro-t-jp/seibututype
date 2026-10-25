const assert=require('node:assert/strict'),B=require('../src/biome.js');
const points=s=>B.collectionScore(s).total;
assert.equal(points({}),200);assert.equal(B.collectionScore({}).next.remaining,300);
let s=B.normalize({version:4,speciesKnown:['grass','pea','pea','bad'],plants:[{id:'pea',tier:1}],reserve:[{id:'pea',tier:2},{id:'octopus',tier:1}],pending:{id:'mimosa',tier:2},environmentsOwned:['canyon','coast','coast','bad']});
assert.equal(s.speciesBestTier.pea,2);assert.equal(s.speciesBestTier.octopus,1);assert.equal(s.speciesBestTier.mimosa,undefined);assert.equal(points(s),860);assert.equal(B.collectionGain(s,'species'),300);assert.equal(s.version,7);
assert.deepEqual(B.normalize(JSON.parse(JSON.stringify(s))),s);
const receive=(state,id,tier)=>B.resolve({...state,pending:{id,tier}},true).state;
s=receive({},'pea',0);assert.equal(points(s),300);
s=receive(s,'pea',0);assert.equal(points(s),300,'duplicate does not add');
s=receive(s,'pea',1);assert.equal(points(s),380);assert.equal(B.collectionGain({...s,pending:{id:'pea',tier:2}},'species'),120);
s=receive(s,'pea',2);assert.equal(points(s),500);assert.equal(B.collectionScore(s).rankIndex,1);
s=receive(s,'pea',1);assert.equal(points(s),500);assert.equal(B.collectionGain({...s,pending:{id:'pea',tier:1}},'species'),0);
while(s.reserve.length)s=B.recycleReserve(s,0).state;assert.equal(points(s),500,'best tier survives all holdings recycled');assert.equal(s.speciesBestTier.pea,2);
let rejected=B.resolve({...s,pending:{id:'mimosa',tier:2}},false).state;assert.equal(points(rejected),500);assert(!rejected.speciesKnown.includes('mimosa'));
for(const e of B.ENVIRONMENTS.filter(e=>e.id!=='canyon')){let start=B.normalize({environmentPending:e.id});const bonus=B.ENVIRONMENT_POINTS[e.grade];assert.equal(B.collectionGain(start,'environment'),bonus);let got=B.resolveEnvironment(start,true).state;assert.equal(points(got),200+bonus);got=B.chooseEnvironment(got,e.id);assert.equal(points(got),200+bonus);got=B.resolveEnvironment({...got,environmentPending:e.id},true).state;assert.equal(points(got),200+bonus);assert.equal(B.collectionGain({...got,environmentPending:e.id},'environment'),0);assert.equal(points(B.resolveEnvironment(start,false).state),200);}
const full=B.normalize({speciesKnown:B.SPECIES.map(c=>c.id),speciesBestTier:Object.fromEntries(B.SPECIES.map(c=>[c.id,2])),environmentsOwned:B.ENVIRONMENTS.map(e=>e.id)}),all=B.collectionScore(full);assert.equal(all.total,52200);assert.equal(all.maximum,all.total);assert.equal(all.next,null);assert.equal(all.progress,100);
assert.equal(points({speciesKnown:['pea'],speciesBestTier:{pea:-10,grass:NaN,bad:2},total:999999}),300);assert.equal(points({speciesKnown:['pea'],speciesBestTier:{pea:1.5}}),300);
const snapshot=JSON.stringify(full);B.collectionScore(full);B.collectionGain(full,'species');assert.equal(JSON.stringify(full),snapshot);
console.log('PASS score rules, old-save migration, best-tier retention, duplicate/upgrade/recycle/pending, all background grades, rank boundaries, maximum, invalid data, purity');
