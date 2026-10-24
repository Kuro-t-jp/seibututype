/* Unit coverage describes recorded practice, never predicted exam performance. */
const NOTEBOOK_KEY='seibutuNotebook_v1';
let studyNotebook={},notebookStorageOK=true,labExpanded=false,notebookLimit=6;
const notebookDrafts={};
const notebookQuestions=[...THINKING,...FIVE];
try{
 const raw=JSON.parse(localStorage.getItem(NOTEBOOK_KEY)||'{}');
 for(const q of notebookQuestions){const r=raw?.[q.id];if(r&&typeof r==='object'){
  const note=typeof r.note==='string'?r.note.slice(0,500):'',star=r.star===true;
  if(note||star)studyNotebook[q.id]={note,star,updated:Number.isFinite(r.updated)?Math.max(0,r.updated):0};
 }}
}catch(e){notebookStorageOK=false;}
function persistNotebook(){
 try{localStorage.setItem(NOTEBOOK_KEY,JSON.stringify(studyNotebook));notebookStorageOK=true;}catch(e){notebookStorageOK=false;}
 $('notebookSaveStatus').textContent=notebookStorageOK?'このブラウザに保存しました。':'保存できません。今の画面では使えますが、再読み込みすると変更が失われます。';
 $('questionBookmarkStatus').textContent=notebookStorageOK?'このブラウザに保存しました。':'保存できません。再読み込みすると変更が失われます。';
}
function setNotebookEntry(q,change){
 if(!notebookQuestions.includes(q))return;
 const row={note:'',star:false,...studyNotebook[q.id],...change,updated:Date.now()};
 row.note=String(row.note).slice(0,500);
 if(Object.hasOwn(change,'note'))delete notebookDrafts[q.id];
 if(row.note||row.star)studyNotebook[q.id]=row;else delete studyNotebook[q.id];
 persistNotebook();refreshQuestionBookmark();renderNotebook();
}
function refreshQuestionBookmark(){
 const q=T?.running?T.items[T.index]:null,star=!!studyNotebook[q?.id]?.star;
 $('questionBookmark').textContent=star?'しおりを外す':'解き直し用にしおりをつける';
 $('questionBookmark').setAttribute('aria-pressed',String(star));
}
window.refreshQuestionBookmark=refreshQuestionBookmark;
window.captureQuestionNote=(q,note)=>{if(note.trim())setNotebookEntry(q,{note:note.trim().slice(0,500),star:true});};
window.appendQuestionBookmark=(node,q)=>{
 const button=document.createElement('button');button.className='btn ghost small result-bookmark';
 const status=document.createElement('span');status.className='lab-footnote';status.setAttribute('role','status');
 const sync=()=>{const star=!!studyNotebook[q.id]?.star;button.textContent=star?'しおりを外す':'解き直し用にしおりをつける';button.setAttribute('aria-pressed',String(star));};
 sync();button.onclick=()=>{setNotebookEntry(q,{star:!studyNotebook[q.id]?.star});sync();status.textContent=notebookStorageOK?' 保存しました。':' 保存できません。再読み込みすると変更が失われます。';};
 node.insertBefore(button,node.children[1]);
 button.after(status);
};
$('questionBookmark').onclick=()=>{if(T?.running){const q=T.items[T.index];setNotebookEntry(q,{star:!studyNotebook[q.id]?.star});}};
function unitPracticeState(kind=$('mapPractice').value,subject=$('mapSubject').value,now=Date.now()){
 return Object.entries(CURRICULUM).filter(([id,u])=>subject==='all'||u.subject===subject||id==='P').map(([id,u],index)=>{
  const words=WORDS.filter(w=>w.unit===id&&(kind!=='quiz'||QUIZ_CHOICES[w.t]));
  const due=Learning.queue(words,LEARNING,kind,'due',now),fresh=words.filter(w=>!Learning.lane(LEARNING,w.t,kind).attempts);
  return {id,...u,index,words,due,fresh,waiting:words.length-due.length-fresh.length};
 }).filter(u=>u.words.length).sort((a,b)=>b.due.length-a.due.length||a.index-b.index);
}
function renderUnitMap(){
 const units=unitPracticeState(),all=units.reduce((r,u)=>({due:r.due+u.due.length,total:r.total+u.words.length,fresh:r.fresh+u.fresh.length}),{due:0,total:0,fresh:0});
 $('mapSummary').textContent=`${all.due}語が復習の時期 · ${all.total-all.fresh} / ${all.total}語に回答済み`;
 $('unitMapList').replaceChildren();
 for(const u of (labExpanded?units:units.slice(0,3))){
  const node=document.createElement('article');node.className='unit-map-item';node.dataset.unit=u.id;
  node.innerHTML=`<div class="unit-map-label"><small>${escapeHtml(u.subject)}</small><span>${u.due.length?'復習 '+u.due.length+'語':u.fresh.length===u.words.length?'これから':'練習中'}</span></div><h4>${escapeHtml(u.title)}</h4><div class="unit-map-bar" aria-hidden="true"><i style="width:${u.due.length/u.words.length*100}%"></i><i style="width:${u.waiting/u.words.length*100}%"></i></div><p>要復習 ${u.due.length} · 復習日待ち ${u.waiting} · 未回答 ${u.fresh.length}</p>`;
  const button=document.createElement('button');button.className='btn ghost small';
  const candidates=u.due.length?u.due:u.fresh.length?u.fresh:u.words;
  button.textContent=`${Math.min(10,candidates.length)}語を${u.due.length?'復習する':'練習する'}`;
  button.setAttribute('aria-label',`${u.title}：${button.textContent}`);
  button.onclick=()=>{if(G?.running||T?.running)return;retryLearning(shuffle(candidates).slice(0,10),$('mapPractice').value);};
  node.appendChild(button);$('unitMapList').appendChild(node);
 }
 $('mapExpand').classList.toggle('hidden',units.length<=3);$('mapExpand').textContent=labExpanded?'3単元にたたむ':`全${units.length}単元を見る`;$('mapExpand').setAttribute('aria-expanded',String(labExpanded));
}
function launchNotebookQuestion(q){
 if(T?.running||G?.running)return;
 launchThinkingMode(FIVE.includes(q));$('thinkMode').value='learn';beginThinking([q]);
}
function renderNotebook(){
 const search=$('notebookSearch').value.trim().toLocaleLowerCase(),kind=$('notebookKind').value;
 const entries=notebookQuestions.filter(q=>studyNotebook[q.id]&&(kind==='all'||(kind==='five')===FIVE.includes(q))&&`${q.title} ${CURRICULUM[q.unit].title} ${studyNotebook[q.id].note}`.toLocaleLowerCase().includes(search)).sort((a,b)=>studyNotebook[b.id].updated-studyNotebook[a.id].updated);
 const count=Object.keys(studyNotebook).length;
 $('notebookCount').textContent=String(count);$('notebookSummary').textContent=`${count}問を保存 · 表示対象 ${entries.length}問`;
 $('notebookEmpty').classList.toggle('hidden',!!entries.length);$('notebookEmpty').textContent=count?'条件に合う問題がありません。検索語や問題の種類を変えてください。':'演習中の「しおり」や根拠メモが、ここに集まります。次に解くとき、前のメモは問題画面に表示しません。';
 $('notebookList').replaceChildren();
 for(const q of entries.slice(0,notebookLimit)){
  const row=studyNotebook[q.id],node=document.createElement('article');node.className='notebook-item';node.dataset.question=q.id;
  const h=thinkingHistory[q.id],status=!h?'未回答':!h.ok?'前回は誤答':h.uncertain?'前回は自信なし':'前回は正解';
  node.innerHTML=`<div class="notebook-item-heading"><div><small>${FIVE.includes(q)?'5択':'思考問題'} · ${escapeHtml(CURRICULUM[q.unit].title)} · ${status}</small><h4>${escapeHtml(q.title)}</h4></div></div>`;
  const actions=document.createElement('div');actions.className='notebook-item-actions';
  const start=document.createElement('button');start.className='btn small';start.textContent='答えを見ずに解き直す';start.onclick=()=>launchNotebookQuestion(q);
  const star=document.createElement('button');star.className='btn ghost small';star.textContent=row.star?'しおりを外す':'しおりをつける';star.setAttribute('aria-pressed',String(row.star));
  star.onclick=()=>{setNotebookEntry(q,{star:!row.star});const next=$('notebookList').querySelector(`[data-question="${q.id}"] .notebook-item-actions button:nth-child(2)`);(next||$('notebookSearch')).focus({preventScroll:true});};
  actions.append(start,star);node.appendChild(actions);
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=row.note?'前のメモを確認・編集する':'解き直しのメモを書く';
  const label=document.createElement('label');label.textContent='次に気をつける条件・考え方（500文字まで）';
  const input=document.createElement('textarea');input.rows=3;input.maxLength=500;input.value=notebookDrafts[q.id]??row.note;input.oninput=()=>{notebookDrafts[q.id]=input.value;};
  const save=document.createElement('button');save.className='btn ghost small';save.textContent='メモを保存';
  save.onclick=()=>{delete notebookDrafts[q.id];setNotebookEntry(q,{note:input.value.trim()});$('notebookSaveStatus').focus({preventScroll:true});};
  label.appendChild(input);details.append(summary,label,save);node.appendChild(details);$('notebookList').appendChild(node);
 }
 $('notebookMore').classList.toggle('hidden',entries.length<=notebookLimit);
}
function showStudyLab(view){
 window.revealPracticeSection?.('studyLab');
 const notebook=view==='notebook';
 for(const [id,selected] of [['mapTab',!notebook],['notebookTab',notebook]])$(id).setAttribute('aria-pressed',String(selected));
 $('mapPanel').classList.toggle('hidden',notebook);$('notebookPanel').classList.toggle('hidden',!notebook);
 refreshStudyLab();
}
function refreshStudyLab(){
 if(!$('unitMapList').contains(document.activeElement))renderUnitMap();
 if(!$('notebookList').contains(document.activeElement))renderNotebook();
}
window.refreshStudyLab=refreshStudyLab;
$('mapTab').onclick=()=>showStudyLab('map');$('notebookTab').onclick=()=>showStudyLab('notebook');
for(const id of ['mapSubject','mapPractice'])$(id).onchange=()=>{labExpanded=false;renderUnitMap();};
$('mapExpand').onclick=()=>{labExpanded=!labExpanded;renderUnitMap();};
for(const id of ['notebookSearch','notebookKind'])$(id).addEventListener(id==='notebookSearch'?'input':'change',()=>{notebookLimit=6;renderNotebook();});
$('notebookMore').onclick=()=>{notebookLimit+=6;renderNotebook();};
$('thinkNotebookHome').onclick=()=>{show('start');showStudyLab('notebook');$('studyLab').scrollIntoView({block:'start',behavior:'instant'});$('notebookTab').focus({preventScroll:true});};
if(!notebookStorageOK)$('notebookSaveStatus').textContent='保存済みのノートを読み込めませんでした。この画面では利用できます。';
refreshStudyLab();
