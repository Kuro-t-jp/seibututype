const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cards=require('../data/biome-plant-cards.json');
const ctx={Biome:require('../src/biome.js')};Object.assign(cards,Object.fromEntries(require('../data/biome-school-expansion.json').concat(require('../data/biome-more-expansion.json')).filter(x=>x.kind==='plant').map(x=>[x.id,x.card])));
const ids=Array.from(ctx.Biome.SPECIES.filter(c=>c.kind==='plant'),c=>c.id);
assert.equal(ids.length,49);assert.deepEqual(Object.keys(cards).sort(),ids.sort());
for(const [id,c] of Object.entries(cards)){
 for(const k of ['group','topic','signature','appearance','ecology','learning','misconception','question','answer']){assert.equal(typeof c[k],'string',id+':'+k);assert(c[k].length>0,id+':'+k);assert(!/[<>]/.test(c[k]),id+':markup');}
 assert(c.sources.length>0);for(const s of c.sources){assert.equal(new URL(s.url).protocol,'https:');assert(s.label.length>5);}
}
for(const k of ['appearance','ecology','learning','question'])assert.equal(new Set(Object.values(cards).map(c=>c[k])).size,49,k+': distinct content');
assert(cards.plantain.misconception.includes('必ず単子葉類'));assert(cards.lotus.answer.includes('地下茎'));assert(cards.ginkgo.answer.includes('子房'));assert(cards.marchantia.answer.includes('無性芽'));assert(cards.opuntia.misconception.includes('夜だけ'));assert(cards.maize.misconception.includes('カルビン回路'));
console.log('PASS all 49 plant dossiers, individual explanations and recall, references, key biological distinctions');
