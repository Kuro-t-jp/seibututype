const assert=require('node:assert/strict'),B=require('../src/biome.js');
assert.deepEqual(B.normalize().speciesKnown,['grass']);
let s=B.normalize({speciesKnown:['pea','pea','bad'],plants:[{id:'pine',age:2}],reserve:[{id:'butterfly',tier:1}],checked:{daphnia:true,bad:true},environment:'coast'});
for(const id of ['grass','pea','pine','butterfly','daphnia'])assert(s.speciesKnown.includes(id));assert.equal(s.speciesKnown.length,5);assert(s.environmentsOwned.includes('coast'));assert.equal(s.reserve.find(x=>x.id==='pine').age,2);assert.deepEqual(B.normalize(s),s);
let pending=B.normalize({pending:{id:'pea',tier:0,age:0}});assert(!pending.speciesKnown.includes('pea'));
let kept=B.resolve(pending,true).state;assert(kept.speciesKnown.includes('pea'));assert.equal(kept.reserve.length,1);
let recycled=B.recycleReserve(kept,0).state;assert(recycled.speciesKnown.includes('pea'));assert.equal(recycled.reserve.length,0);assert(B.normalize(JSON.parse(JSON.stringify(recycled))).speciesKnown.includes('pea'));
assert(!B.resolve(pending,false).state.speciesKnown.includes('pea'));
console.log('PASS hidden identities, legacy migration, pending reveal, permanent unlock, recycling and save reload');
