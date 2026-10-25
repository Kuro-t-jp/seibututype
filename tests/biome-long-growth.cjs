const assert=require('node:assert/strict'),B=require('../src/biome.js');
const old={observation:[0,1,2,3,5,7,10,13,17,21,26,32],plant:[0,1,2,3,5,7,10,13,17,21,26,32],animal:[0,1,2,4,6,9,12,16,20,25,31,38],tree:[0,1,3,5,8,12,17,23,30,38,47,58]};
for(const c of B.SPECIES){const marks=old[c.tree?'tree':c.kind],key=B.slotKey(c.kind);for(let growth=0;growth<=marks[11];growth++){
 const step=marks.filter(x=>x<=growth).length-1,percent=step===11?100:Math.floor(100*(growth-marks[step])/(marks[step+1]-marks[step]));
 const raw={environment:B.HABITATS.species[c.id][0]||'canyon',version:5,[key]:[{id:c.id,growth,tier:2}],reserve:[{id:c.id,growth,tier:0}],pending:{id:c.id,growth,tier:1},day:67,study:4,xp:83,speciesKnown:[c.id],speciesBestTier:{[c.id]:2},environmentsOwned:['canyon','tundra',B.HABITATS.species[c.id][0]].filter(Boolean)},snapshot=JSON.stringify(raw),s=B.normalize(raw);
 assert.equal(s.version,7);assert.equal(JSON.stringify(raw),snapshot);assert.equal(s.day,67);assert.equal(s.study,4);assert.equal(s.xp,83);assert.equal(s.speciesBestTier[c.id],2);assert(s.environmentsOwned.includes('tundra'));
 for(const item of [s[key][0],s.reserve[0],s.pending]){const p=B.progress(item,s);assert.equal(p.step,step+1,c.id+' '+growth);assert(p.percent>=percent);assert.equal(p.done,growth===marks[11]);}
 assert.deepEqual(B.normalize(JSON.parse(JSON.stringify(s))),s,'growth conversion must be idempotent');
 }}
for(const [id,total,fastTotal] of [['grass',800,600],['hopper',1000,750],['pine',1500,1125],['ecoli',800,600]]){
 const key=B.slotKey(B.species(id).kind),index=key==='plants'?1:0;
 const seed=tier=>B.normalize({version:6,environment:'satoyama',soil:100,moisture:100,plants:[{id:'grass',age:6}], [key]:key==='plants'?[{id:'grass',age:6},{id,growth:0,tier}]:[{id,growth:0,tier}]});
 let s=seed(0),one=B.learn(s,5);assert.equal(B.progress(one[key][index],one).step,2);s=B.learn(s,160);assert(!B.progress(s[key][index],s).done);assert.equal(B.progress(s[key][index],s).totalQuestions,total);
 s=B.learn(seed(0),total-1);assert(!B.progress(s[key][index],s).done);s=B.learn(s,1);assert(B.progress(s[key][index],s).done);
 let fast=B.learn(seed(2),fastTotal-1);assert(!B.progress(fast[key][index],fast).done);fast=B.learn(fast,1);assert(B.progress(fast[key][index],fast).done);
 const stock=B.normalize({version:6,reserve:[{id,growth:0,tier:0}]});assert.equal(B.learn(stock,total).reserve[0].growth,0);
}
let raw=B.normalize({version:6,plants:[{id:'grass',growth:10}],reserve:[{id:'pine',growth:84}],pending:{id:'ecoli',growth:6}});assert.equal(raw.plants[0].growth,10);assert.equal(raw.reserve[0].growth,84);assert.equal(raw.pending.growth,6);
console.log('PASS all 156 species at every old growth value: stage/percentage/completion preserved, stock/pending migration, idempotence; 800/1000/1500 totals, first-five feedback, support pacing, no stock growth');
