const assert=require('node:assert/strict'),fs=require('node:fs'),B=require('../src/biome.js'),rows=require('../data/biome-classroom.json');
assert.equal(rows.length,12);assert.equal(B.SPECIES.filter(x=>x.classroom).length,60);
for(const c of rows){
 assert(B.species(c.id));assert.equal(c.stages.length,4);assert.equal(B.QUESTIONS[c.id].answers.length,3);
 assert.equal(new Set(B.QUESTIONS[c.id].answers).size,3);assert(B.QUESTIONS[c.id].explanation);
 assert.match(c.sourceUrl,/^https:\/\//);assert(fs.statSync(`assets/biome-runtime/species-${c.id}.webp`).size>1000);
 const s=B.normalize({moisture:100,soil:100,plants:[{id:'grass',age:6}],reserve:[{id:c.id,age:0,tier:0}]});
 const placed=B.place(s,0,c.id,c.kind==='plant'?1:0).state;
 const grown=B.learn(placed,300),item=(c.kind==='plant'?grown.plants:grown.animals).find(p=>p?.id===c.id);
 assert.equal(item.age,6,c.id);assert.equal(B.check(grown,c.id).xp,grown.xp+2);
}
assert.equal(B.species('marchantia').stages[0],'無性芽');assert.equal(B.species('elodea').stages[0],'茎の断片');
assert.match(B.species('silkworm').stages[2],/まゆ/);
console.log('PASS 12 original classroom species, stages, source-linked learning, quizzes, placement, complete growth and bonus');
