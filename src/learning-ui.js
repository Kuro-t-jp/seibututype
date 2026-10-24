const LEARNING_KEY='seibutuLearning_v1';
let LEARNING={}, learningStorageOK=true, practiceTerms=null;
try{LEARNING=Learning.sanitize(JSON.parse(localStorage.getItem(LEARNING_KEY)||'{}'),WORDS);}catch(e){learningStorageOK=false;}
const pendingLearningAnswers=[];
function flushLearningAnswers(){
  if(!pendingLearningAnswers.length)return true;
  try{
    let next=Learning.sanitize(JSON.parse(localStorage.getItem(LEARNING_KEY)||'{}'),WORDS);
    for(const r of pendingLearningAnswers)next=Learning.record(next,r.term,r.kind,r.row,r.at);
    localStorage.setItem(LEARNING_KEY,JSON.stringify(next));LEARNING=next;pendingLearningAnswers.length=0;learningStorageOK=true;return true;
  }catch(e){learningStorageOK=false;return false;}
}
window.flushLearningAnswers=flushLearningAnswers;
function saveLearningAnswer(row){
  const at=Date.now();pendingLearningAnswers.push({term:row.word.t,kind:playMode,row,at});
  LEARNING=Learning.record(LEARNING,row.word.t,playMode,row,at);flushLearningAnswers();
  window.recordSuperWord?.(row);
}
function scopedWords(){return Learning.filter(WORDS,CURRICULUM,{subject:$('learnSubject').value,unit:$('learnUnit').value,cats:[...selCats]});}
function makeLearningQueue(){
  if(practiceTerms){const q=practiceTerms.slice();practiceTerms=null;return shuffle(q);}
  return Learning.queue(shuffle(pool()),LEARNING,playMode,$('learnFocus').value);
}
function updateLearningUnits(){
  const subject=$('learnSubject').value,previous=$('learnUnit').value;
  $('learnUnit').replaceChildren(new Option('すべての単元','all'));
  for(const [id,unit] of Object.entries(CURRICULUM)){
    if(subject==='all'||unit.subject===subject||id==='P')$('learnUnit').add(new Option(`${unit.subject} · ${unit.title}`,id));
  }
  if([...$('learnUnit').options].some(o=>o.value===previous))$('learnUnit').value=previous;
}
function updateLearningDashboard(){
  $('learnFocus').querySelector('[value=due]').textContent=playMode==='type'?'練習した用語をもう一度':'復習の時期が来た用語だけ';
  const scope=scopedWords().filter(w=>playMode!=='quiz'||QUIZ_CHOICES[w.t]),now=Date.now();
  const due=scope.filter(w=>{const r=Learning.lane(LEARNING,w.t,playMode);return r.attempts&&r.due<=now;}).length;
  const fresh=scope.filter(w=>!Learning.lane(LEARNING,w.t,playMode).attempts).length;
  const spaced=scope.filter(w=>Learning.lane(LEARNING,w.t,playMode==='type'?'recall':playMode).stage>=3).length;
  $('learningStats').innerHTML=`<div><b>${due}</b>${playMode==='type'?'練習した語':'復習の時期'}</div><div><b>${fresh}</b>このモードで未回答</div><div><b>${spaced}</b>${playMode==='type'?'記述で3回正答':'日を空けて3回正答'}</div>`;
  const n=pool().length;$('startBtn').disabled=!n;
  $('againBtn').disabled=!n;
  $('learningStatus').textContent=!learningStorageOK?'学習記録を保存できません。このブラウザの保存設定を確認してください。':!n?'この条件の問題はありません。科目・単元・カテゴリや出題の選び方を変えてみよう。':playMode==='type'?'まずは意味と読みを確認。次は記述で、答えを見ずに思い出そう。':due?`今の範囲で${due}語が復習の時期です。自信のない正答も含めて練習しよう。`:'正答した用語は、翌日以降にもう一度。今日は新しい用語にも挑戦しよう。';
  $('summaryCats').firstChild.textContent=`${$('learnSubject').value==='all'?'両科目':$('learnSubject').value} · ${$('learnUnit').value==='all'?(selCats.has('ALL')?'全単元':[...selCats].join('・')):CURRICULUM[$('learnUnit').value].title}`;
  document.querySelectorAll('#catChips .chip').forEach(ch=>{const count=Learning.filter(WORDS,CURRICULUM,{subject:$('learnSubject').value,unit:$('learnUnit').value,cats:[ch.dataset.key]}).filter(w=>playMode!=='quiz'||QUIZ_CHOICES[w.t]).length;ch.querySelector('small').textContent=`${count}語`;});
  window.refreshStudyNavigator?.();
}
function learningExplanation(row){
  const w=row.word,other=row.picked;
  const memory=Learning.lane(LEARNING,w.t,playMode),nextDate=playMode==='type'?'':memory.due<=Date.now()?'今日もう一度':new Date(memory.due).toLocaleDateString('ja-JP',{month:'long',day:'numeric'});
  return `<div class="learning-explanation"><p><strong>${escapeHtml(w.t)}</strong>（${escapeHtml(w.y)}）<br>${escapeHtml(w.m)}</p>${other?`<p><strong>選んだ「${escapeHtml(other.t)}」との違い</strong><br>${escapeHtml(other.m)}</p>`:''}<small>${escapeHtml(CURRICULUM[w.unit].title)} · ${escapeHtml(subjectLabel(w))}${nextDate?` · 次の復習：${nextDate}`:''}</small><p>${playMode==='type'?'意味を自分の言葉で言えるかな？ 次は答えを隠して思い出そう。':!row.ok||row.hinted||row.uncertain?'復習に登録しました。答えを隠したら、もう一度思い出せるかな？':'なぜこの用語なのか、説明の決め手を一つ挙げてから進もう。'}</p></div>`;
}
function nextLearningQuestion(){
  if(!G?.running || !G.locked)return;
  if((playMode==='quiz'?G.answered:G.review.filter(r=>!r.incomplete).length)>=G.targetCount && mode.type!=='time'){endGame('complete');return;}
  if(playMode==='quiz')loadQuestion();else loadWord();
}
function showWordFeedback(row){
  G.locked=true;$('typingInput').disabled=true;$('revealAnswer').disabled=true;$('wordUncertain').disabled=true;
  $('wordFeedback').innerHTML=`${answerReaction(!row.revealed,row.revealed?'答えを確認しよう':G.recall?'解答できました！':'入力クリア！',row.revealed?'読みと意味を確かめて、もう一度思い出そう。':'読みと意味を結びつけて覚えよう。')}${learningExplanation(row)}`;
  $('wordFeedback').classList.remove('hidden');$('wordNext').classList.remove('hidden');$('wordNext').focus({preventScroll:true});revealAnswerReaction('wordFeedback');
}
function retryLearning(words,kind){
  if(!words.length)return;
  playMode=kind;mode={type:'learn',val:10};practiceTerms=words;
  document.querySelectorAll('.play').forEach(b=>b.classList.toggle('active',b.dataset.play===kind));
  document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode==='learn'));
  countdownStart();
}
function renderLearningResult(){
  const rows=G.review.filter(r=>!r.incomplete),weak=[...new Map(G.review.filter(r=>!r.ok||r.hinted||r.uncertain).map(r=>[r.word.t,r.word])).values()];
  const unique=[...new Map(rows.map(r=>[r.word.t,r.word])).values()];
  $('againBtn').disabled=!pool().length;
  $('againBtn').textContent=pool().length?'もう一度 ↻':'この条件の学習は完了';
  const clean=rows.filter(r=>r.ok&&!r.hinted&&!r.uncertain).length;
  $('learningResult').textContent=playMode==='type'?`${unique.length}語の読みと意味に触れました。入力の正確さと、意味を思い出せることは別の力。次は記述クイズで確かめよう。`:`ヒントなし・自信あり・ミスなし：${clean} / ${rows.length}問。復習候補：${weak.length}語。次の復習は、学習画面の「復習の時期」から確認できます。`;
  if(!learningStorageOK)$('learningResult').textContent+=' 記録を保存できませんでした。ブラウザの保存設定を確認してください。';
  $('retryWeak').classList.toggle('hidden',!weak.length);$('retryWeak').textContent=`復習が必要な${weak.length}語をもう一度 →`;
  $('retryWeak').onclick=()=>retryLearning(weak,playMode);
  $('practiceRecall').classList.toggle('hidden',playMode==='recall'||!unique.length);
  $('practiceRecall').onclick=()=>retryLearning(unique,'recall');
}
$('learnSubject').onchange=()=>{updateLearningUnits();updateSelection();};
$('learnUnit').onchange=updateSelection;$('learnFocus').onchange=updateSelection;
$('qNext').onclick=nextLearningQuestion;$('wordNext').onclick=nextLearningQuestion;
$('revealAnswer').onclick=()=>{
  if(!G?.running||!G.recall||G.locked)return;
  const row={word:G.cur,ok:false,hinted:true,revealed:true,uncertain:true};
  G.review.push(row);saveLearningAnswer(row);G.idx++;G.miss++;G.combo=0;
  updateHUD();showWordFeedback(row);
};
updateLearningUnits();
