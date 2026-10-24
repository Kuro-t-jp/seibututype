/* A deliberately simplified, learning-paced habitat game; never a real ecology model. */
(function(root){
'use strict';
const SPECIES=[
 {id:'grass',kind:'plant',name:'ススキ',icon:'🌾',cost:12,water:8,soil:0,tree:false,stages:['種','芽生え','若い株','穂のある株'],icons:['∙','🌱','🌿','🌾'],term:'生産者',fact:'イネ科の植物。光合成で有機物をつくり、草食性の昆虫などを支えます。'},
 {id:'rape',kind:'plant',name:'アブラナ',icon:'🌼',cost:16,water:25,soil:8,tree:false,stages:['種','芽生え','葉が広がる','開花'],icons:['∙','🌱','🌿','🌼'],term:'完全変態',fact:'モンシロチョウの幼虫はアブラナ科の植物の葉を食べます。成虫は花の蜜を利用します。'},
 {id:'clover',kind:'plant',name:'シロツメクサ',icon:'☘️',cost:16,water:25,soil:8,tree:false,stages:['種','芽生え','葉が広がる','開花'],icons:['∙','🌱','☘️','☘️'],term:'相利共生',fact:'マメ科の植物。根粒菌との共生は、植物と微生物の関係を学ぶ手がかりになります。'},
 {id:'pine',kind:'plant',name:'アカマツ',icon:'🌲',cost:28,water:15,soil:12,tree:true,stages:['種','芽生え','若木','成木'],icons:['∙','🌱','🌲','🌲'],term:'陽樹',fact:'陽樹の例。開けた場所の強い光を利用して育ちます。種子はニホンリスの食物にもなります。'},
 {id:'oak',kind:'plant',name:'コナラ',icon:'🌳',cost:32,water:35,soil:20,tree:true,stages:['どんぐり','芽生え','若木','成木'],icons:['🌰','🌱','🌳','🌳'],term:'落葉広葉樹',fact:'秋に葉を落とす広葉樹。落ち葉などの有機物は、分解者の働きで分解されます。'},
 {id:'butterfly',kind:'animal',name:'モンシロチョウ',icon:'🦋',cost:20,stages:['卵','幼虫','さなぎ','成虫'],icons:['🥚','🐛','◒','🦋'],term:'完全変態',fact:'卵 → 幼虫 → さなぎ → 成虫と変化する完全変態。幼虫と成虫では食物も異なります。'},
 {id:'hopper',kind:'animal',name:'ショウリョウバッタ',icon:'🦗',cost:20,stages:['卵','幼虫','育った幼虫','成虫'],icons:['🥚','🦗','🦗','🦗'],term:'不完全変態',fact:'イネ科の草を利用します。バッタの仲間は、さなぎの時期をもたない不完全変態をします。'},
 {id:'frog',kind:'animal',name:'ニホンアマガエル',icon:'🐸',cost:28,stages:['卵','オタマジャクシ','子ガエル','成体'],icons:['🥚','●','🐸','🐸'],term:'変態',fact:'止水域などに産卵し、幼生は水中で育ちます。変態すると、体の形や生活のしかたが変わります。'},
 {id:'bird',kind:'animal',name:'シジュウカラ',icon:'🐦',cost:34,stages:['ひな','巣立ちびな','若鳥','成鳥'],icons:['🐣','🐤','🐦','🐦'],term:'食物網',fact:'樹洞などに巣をつくり、昆虫などを食べます。植物と昆虫と鳥のつながりを考えてみよう。'},
 {id:'squirrel',kind:'animal',name:'ニホンリス',icon:'🐿️',cost:38,stages:['幼い子リス','子リス','若いリス','成体'],icons:['🐿️','🐿️','🐿️','🐿️'],term:'種子散布',fact:'マツ類などの種子を食べ、貯蔵もします。運ばれた種子の一部は、種子散布につながります。'}
];
const QUESTIONS={
 grass:{q:'ススキが生産者と呼ばれる理由は？',answers:['光合成によって有機物をつくる','他の植物を食べる','遺体だけを分解して育つ']},
 rape:{q:'モンシロチョウの幼虫を支えるアブラナの部分は？',answers:['葉','花の蜜だけ','根だけ']},
 clover:{q:'マメ科植物と根粒菌の関係として学ぶものは？',answers:['共生','捕食','同じ種の個体どうしの競争']},
 pine:{q:'陽樹であるアカマツが育つときに必要とする光は？',answers:['比較的強い光','常に光がない状態','光の強さは無関係']},
 oak:{q:'落ち葉の有機物を分解する生物は？',answers:['細菌や菌類などの分解者','光だけを利用する生産者だけ','全く存在しない']},
 butterfly:{q:'完全変態の順序は？',answers:['卵 → 幼虫 → さなぎ → 成虫','卵 → さなぎ → 幼虫 → 成虫','卵 → 幼虫 → 成虫（さなぎなし）']},
 hopper:{q:'バッタの不完全変態にない段階は？',answers:['さなぎ','卵','幼虫']},
 frog:{q:'カエルの幼生が育つ場所は？',answers:['水中','乾いた地面の上だけ','樹木の幹の中だけ']},
 bird:{q:'植物・昆虫・シジュウカラの食物のつながりとして適切なのは？',answers:['植物を食べる昆虫を、鳥が食べる','鳥が植物の光合成を代行する','昆虫はすべて鳥の落ち葉を食べる']},
 squirrel:{q:'リスが種子を運んで貯蔵することと関係するのは？',answers:['種子散布','光合成','窒素固定']}
};
const catalog=typeof module==='object'&&module.exports?require('./biome-catalog.js'):root.BiomeCatalog;
SPECIES.push(...catalog.species);Object.assign(QUESTIONS,catalog.questions);
const school=typeof module==='object'&&module.exports?require('../data/biome-school-expansion.json').concat(require('../data/biome-extra-expansion.json'),require('../data/biome-more-expansion.json')):root.BiomeSchoolExpansion;
for(const {question,answers,explanation,card,...item} of school){SPECIES.push(item);QUESTIONS[item.id]={q:question,answers,explanation};}
const slotKey=kind=>{const key={plant:'plants',animal:'animals',observation:'observations'}[kind];if(!key)throw Error('種類を確認してください。');return key;};
const ENVIRONMENT_GROUPS=[['canyon','waterside','highland','rivergravel','satoyama'],['oasis','coast','limestone','stream','deciduousfloor'],['volcanic','peat','coniferfloor','evergreenfloor','savanna'],['tidalflat','rainforestfloor','mangrovecoast','tundra','snowmelt']];
const ENVIRONMENT_GRADES=['C · ノーマル','B · レア','A · スーパーレア','S · スペシャル'];
const ENVIRONMENT_ODDS=[[80,16,3.5,.5],[78,17.5,3.8,.7],[76,19,4.1,.9],[74,20.5,4.4,1.1],[72,22,4.7,1.3],[70,23,5.5,1.5]],ENVIRONMENT_XP=[6,12,24,40],ENVIRONMENT_COST=24;
const ENVIRONMENTS=catalog.environments.map(e=>({...e,grade:ENVIRONMENT_GROUPS.findIndex(g=>g.includes(e.id))}));
const environment=id=>ENVIRONMENTS.find(e=>e.id===id);
const COST=24,XP=[6,12,24],TIERS=['小さな発見','うれしい発見','大きな発見'];
const THRESHOLDS=[0,25,70,150,280,460],ODDS=[[86,13,1],[84,14.5,1.5],[82,16,2],[80,17.5,2.5],[78,19,3],[76,20,4]];
const WEATHER={sun:{name:'晴れ',icon:'☀️',water:-6,temp:26},cloud:{name:'くもり',icon:'☁️',water:4,temp:22},rain:{name:'雨',icon:'🌧️',water:22,temp:20}};
const integer=v=>Number.isSafeInteger(v)&&v>=0?v:0;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const species=id=>SPECIES.find(s=>s.id===id);
// Twelve game milestones; biological life stages remain species-specific.
const GROWTH={observation:[0,1,2,3,5,7,10,13,17,21,26,32],plant:[0,1,2,3,5,7,10,13,17,21,26,32],animal:[0,1,2,4,6,9,12,16,20,25,31,38],tree:[0,1,3,5,8,12,17,23,30,38,47,58]};
const AGES=[0,1,1,2,3,3,4,4,5,5,5,6],LEGACY_STEPS=[0,1,3,4,6,9,11];
const growthSteps=id=>{const c=species(id);return GROWTH[c.tree?'tree':c.kind];};
function validItem(v){
 if(!v||!species(v.id))return null;
 const marks=growthSteps(v.id),growth=Number.isSafeInteger(v.growth)&&v.growth>=0?clamp(v.growth,0,marks[11]):marks[LEGACY_STEPS[clamp(integer(v.age),0,6)]];
 const step=marks.filter(n=>growth>=n).length-1;
 return {id:v.id,age:AGES[step],growth,tier:clamp(integer(v.tier),0,2)};
}
function progress(item,s){
 const p=validItem(item),marks=growthSteps(p.id),step=marks.filter(n=>p.growth>=n).length-1,done=step===11;
 let growth=p.growth,days=0;
 if(!done)while(growth<marks[step+1]){days++;growth+=1+(p.tier===2&&(s.day+days)%3===0?1:0);}
 return {step:step+1,done,percent:done?100:Math.floor((p.growth-marks[step])/(marks[step+1]-marks[step])*100),questions:done?0:days*5-s.study,paused:!done&&requirements(s,p.id).length>0,totalQuestions:marks[11]*5};
}
function normalize(raw={}){
 if(!raw||typeof raw!=='object')raw={};
 const legacyEnvironment=environment(raw.environment)?raw.environment:'canyon';
 const environmentsOwned=[...new Set(['canyon',...(Array.isArray(raw.environmentsOwned)?raw.environmentsOwned.filter(id=>environment(id)):[legacyEnvironment])])];
 const activeEnvironment=environmentsOwned.includes(legacyEnvironment)?legacyEnvironment:'canyon';
 const slots=(key,count,kind)=>Array.from({length:count},(_,i)=>{const x=validItem(raw[key]?.[i]);return x&&species(x.id).kind===kind?x:null;});
 const plants=slots('plants',6,'plant'),animals=slots('animals',4,'animal'),observations=slots('observations',4,'observation'),reserve=Array.isArray(raw.reserve)?raw.reserve.map(validItem).filter(Boolean):[];
 // Preserve the collection after moving or recycling an individual. Migrate existing holdings.
 const speciesKnown=[...new Set(['grass',...(Array.isArray(raw.speciesKnown)?raw.speciesKnown.filter(id=>species(id)):[]),...[...plants,...animals,...observations,...reserve].filter(Boolean).map(p=>p.id),...SPECIES.filter(c=>raw.checked?.[c.id]===true).map(c=>c.id)])];
 return {version:4,speciesKnown,environment:activeEnvironment,environmentsOwned,environmentPending:environment(raw.environmentPending)&&raw.environmentPending!=='canyon'?raw.environmentPending:null,environmentDraws:integer(raw.environmentDraws),xp:integer(raw.xp),day:integer(raw.day),study:integer(raw.study)%5,moisture:clamp(Number.isFinite(raw.moisture)?raw.moisture:15,8,100),soil:clamp(Number.isFinite(raw.soil)?raw.soil:10,0,100),weather:WEATHER[raw.weather]?raw.weather:'rain',plants,animals,observations,reserve,pending:validItem(raw.pending),draws:integer(raw.draws),starter:!!raw.starter,checked:Object.fromEntries(SPECIES.filter(s=>raw.checked?.[s.id]===true).map(s=>[s.id,true])),log:Array.isArray(raw.log)?raw.log.filter(s=>typeof s==='string').slice(-6):[]};
}
function level(s){return THRESHOLDS.filter(n=>s.xp>=n).length;}
function stage(item){return item.age===0?0:item.age<3?1:item.age<6?2:3;}
function has(s,id,age=1){return s.plants.some(p=>p&&p.id===id&&p.age>=age);}
function requirements(s,id){
 const c=species(id),needs=[];
 if(!c)throw Error('種類が見つかりません。');
 if(c.kind==='plant'){
  if(s.moisture<c.water)needs.push(`水分 ${c.water} 以上`);
  if(s.soil<c.soil)needs.push(`土の豊かさ ${c.soil} 以上`);
 }else if(c.kind==='animal'){
  // Game thresholds only, not husbandry advice or a food-web simulation.
  if(c.aquatic&&s.moisture<55)needs.push('水分 55 以上の水辺');
  if(c.group==='other'&&!c.aquatic&&!s.plants.some(p=>p&&p.age>=1))needs.push('芽生え以降の植物');
  if(c.group==='insect'&&!s.plants.some(p=>p&&p.age>=1))needs.push('芽生え以降の植物');
  if(c.group==='bird'&&!s.plants.some(p=>p&&p.age>=3))needs.push('育った植物');
  if(c.id==='hare'&&!s.plants.some(p=>p&&p.age>=1))needs.push('芽生え以降の植物');
  if(id==='butterfly'&&!has(s,'rape'))needs.push('芽生え以降のアブラナ');
  if(id==='hopper'&&!has(s,'grass'))needs.push('芽生え以降のススキ');
  if(id==='frog'){
   if(s.moisture<45)needs.push('水分 45 以上の水辺');
   if(!s.animals.some(a=>a&&['butterfly','hopper'].includes(a.id)&&a.age>=1))needs.push('幼虫以降の昆虫');
  }
  if(id==='bird'){
   if(!s.plants.some(p=>p&&species(p.id).tree&&p.age>=3))needs.push('若木以降の樹木');
   if(!s.animals.some(a=>a&&['butterfly','hopper'].includes(a.id)&&a.age>=1))needs.push('幼虫以降の昆虫');
  }
  if(id==='squirrel'&&!has(s,'pine',6))needs.push('成木のアカマツ');
 }
 return needs;
}
function log(s,message){s.log=[...s.log,message].slice(-6);}
function tick(raw){
 const s=normalize(raw);s.day++;
 s.moisture=clamp(s.moisture+WEATHER[s.weather].water,8,100);
 s.soil=clamp(s.soil+(s.plants.some(p=>p&&p.age>=3)?3:1),0,100);
 for(const key of ['plants','animals','observations'])for(const item of s[key]){
  if(!item||item.age>=6||requirements(s,item.id).length)continue;
  const before=progress(item,s).step;
  Object.assign(item,validItem({...item,growth:item.growth+1+(item.tier===2&&s.day%3===0?1:0)}));
  if(progress(item,s).step!==before)log(s,`${species(item.id).name}：${species(item.id).kind==='observation'?'観察進度':'育成'} ${progress(item,s).step}/12「${species(item.id).stages[stage(item)]}」へ！`);
 }
 return s;
}
function learn(raw,count){
 let s=normalize(raw);count=integer(count);s.xp+=count;s.study+=count;
 const days=Math.floor(s.study/5);s.study%=5;
 // All growth reaches its cap within 58 eligible days; allow extra time for soil and chained habitat dependencies.
 for(let i=0;i<Math.min(days,200);i++)s=tick(s);
 if(days>200)s.day+=days-200;
 if(days)log(s,`学習 ${count} 問が景色の時間を ${days} 日進めました。`);
 return s;
}
function scenery(s){
 const plants=s.plants.filter(Boolean),grown=plants.filter(p=>p.age>=3),trees=grown.filter(p=>species(p.id).tree),mature=plants.filter(p=>p.age===6);
 const cover=Math.min(100,Math.round(plants.reduce((sum,p)=>sum+(progress(p,s).step-1),0)/66*100));
 let name='はじまりの荒原';
 if(plants.length)name=cover<15?'芽生えを待つ土地':cover<40?'緑が広がる土地':trees.length>=2?(mature.length>=3?'木々が育つ森':'若い森'):'花と草の広場';
 return {name,cover,trees:trees.length,species:new Set([...s.plants,...s.animals].filter(Boolean).map(p=>p.id)).size};
}
function place(raw,coins,id,slot){
 const s=normalize(raw),c=species(id);if(!c)throw Error('種類が見つかりません。');
 const key=slotKey(c.kind);
 if(!Number.isInteger(slot)||slot<0||slot>=s[key].length||s[key][slot])throw Error('空いている場所を選んでください。');
 // Seeds may be planted while dry, but animals need a habitat before arrival.
 if(c.kind==='animal'&&requirements(s,id).length)throw Error('先に必要な生息環境を整えよう。');
 const stock=s.reserve.findIndex(x=>x.id===id);
 const free=id==='grass'&&!s.starter;
 if(stock<0&&!free)throw Error('探索で出会った生物をストックしてから配置しよう。');
 const item=stock>=0?s.reserve.splice(stock,1)[0]:{id,age:0,growth:0,tier:0};
 if(free)s.starter=true;
 s[key][slot]=item;log(s,`${c.name}を${c.kind==='plant'?'植えました':'迎えました'}。学習で成長を見守ろう。`);
 return {state:s,coins};
}
function remove(raw,kind,slot){
 const s=normalize(raw),key=slotKey(kind),item=s[key][slot];
 if(!item)throw Error('対象がありません。');
 s.reserve.push(item);s[key][slot]=null;log(s,`${species(item.id).name}を控えのエリアへ移しました。成長は保存されています。`);return s;
}
function tend(raw,coins,kind){
 if(coins<8)throw Error('8 コインが必要です。');
 const s=normalize(raw);
 if(kind==='water'){s.moisture=clamp(s.moisture+25,8,100);log(s,'水辺を整えました。水分 +25。');}
 else if(kind==='soil'){s.soil=clamp(s.soil+15,0,100);log(s,'土を整えました。土の豊かさ +15。');}
 else throw Error('操作を確認してください。');
 s.xp+=2;return {state:s,coins:coins-8};
}
function draw(raw,coins,rng=Math.random){
 const s=normalize(raw);if(s.pending||s.environmentPending)throw Error('先に発見を受け取るか、経験に変えてください。');
 if(coins<COST)throw Error('コインが足りません。');
 const random=()=>{const n=rng();if(!Number.isFinite(n)||n<0||n>=1)throw Error('抽選をやり直してください。');return n;};
 const odds=ODDS[level(s)-1],r=random()*100,tier=r<odds[0]?0:r<odds[0]+odds[1]?1:2;
 const candidates=SPECIES.filter(c=>c.kind==='plant'||!requirements(s,c.id).length);
 s.pending=validItem({id:candidates[Math.floor(random()*candidates.length)].id,age:tier===1?1:0,tier});s.draws++;
 return {state:s,coins:coins-COST};
}
function chooseEnvironment(raw,id){
 const s=normalize(raw);if(!environment(id)||!s.environmentsOwned.includes(id))throw Error('景色の探索で獲得してから選ぼう。');
 s.environment=id;return s;
}
function drawEnvironment(raw,coins,rng=Math.random){
 const s=normalize(raw);if(s.pending||s.environmentPending)throw Error('先に発見を受け取るか、経験に変えてください。');
 if(!Number.isSafeInteger(coins)||coins<ENVIRONMENT_COST)throw Error('コインが足りません。');
 const random=()=>{const n=rng();if(!Number.isFinite(n)||n<0||n>=1)throw Error('抽選をやり直してください。');return n;};
 const odds=ENVIRONMENT_ODDS[level(s)-1],roll=random()*100;
 let total=0,grade=0;for(;grade<3;grade++){total+=odds[grade];if(roll<total)break;}
 const pool=ENVIRONMENTS.filter(e=>e.grade===grade&&e.id!=='canyon');
 s.environmentPending=pool[Math.floor(random()*pool.length)].id;s.environmentDraws++;
 return {state:s,coins:coins-ENVIRONMENT_COST};
}
function resolveEnvironment(raw,keep){
 const s=normalize(raw),e=environment(s.environmentPending);if(!e)throw Error('未整理の景色はありません。');
 const duplicate=s.environmentsOwned.includes(e.id),gained=!keep||duplicate?ENVIRONMENT_XP[e.grade]:0;
 if(keep&&!duplicate)s.environmentsOwned.push(e.id);
 s.xp+=gained;s.environmentPending=null;
 log(s,gained?`${e.name}の探索記録を経験へ。+${gained} XP。`:`新しい景色「${e.name}」を獲得しました。背景から選べます。`);
 return {state:s,gained,duplicate};
}
function resolve(raw,keep){
 const s=normalize(raw);if(!s.pending)throw Error('未整理の発見はありません。');
 const item=s.pending,gained=keep?0:XP[item.tier];
 if(keep){s.reserve.push(item);if(!s.speciesKnown.includes(item.id))s.speciesKnown.push(item.id);}s.xp+=gained;s.pending=null;
 log(s,keep?`${species(item.id).name}をストックしました。好きな場所に配置できます。`:`発見の記録を次の育成へ。+${gained} XP。`);
 return {state:s,gained};
}
function recycleReserve(raw,index){
 const s=normalize(raw);
 if(!Number.isInteger(index)||index<0||index>=s.reserve.length)throw Error('対象のストックがありません。');
 const item=s.reserve.splice(index,1)[0],gained=XP[item.tier];s.xp+=gained;
 log(s,`${species(item.id).name}の記録を経験に変えました。+${gained} XP。`);
 return {state:s,gained};
}
function check(raw,id){
 const s=normalize(raw);
 if(!species(id)||s.checked[id]||![...s.plants,...s.animals,...s.observations,...s.reserve].some(x=>x?.id===id))throw Error('この確認ボーナスは受け取れません。');
 s.checked[id]=true;s.xp+=2;return s;
}
const api={slotKey,SPECIES,QUESTIONS,ENVIRONMENTS,ENVIRONMENT_GRADES,ENVIRONMENT_ODDS,ENVIRONMENT_XP,ENVIRONMENT_COST,environment,chooseEnvironment,drawEnvironment,resolveEnvironment,COST,XP,TIERS,THRESHOLDS,ODDS,WEATHER,GROWTH,species,normalize,level,stage,progress,requirements,tick,learn,scenery,place,remove,tend,draw,resolve,recycleReserve,check};
if(typeof module==='object'&&module.exports)module.exports=api;else root.Biome=api;
})(typeof globalThis==='object'?globalThis:this);
