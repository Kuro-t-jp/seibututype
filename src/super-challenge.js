/* A separate, exhaustive ledger; normal practice never marks a course complete. */
const SUPER_KEY='seibutuSuperChallenge_v1';
const SUPER_KINDS={type:'タイピング',quiz:'4択クイズ',recall:'記述クイズ',thinking:'思考問題',five:'5択演習'};
const SUPER_SUBJECTS={basic:'生物基礎',advanced:'生物'};
const superCatalog={};
for(const [course,subject] of Object.entries(SUPER_SUBJECTS)){
 const inScope=q=>CURRICULUM[q.unit]?.subject===subject||q.unit==='P';
 const words=WORDS.filter(inScope);
 superCatalog[course]={type:words,quiz:words.filter(w=>QUIZ_CHOICES[w.t]),recall:words,thinking:THINKING.filter(inScope),five:FIVE.filter(inScope)};
}
const superKey=(kind,item)=>kind+':'+(item.t||item.id);
function sanitizeSuperProgress(raw){
 const next={};
 for(const course of Object.keys(SUPER_SUBJECTS)){
  const old=raw?.[course],answers={};
  for(const [kind,items] of Object.entries(superCatalog[course]))for(const item of items){
   const key=superKey(kind,item),r=old?.answers?.[key];
   if(r&&typeof r.clean==='boolean')answers[key]={clean:r.clean};
  }
  next[course]={round:Number.isSafeInteger(old?.round)&&old.round>0?old.round:1,lastKind:Object.hasOwn(SUPER_KINDS,old?.lastKind)?old.lastKind:'type',answers};
 }
 return next;
}
let superProgress=sanitizeSuperProgress({}),superStorageOK=true;
try{superProgress=sanitizeSuperProgress(JSON.parse(localStorage.getItem(SUPER_KEY)||'{}'));}catch(e){superStorageOK=false;}
function superStats(course){
 const answers=superProgress[course].answers;
 const phases=Object.entries(superCatalog[course]).map(([kind,items])=>({kind,items,left:items.filter(q=>!answers[superKey(kind,q)]),weak:items.filter(q=>answers[superKey(kind,q)]?.clean===false)}));
 const total=phases.reduce((n,p)=>n+p.items.length,0),left=phases.reduce((n,p)=>n+p.left.length,0),weak=phases.reduce((n,p)=>n+p.weak.length,0);
 return {phases,total,done:total-left,left,weak};
}
let superSnapshot=JSON.stringify(superProgress);
function saveSuperProgress(){
 try{
  const raw=JSON.parse(localStorage.getItem(SUPER_KEY)||'{}'),before=JSON.parse(superSnapshot);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid progress');
  const latest=sanitizeSuperProgress(raw);
  if(!latest||typeof latest!=='object'||Array.isArray(latest))throw Error('Invalid progress');
  const next=mergeRecordChanges(latest,before,superProgress);
  for(const course of Object.keys(SUPER_SUBJECTS)){
    if((latest[course]?.round||1)>superProgress[course].round)throw Error('別のタブで次の周回が始まっています。学習を中断して再読み込みしてください。');
    if(superProgress[course].round>before[course].round)next[course]=superProgress[course];
    next[course]??=superProgress[course];
  }
  const text=JSON.stringify(next);localStorage.setItem(SUPER_KEY,text);superProgress=next;superSnapshot=text;superStorageOK=true;
 }catch(e){superStorageOK=false;showSaveProblem('超挑戦の進捗が未保存です。'+(e.message.startsWith('別のタブ')?e.message:'この画面を閉じずに保存を再試行してください。'));}
 renderSuperLive();
}
function activeSuperRun(){return G?.running&&G.superChallenge?G:T?.running&&T.superChallenge?T:null;}
function renderSuperLive(){
 const run=activeSuperRun(),bar=$('superLive');bar.classList.toggle('hidden',!run);if(!run)return;
 const {course,kind,review}=run.superChallenge,s=superStats(course);
 $('superLiveTitle').textContent=`超挑戦 · ${SUPER_SUBJECTS[course]}全部 · ${SUPER_KINDS[kind]}${review?'の解き直し':''}`;
 $('superLiveProgress').max=s.total;$('superLiveProgress').value=s.done;
 $('superLiveCount').textContent=`全体 ${s.done} / ${s.total}問 · 未回答 ${s.left}問 · 要復習 ${s.weak}問`;
 $('superSaveStatus').textContent=superStorageOK?'確定した回答を自動保存。いつでも中断・再開できます。':'進捗を保存できません。再読み込みすると今回の変更が失われます。';
 if(run===T)$('thinkProgress').textContent=`超挑戦 · ${SUPER_SUBJECTS[course]}全部 · ${SUPER_KINDS[kind]}${review?'（解き直し）':''} · ${T.index+1} / ${T.items.length}問`;
 else if(kind!=='quiz')$('gameModeName').textContent=`超挑戦 · ${SUPER_SUBJECTS[course]}全部 · ${SUPER_KINDS[kind]}`;
}
window.refreshSuperRunLabel=renderSuperLive;
function recordSuperAnswer(run,item,row){
 const info=run?.superChallenge;if(!info||!run.running||row.incomplete)return;
 const {course,kind}=info;
 if(!superCatalog[course][kind].includes(item))return;
 superProgress[course].answers[superKey(kind,item)]={clean:!!row.ok&&!row.hinted&&!row.uncertain&&!row.revealed};
 saveSuperProgress();
}
window.recordSuperWord=row=>recordSuperAnswer(G,row.word,row);
window.recordSuperThinking=(q,row)=>recordSuperAnswer(T,q,row);
function nextSuperPhase(course,review){
 const s=superStats(course),field=review?'weak':'left',last=superProgress[course].lastKind;
 return s.phases.find(p=>p.kind===last&&p[field].length)||s.phases.find(p=>p[field].length);
}
function startSuperChallenge(course,kind,review=false){
 if(!Object.hasOwn(SUPER_SUBJECTS,course)||G?.running||T?.running||countdownId!==null)return;
 const s=superStats(course),phase=kind?s.phases.find(p=>p.kind===kind):nextSuperPhase(course,review);
 if(!phase)return;const items=review?phase.weak:phase.left;if(!items.length)return;
 superProgress[course].lastKind=phase.kind;saveSuperProgress();
 const info={course,kind:phase.kind,review,previousMode:{...mode}};
 if(['type','quiz','recall'].includes(phase.kind)){
  playMode=phase.kind;mode={type:'learn',val:items.length};practiceTerms=items.slice();
  document.querySelectorAll('.play').forEach(b=>b.classList.toggle('active',b.dataset.play===playMode));
  document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode==='learn'));
  countdownStart();G.superChallenge=info;
 }else{
  launchThinkingMode(phase.kind==='five');$('thinkMode').value='learn';
  beginThinking(items,true);T.superChallenge=info;
 }
 $('superResult').classList.add('hidden');$('superThinkResult').classList.add('hidden');renderSuperLive();
}
function finishSuperRun(run,thinking=false){
 const box=$(thinking?'superThinkResult':'superResult');box.replaceChildren();box.classList.toggle('hidden',!run.superChallenge);
 if(!thinking)$('againBtn').classList.toggle('hidden',!!run.superChallenge);
 renderSuperLive();if(!run.superChallenge)return;
 const {course,review,previousMode}=run.superChallenge;if(!thinking){
  mode=previousMode;document.querySelectorAll('.mode').forEach(b=>{const selected=b.dataset.mode===mode.type&&Number(b.dataset.val)===mode.val;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
 }
 const s=superStats(course),title=document.createElement('h3'),p=document.createElement('p');
 title.textContent=!s.left?`${SUPER_SUBJECTS[course]}全部 · 全${s.total}問に挑戦しました！`:'超挑戦の進み具合';
 p.textContent=`${s.done} / ${s.total}問に回答 · 残り ${s.left}問 · 要復習 ${s.weak}問。${superStorageOK?'続きから再開できます。':'進捗を保存できていません。再読み込みしないでください。'}`;box.append(title,p);
 const next=nextSuperPhase(course,review&&s.weak>0);
 if(next){const button=document.createElement('button');button.className='btn';button.textContent=`${review&&s.weak?'解き直し':'超挑戦'}の続き：${SUPER_KINDS[next.kind]}`;button.onclick=()=>startSuperChallenge(course,undefined,review&&s.weak>0);box.appendChild(button);}
 if(!s.left&&s.weak&&!review){const b=document.createElement('button');b.className='btn';b.textContent=`要復習の${s.weak}問を解き直す`;b.onclick=()=>startSuperChallenge(course,undefined,true);box.appendChild(b);}
 const menu=document.createElement('button');menu.className='btn ghost';menu.textContent='超挑戦の一覧へ';menu.onclick=()=>{show('start');window.revealPracticeSection?.('superChallenge');$('superChallenge').scrollIntoView({block:'start',behavior:'instant'});$('superTitle').focus({preventScroll:true});};box.appendChild(menu);
}
window.finishSuperRun=finishSuperRun;
function renderSuperDashboard(){
 $('superStorageNotice').textContent=superStorageOK?'進捗は科目ごとに、このブラウザへ保存します。':'保存領域を利用できません。進捗は再読み込みすると失われる可能性があります。';
 for(const course of Object.keys(SUPER_SUBJECTS)){
  const s=superStats(course),card=$('super-'+course);card.replaceChildren();
  const h=document.createElement('h3');h.textContent=SUPER_SUBJECTS[course]+'全部';
  const subtitle=document.createElement('p');subtitle.className='super-course-count';subtitle.textContent=`全${s.total}問 · ${superProgress[course].round}周目`;
  const progress=document.createElement('progress');progress.max=s.total;progress.value=s.done;progress.setAttribute('aria-label',h.textContent+'の回答済み問題数');
  const status=document.createElement('p');status.textContent=`回答済み ${s.done}問 ／ 未回答 ${s.left}問 ／ 要復習 ${s.weak}問`;
  const phases=document.createElement('div');phases.className='super-phases';
  for(const phase of s.phases){const row=document.createElement('div'),text=document.createElement('span'),btn=document.createElement('button');
   text.textContent=`${SUPER_KINDS[phase.kind]}　${phase.items.length-phase.left.length} / ${phase.items.length}問`;
   btn.className='btn ghost small';btn.dataset.kind=phase.kind;btn.textContent=phase.left.length?'ここから挑戦':'回答済み';btn.disabled=!phase.left.length;btn.onclick=()=>startSuperChallenge(course,phase.kind);row.append(text,btn);phases.appendChild(row);
  }
  const actions=document.createElement('div');actions.className='super-course-actions';
  const start=document.createElement('button');start.className='btn super-start';start.textContent=s.left?(s.done?'続きから挑戦する':'全問に挑戦する'):'全問に回答済み';start.disabled=!s.left;start.onclick=()=>startSuperChallenge(course);actions.appendChild(start);
  if(s.weak){const weak=document.createElement('button');weak.className='btn ghost';weak.textContent=`要復習 ${s.weak}問を解き直す`;weak.onclick=()=>startSuperChallenge(course,undefined,true);actions.appendChild(weak);}
  const list=document.createElement('details'),sum=document.createElement('summary');sum.textContent='未回答・要復習の問題を確認';list.appendChild(sum);
  for(const phase of s.phases){const group=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`${SUPER_KINDS[phase.kind]}：未回答 ${phase.left.length}問・要復習 ${phase.weak.length}問`;group.appendChild(summary);
   group.addEventListener('toggle',()=>{if(!group.open||group.dataset.loaded)return;group.dataset.loaded='1';const ul=document.createElement('ul');for(const q of [...phase.left,...phase.weak]){const li=document.createElement('li');li.textContent=`${phase.left.includes(q)?'未回答':'要復習'}：${q.t||q.title}`;ul.appendChild(li);}group.appendChild(ul);});list.appendChild(group);
  }
  const formats=document.createElement('details'),formatTitle=document.createElement('summary');formatTitle.textContent='形式を選んで挑戦する';formats.className='super-format-options';formats.append(formatTitle,phases);
  card.append(h,subtitle,progress,status,actions,formats,list);
  if(!s.left){const again=document.createElement('button');again.className='btn ghost small super-new-round';again.textContent='次の周回を始める（超挑戦の進捗を0に戻す）';again.onclick=()=>{superProgress[course]={round:superProgress[course].round+1,lastKind:'type',answers:{}};saveSuperProgress();renderSuperDashboard();};card.appendChild(again);}
 }
}
window.refreshSuperChallenge=renderSuperDashboard;
$('superPause').onclick=()=>{const run=activeSuperRun();if(!run)return;if(run===G)endGame();else finishThinking(false);};
renderSuperDashboard();

window.flushAuxRecords=()=>{
 if(!notebookStorageOK)persistNotebook();
 if(!superStorageOK)saveSuperProgress();
 return notebookStorageOK&&superStorageOK;
};
window.hasPendingStudyRecords=()=>pendingLearningAnswers.length>0||pendingThinkingAnswers.length>0||!notebookStorageOK||!superStorageOK;
