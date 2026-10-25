const assert=require('node:assert/strict'),B=require('../src/biome.js');
assert.equal(B.SPECIES.length,156);assert.equal(B.ENVIRONMENTS.length,20);assert.equal(new Set(B.SPECIES.map(x=>x.id)).size,156);
let s=B.normalize({environment:'satoyama',version:2,plants:[{id:'grass',age:4}],reserve:[{id:'oak',age:3,tier:2}],xp:22});assert.equal(s.environment,'satoyama');assert.equal(s.plants[0].age,4);assert.equal(s.reserve[0].tier,2);
assert.throws(()=>B.place(s,999999,'pine',1),/探索/);let placed=B.place(s,0,'oak',1);assert.equal(placed.coins,0);assert.equal(placed.state.plants[1].age,3);
const ready=B.normalize({environment:'satoyama',moisture:100,soil:100,plants:[{id:'grass',age:6},{id:'rape',age:6},{id:'pine',age:6}],animals:[{id:'hopper',age:6}]});
const seen=new Set();for(const e of B.ENVIRONMENTS){
 const plants=B.SPECIES.filter(c=>c.kind==='plant'&&B.HABITATS.species[c.id].includes(e.id)).slice(0,6).map(c=>({id:c.id,age:6}));
 const state=B.normalize({version:7,environment:e.id,moisture:100,soil:100,plants,animals:[{id:'hopper',age:6},{id:'butterfly',age:6}]});
 for(let i=0;i<400;i++){let call=0;const result=B.draw(state,24,()=>call++?(i+.5)/400:0);seen.add(result.state.pending.id);}
}assert.deepEqual(B.SPECIES.filter(c=>!seen.has(c.id)).map(c=>c.id),[],'all species reachable across appropriate habitats');
for(const c of B.SPECIES){const state=B.normalize({...ready,plants:[],animals:[],reserve:[{id:c.id,age:3,tier:2}],environment:'tundra',environmentsOwned:['canyon','tundra']});const result=B.recycleReserve(state,0);assert.equal(result.gained,24);assert.equal(result.state.reserve.length,0);assert.equal(result.state.environment,'tundra');assert.equal(state.reserve.length,1);assert.deepEqual(B.normalize(JSON.parse(JSON.stringify(state))),state);}
assert.throws(()=>B.recycleReserve(ready,-1));assert.throws(()=>B.recycleReserve(ready,.5));assert.equal(B.normalize({environment:'bad'}).environment,'canyon');console.log('PASS 156 species, 20 environments, acquired-only placement, random availability, stock recycling, save migration');
