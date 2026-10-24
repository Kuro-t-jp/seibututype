const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(){
 const properties={RANKING:'{"old":{"score":99}}'},cache=new Map(),books=new Map();let locked=false,denyLock=false,failWrite=false;
 function sheet(book,name){const obj={name,data:[],maxRows:2,getMaxRows(){return this.maxRows},insertRowsAfter(after,n){this.maxRows+=n},getParent:()=>book,getLastRow(){return this.data.length},setName(n){this.name=n;return this},setFrozenRows(){},getRange(r,c,n=1,m=1){return {
  getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>obj.data[r-1+i]?.[c-1+j]??'')),
  setValues(values){if(failWrite)throw Error('write failed');for(let i=0;i<values.length;i++)for(let j=0;j<values[i].length;j++){(obj.data[r-1+i]??=[])[c-1+j]=values[i][j]}return this},
  setValue(v){return this.setValues([[v]])},setNumberFormat(){return this}
 }}};return obj;}
 const SpreadsheetApp={create(){const id=String(books.size+1),book={id,sheets:[],getId:()=>id,getUrl:()=>`https://docs.google.com/spreadsheets/d/${id}`,getSheets(){return this.sheets},getSheetByName(n){return this.sheets.find(s=>s.name===n)},insertSheet(n){const s=sheet(this,n);this.sheets.push(s);return s}};book.insertSheet('Sheet1');books.set(id,book);return book},openById(id){if(!books.has(id))throw Error('missing book');return books.get(id)},flush(){}};
 const context={console:{log(){}},SpreadsheetApp,Utilities:{getUuid:()=>require('node:crypto').randomUUID(),newBlob:s=>({getBytes:()=>Buffer.from(s)})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties[k]||null,setProperty:(k,v)=>properties[k]=v})},LockService:{getScriptLock:()=>({tryLock(){if(denyLock||locked)return false;locked=true;return true},releaseLock(){locked=false}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},HtmlService:{createTemplateFromFile(file){assert.equal(file,'index');return {getRawContent(){return '<html>legacy</html>'}}},createHtmlOutput(html){return {setTitle(){return this},addMetaTag(){return this}}}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('Code.gs','utf8'),context);
 return {ctx:context,properties,books,cache,deny:v=>denyLock=v,fail:v=>failWrite=v,isLocked:()=>locked};
}
function run(){
 const f=fixture(),s=f.ctx,id='a'.repeat(32),id2='b'.repeat(32),context='v5_count_15_0_000000000_0_all';
 const payload={name:'同じ名前',playerId:id,mode:'quiz',context,score:100,done:10,kpm:120,acc:90};
 assert.equal(s.getAppInfo().rankingReady,false);assert.throws(()=>s.getRanking('','quiz',context,id),/準備中/);s.doGet();
 s.setupApp_();s.setupApp_();assert.equal(f.books.size,1);assert.equal(s.getAppInfo().rankingReady,true);assert.ok(f.properties.RANKING,'legacy data retained');
 let res=s.submitScore(payload);assert.equal(res.myRank,1);assert.equal(res.my.score,100);assert.equal(res.top[0].isMe,true);assert.equal(res.top[0].id,undefined,'browser identifiers never returned');
 s.submitScore(payload);assert.equal(s.rankingSheet_().getLastRow(),2,'duplicate submit is idempotent');
 res=s.submitScore({...payload,playerId:id2,score:200});assert.equal(res.total,2,'same name, different browsers');assert.equal(res.my.score,200);
 res=s.getRanking(payload.name,'quiz',context,id);assert.equal(res.myRank,2);assert.equal(res.my.score,100);assert.equal(res.top[0].isMe,false);
 res=s.submitScore({...payload,score:80});assert.equal(res.my.score,100,'best retained');
 res=s.submitScore({...payload,score:100,kpm:160});assert.equal(res.my.kpm,160,'tie improves speed');
 res=s.submitScore({...payload,name:'=1+2'});assert.equal(res.my.name,'=1+2');assert.equal(s.rankingSheet_().data[1][2],'"=1+2"','formula remains literal JSON');
 assert.equal(s.getRanking('','type',context,id).total,0);
 for(const k of ['v5_time_60_0_000000000_0_all','v5_count_15_1_000000000_0_all','v5_count_15_0_100000000_0_all','v5_count_15_0_000000000_1_all','v5_count_15_0_000000000_1_B2b'])assert.equal(s.getRanking('','quiz',k,id).total,0);
 for(const k of ['',null,'v5_count_15_999_000000000_0_all','v5_count_15_0-1_000000000_0_all','v5_count_15_1-1_000000000_0_all','v5_learn_10_0_000000000_0_all','v5_count_15_0_000000000_1_A2a','v5_count_15_0_000000000_0_B5c'])assert.throws(()=>s.submitScore({...payload,context:k}));
 for(const pair of [['score',Infinity],['score',NaN],['score',-1],['score','100'],['done',16],['kpm',3001],['acc',101],['playerId','__proto__'],['name',''],['mode','x']])assert.throws(()=>s.submitScore({...payload,[pair[0]]:pair[1]}));
 f.deny(true);assert.throws(()=>s.submitScore(payload),/混み合/);f.deny(false);assert.equal(f.isLocked(),false);
 f.fail(true);assert.throws(()=>s.submitScore({...payload,score:500}),/write failed/);f.fail(false);assert.equal(f.isLocked(),false,'lock released after failure');
 assert.equal(s.getRanking('','quiz',context,id).my.score,100);
 s.BIO_MAX_ROWS=2;assert.throws(()=>s.submitScore({...payload,playerId:'c'.repeat(32)}),/上限/);s.submitScore({...payload,score:300});
 s.archiveRankings_();assert.equal(s.getRanking('','quiz',context,id).total,0);assert.equal(f.books.get('1').sheets.length,2);assert.equal(f.books.get('1').sheets[0].getLastRow(),3,'archive preserves scores');assert.ok(f.properties.RANKING);
 const publics=[...fs.readFileSync('Code.gs','utf8').matchAll(/^function (\w+)\(/gm)].map(m=>m[1]).filter(n=>!n.endsWith('_'));
 assert.deepEqual(publics.sort(),['doGet','getAppInfo','getRanking','submitScore'].sort());
 assert.equal(typeof s.resetRanking,'undefined');assert.equal(typeof s.setupApp,'undefined');
 console.log('PASS GAS server: setup, private management, names/IDs, stable bests, retries, scope separation, validation, lock failures, write failures, limits, safe names, archive, legacy preservation');
}
if(require.main===module)run();module.exports={fixture,run};
