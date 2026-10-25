const assert=require('node:assert/strict');
const B=require('../src/biome.js');
let s=B.normalize({environment:'satoyama'});assert.equal(B.scenery(s).cover,0);assert.equal(B.scenery(s).name,'はじまりの荒原');
let placed=B.place(s,0,'grass',0);s=placed.state;assert.equal(placed.coins,0);assert.equal(s.starter,true);assert.equal(s.plants[0].age,0);
assert.throws(()=>B.place(s,0,'grass',1),/探索/);assert.throws(()=>B.place(s,100,'pine',0),/場所/);
let before=JSON.stringify(s);let learning=B.learn(s,4);assert.equal(learning.day,0);assert.equal(learning.study,4);assert.equal(JSON.stringify(s),before);
s=B.learn(learning,1);assert.equal(s.day,1);assert.equal(s.plants[0].age,1);assert.equal(B.stage(s.plants[0]),1);assert.equal(s.xp,5);
assert.deepEqual(B.requirements(s,'hopper'),[]);assert.ok(B.requirements(s,'butterfly').length);assert.throws(()=>B.place(s,100,'butterfly',0),/環境/);
s.reserve.push({id:'hopper',age:0,growth:0,tier:0});s=B.place(s,100,'hopper',0).state;s=B.learn(s,1000);assert.equal(s.animals[0].age,6);assert.equal(s.plants[0].age,6);assert.ok(!B.scenery(s).name.includes('森'));
s=B.remove(s,'plant',0);assert.equal(s.reserve[0].age,6);assert.equal(s.plants[0],null);placed=B.place(s,0,'grass',4);s=placed.state;assert.equal(s.plants[4].age,6);assert.equal(s.reserve.length,0);
s.reserve.push({id:'rape',age:0,growth:0,tier:0});s=B.place(s,100,'rape',0).state;s.moisture=8;s.weather='sun';s=B.learn(s,10);assert.equal(s.plants[0].age,0);
s.weather='rain';s=B.learn(s,5);assert.equal(s.plants[0].age,1);assert.equal(B.requirements(s,'butterfly').length,0);
s.reserve.push({id:'butterfly',age:0,growth:0,tier:0});s=B.place(s,100,'butterfly',1).state;s=B.learn(s,5);assert.equal(B.species('butterfly').stages[B.stage(s.animals[1])],'幼虫');s=B.learn(s,105);assert.equal(B.species('butterfly').stages[B.stage(s.animals[1])],'さなぎ');
let stock=B.normalize();for(const [roll,tier] of [[0,0],[.8599,0],[.86,1],[.9899,1],[.99,2],[.999,2]]){let calls=0;const r=B.draw(stock,24,()=>calls++?0:roll);assert.equal(r.state.pending.tier,tier);assert.equal(r.coins,0);}
assert.throws(()=>B.draw(stock,23),/コイン/);assert.throws(()=>B.draw(stock,24,()=>1),/抽選/);
let r=B.draw(stock,48,()=>.99);assert.ok(['plant','observation'].includes(B.species(r.state.pending.id).kind));assert.throws(()=>B.draw(r.state,r.coins),/先に/);
const restored=B.normalize(JSON.parse(JSON.stringify(r.state)));assert.deepEqual(restored.pending,r.state.pending);
let kept=B.resolve(restored,true).state;assert.equal(kept.reserve.length,1);assert.equal(kept.pending,null);assert.throws(()=>B.resolve(kept,true),/未整理/);
let recycled=B.resolve(restored,false);assert.equal(recycled.gained,24);assert.equal(recycled.state.xp,24);assert.equal(recycled.state.reserve.length,0);
stock.xp=460;assert.equal(B.level(stock),6);assert.equal(B.draw(stock,24,()=>.96).state.pending.tier,2);
let checked=B.check(s,'grass');assert.equal(checked.xp,s.xp+2);assert.throws(()=>B.check(checked,'grass'),/ボーナス/);assert.throws(()=>B.check(s,'squirrel'),/ボーナス/);
assert.deepEqual(B.normalize({plants:[{id:'frog',age:5}],animals:[{id:'grass',age:2}],reserve:[{id:'bad'}],weather:'evil',moisture:-5}).plants,Array(6).fill(null));
const grown=B.normalize({...s,plants:[{id:'pine',age:6,tier:0},{id:'oak',age:6,tier:0},{id:'rape',age:6,tier:0},{id:'clover',age:6,tier:0},{id:'grass',age:6,tier:0},{id:'pine',age:6,tier:0}]});assert.equal(B.scenery(grown).cover,100);assert.match(B.scenery(grown).name,/森/);
assert.equal(B.normalize({xp:45,version:1}).xp,45);assert.ok(B.SPECIES.every(s=>B.QUESTIONS[s.id]));
console.log('PASS biome: growth thresholds, habitat dependencies, no mutation, stock/replant, RNG boundaries, pending recovery, XP, migration, distinct meadow/forest, knowledge bonus');

