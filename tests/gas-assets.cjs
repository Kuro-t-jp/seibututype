const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let delivered='';const context={Utilities:{base64Decode:s=>Buffer.from(s,'base64'),newBlob:(bytes,type,name)=>({bytes,type,name}),ungzip:blob=>({getDataAsString:encoding=>{assert.equal(encoding,'UTF-8');assert.equal(blob.type,'application/gzip');return require('node:zlib').gunzipSync(blob.bytes).toString('utf8')}})},HtmlService:{createTemplateFromFile(name){return {getRawContent:()=>fs.readFileSync(`dist/gas/${name}.html`,'utf8')}},createHtmlOutputFromFile(name){return {getContent:()=>fs.readFileSync(`dist/gas/${name}.html`,'utf8').replace(/<!--[\s\S]*?-->/g,'').replace('const ART={};','const ART= {};')}},createHtmlOutput(html){delivered=html;return {setTitle(){return this},addMetaTag(){return this}}}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('Code.gs','utf8'),context);context.doGet();
assert(delivered.includes('const ART='),'compressed HTML must survive GAS comment removal and restore the application');
const local=fs.readFileSync('index.html','utf8');
const images=html=>JSON.parse(html.match(/const ART=(\{.*?\});/s)[1]);
const actual=images(delivered),expected=images(local),optimized=JSON.parse(fs.readFileSync('assets/biome-gas-runtime/manifest.json'));
assert.deepEqual(Object.keys(actual),Object.keys(expected));
const records=new Map(optimized.records.map(r=>[r.id,r]));
for(const [key,value] of Object.entries(actual)){
 assert(value.startsWith('data:image/webp;base64,'),'all GAS artwork must be embedded: '+key);
 const bytes=Buffer.from(value.split(',')[1],'base64');assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 if(records.has(key)){const r=records.get(key);assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),r.sha256);assert.equal(bytes.length,r.bytes);assert(bytes.length<=r.beforeBytes);}
 else assert.equal(value,expected[key]);
}
assert.equal(Object.keys(actual).length,require('../src/biome.js').SPECIES.length+require('../src/biome.js').ENVIRONMENTS.length);
assert(optimized.bytes<optimized.sourceBytes*.65,'meaningful delivery reduction');
const uploadBytes=fs.readdirSync('dist/gas').filter(x=>/\.(html|gs|json)$/.test(x)&&x!=='SHA256.json').reduce((n,name)=>n+fs.statSync('dist/gas/'+name).size,0);assert(uploadBytes<10400000);

assert.equal(delivered.replace(/const ART=\{.*?\};/s,'const ART={};'),local.replace(/const ART=\{.*?\};/s,'const ART={};'));
assert(!delivered.includes('/*BIOME_ART_DATA*/'));
console.log('PASS GAS asset assembly: all species and environment images, no external image URLs; lightweight copies verified; non-image HTML unchanged; upload within size guard');
module.exports={delivered};
