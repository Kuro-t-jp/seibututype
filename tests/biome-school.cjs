const assert=require('node:assert/strict'),B=require('../src/biome.js'),rows=require('../data/biome-school-expansion.json');
assert.equal(rows.length,36);assert.equal(rows.filter(c=>c.kind==='plant').length,12);
assert.equal(new Set(B.SPECIES.map(c=>c.id)).size,120);
for(const c of rows.concat(require('../data/biome-extra-expansion.json'))){
 assert.equal(new Set(c.answers).size,3);assert(c.card.answer.includes(c.answers[0]));
 for(const key of ['group','topic','signature','appearance','ecology','learning','misconception','question','answer'])assert(c.card[key]?.length>0,c.id+key);
 assert(c.card.sources.every(s=>new URL(s.url).protocol==='https:'));
 let s=B.normalize({plants:[{id:'grass',age:3}],xp:35,pending:{id:c.id,age:0,tier:0},moisture:100,soil:100});
 s=B.resolve(s,true).state;assert(s.speciesKnown.includes(c.id));
 const key=B.slotKey(c.kind),slot=c.kind==='plant'?1:0;
 s=B.place(s,10,c.id,slot).state;assert.equal(s[key][slot].growth,0);
 const snapshot=JSON.stringify(s);s=B.learn(s,4);assert.equal(s[key][slot].growth,0);s=B.learn(s,1);assert.equal(B.progress(s[key][slot],s).step,2);
 s=B.check(s,c.id);assert.throws(()=>B.check(s,c.id));
 s=B.remove(s,c.kind,slot);assert.equal(s.reserve.length,1);s=B.place(s,10,c.id,slot).state;assert.equal(B.progress(s[key][slot],s).step,2);
 s=B.learn(s,c.tree?285:155);assert(B.progress(s[key][slot],s).done);assert.deepEqual(B.normalize(JSON.parse(JSON.stringify(s))),s);
 s=B.remove(s,c.kind,slot);s=B.recycleReserve(s,0).state;assert(s.speciesKnown.includes(c.id));assert.equal(s.reserve.length,0);
 assert.equal(JSON.parse(snapshot).xp,35);
}
let s=B.normalize({plants:[{id:'grass',age:4}],animals:[{id:'hopper',age:3}],xp:123});assert.equal(s.observations.length,4);assert.equal(s.xp,123);assert.equal(s.plants[0].age,4);
assert.throws(()=>B.remove(s,'invalid',0));
s=B.normalize({observations:[{id:'ecoli',age:0}],weather:'sun',moisture:8});s=B.learn(s,160);assert(B.progress(s.observations[0],s).done);assert.equal(B.scenery(s).cover,0);
console.log('PASS 48 school organisms: cards, stock/placement, 12-step pace, observation independence, bonus, recycling, migration');