// Pace, all twelve milestones, partial progress, and legacy data preservation.
for(const [id,total] of [['grass',800],['pine',1500],['hopper',1000]]){
 const key=B.species(id).kind==='plant'?'plants':'animals';
 let state=B.normalize({environment:'satoyama',version:3,moisture:100,soil:100,plants:[{id:'grass',age:6,tier:0}]});
 state[key][key==='plants'?1:0]={id,age:0,growth:0,tier:0};
 const index=key==='plants'?1:0, seen=new Set([1]);
 for(let q=1;q<=total;q++){
  state=B.learn(state,1);const p=B.progress(state[key][index],state);seen.add(p.step);
  if(q===4)assert.equal(p.questions,1);
  if(q===5)assert.equal(p.step,2);
  if(q===30)assert.ok(!p.done,'not already mature after 30 questions');
  if(q<total)assert.ok(!p.done);
 }
 assert.equal(B.progress(state[key][index],state).done,true);assert.equal(seen.size,12);
}
for(const c of B.SPECIES)for(let age=0;age<=6;age++){
 const state=B.normalize({version:2,reserve:[{id:c.id,age,tier:2}],pending:{id:c.id,age,tier:1},xp:32,day:5,study:3});
 assert.equal(state.version,7);assert.equal(state.reserve[0].age,age);assert.equal(state.pending.age,age);
 assert.equal(B.stage(state.reserve[0]),age===0?0:age<3?1:age<6?2:3);
 assert.deepEqual(B.normalize(state),state);assert.equal(state.study,3);assert.equal(state.xp,32);
}
let fast=B.normalize({plants:[{id:'grass',age:0,growth:0,tier:2}],day:2,study:4});
assert.equal(B.progress(fast.plants[0],fast).questions,1);fast=B.learn(fast,1);assert.equal(fast.plants[0].growth,2);
let dry=B.normalize({environment:'satoyama',plants:[{id:'rape',age:0,growth:0,tier:0}],moisture:8,weather:'sun'});
assert.ok(B.progress(dry.plants[0],dry).paused);dry=B.learn(dry,50);assert.equal(dry.plants[0].growth,0);
let seed=B.normalize({environment:'satoyama',soil:0,plants:[{id:'pine',growth:0,tier:0}],animals:[{id:'squirrel',growth:0,tier:0}]});
let chunked=seed;for(let i=0;i<600;i++)chunked=B.learn(chunked,5);
let bulk=B.learn(seed,3000);assert.deepEqual(bulk.plants,chunked.plants);assert.deepEqual(bulk.animals,chunked.animals);assert.equal(bulk.animals[0].age,6);
let one=B.learn(B.place(B.normalize(),0,'grass',0).state,17);let saved=B.normalize(JSON.parse(JSON.stringify(one)));assert.deepEqual(saved,one);
let removed=B.remove(saved,'plant',0);let returned=B.place(removed,0,'grass',2).state;assert.equal(returned.plants[2].growth,one.plants[0].growth);
console.log('PASS fine growth: 12 milestones, 800/1000/1500-question pacing, early feedback, v2 migration at all species/ages, partial save, support, paused growth, bulk dependencies');
