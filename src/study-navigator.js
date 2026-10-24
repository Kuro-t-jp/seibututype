/* Recommendations use recorded attempts; daily count is unique terms + question IDs. */
const STUDY_GOAL_KEY='seibutuStudyGoal_v1';
let studyGoal=10,studyGoalSaved=true;
try{const goal=Number(localStorage.getItem(STUDY_GOAL_KEY));if([10,20,30].includes(goal))studyGoal=goal;}catch(e){studyGoalSaved=false;}
function studyNavigatorState(now=Date.now()){
 const date=new Date(now),start=new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime(),end=new Date(date.getFullYear(),date.getMonth(),date.getDate()+1).getTime();
 const today=stamp=>Number.isFinite(stamp)&&stamp>=start&&stamp<end;
 const doneWords=WORDS.filter(w=>['type','quiz','recall'].some(kind=>today(Learning.lane(LEARNING,w.t,kind).last))).length;
 const dueFor=kind=>Learning.queue(scopedWords().filter(w=>kind!=='quiz'||QUIZ_CHOICES[w.t]),LEARNING,kind,'due',now);
 const recallDue=dueFor('recall'),quizDue=dueFor('quiz');
 const transfer=scopedWords().filter(w=>(Learning.lane(LEARNING,w.t,'type').attempts||Learning.lane(LEARNING,w.t,'quiz').attempts)&&!Learning.lane(LEARNING,w.t,'recall').attempts);
 let recommendation={kind:'type',words:[],title:'最初の10語に触れよう',note:'用語と読みを見ながら、テンポよくタイピング。',button:'10問タイピングを始める'};
 if(recallDue.length||quizDue.length){const kind=recallDue.length?'recall':'quiz',words=kind==='recall'?recallDue:quizDue;recommendation={kind,words,title:`${words.length}語が復習のタイミング`,note:'間違いや自信のない回答、復習日を迎えた用語を優先します。',button:`${Math.min(10,words.length)}語を${kind==='recall'?'記述':'4択'}で復習`};}
 else if(transfer.length)recommendation={kind:'recall',words:transfer,title:'見て覚えた用語を、思い出そう',note:`${transfer.length}語は記述でまだ未確認。説明から用語を思い出す練習へ。`,button:`${Math.min(10,transfer.length)}語を記述で確かめる`};
 else if(scopedWords().some(w=>Learning.lane(LEARNING,w.t,'type').attempts))recommendation.title='新しい用語にも触れよう';
 const weak=bank=>bank.filter(q=>thinkingHistory[q.id]?.ok===false||thinkingHistory[q.id]?.uncertain);
 return {done:doneWords+[...THINKING,...FIVE].filter(q=>today(thinkingHistory[q.id]?.last)).length,recommendation,five:weak(FIVE),thinking:weak(THINKING)};
}
function refreshStudyNavigator(){
 const state=studyNavigatorState(),r=state.recommendation;
 $('dailyCount').textContent=String(state.done);$('dailyGoalValue').textContent=String(studyGoal);$('dailyProgress').max=studyGoal;$('dailyProgress').value=Math.min(state.done,studyGoal);
 $('dailyMessage').textContent=state.done>=studyGoal?'今日の目標に到達！復習の理由も確認しよう。':`あと${studyGoal-state.done}項目。自分のペースで進めよう。`;
 $('dailyGoal').value=String(studyGoal);$('dailySaveNote').textContent=studyGoalSaved?'':'目標設定を保存できません。この画面では変更できます。';
 $('nextStudyTitle').textContent=r.title;$('nextStudyNote').textContent=r.note;$('nextStudyAction').textContent=r.button;$('nextStudyAction').disabled=!scopedWords().length;
 $('homeScope').textContent=`対象：${$('learnSubject').selectedOptions[0].textContent} / ${$('learnUnit').selectedOptions[0].textContent}（${scopedWords().length}語）`;
 for(const [id,items,name] of [['fiveWeakStart',state.five,'5択'],['thinkingWeakStart',state.thinking,'思考問題']]){$(id).disabled=!items.length;$(id).textContent=`${name}の復習 · ${items.length}問`;}
 $('weakStudyNote').textContent=state.five.length+state.thinking.length?'誤答・自信なしの問題から最大3問。1問ずつ解説を確認します。':'復習対象はまだありません。演習すると、ここから苦手に戻れます。';
 window.refreshStudyLab?.();
 window.refreshSuperChallenge?.();
}
window.refreshStudyNavigator=refreshStudyNavigator;
$('dailyGoal').onchange=()=>{studyGoal=Number($('dailyGoal').value);try{localStorage.setItem(STUDY_GOAL_KEY,String(studyGoal));studyGoalSaved=true;}catch(e){studyGoalSaved=false;}refreshStudyNavigator();};
$('nextStudyAction').onclick=()=>{const r=studyNavigatorState().recommendation;if(r.words.length)retryLearning(r.words,r.kind);else $('quickTypeStart').click();};
function beginWeakStudy(five){
 const items=studyNavigatorState()[five?'five':'thinking'];if(!items.length)return;
 launchThinkingMode(five);$('thinkMistakes').checked=true;$('thinkLength').value='3';$('thinkMode').value='learn';thinkingSetup();beginThinking();
}
$('fiveWeakStart').onclick=()=>beginWeakStudy(true);$('thinkingWeakStart').onclick=()=>beginWeakStudy(false);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshStudyNavigator();});
setInterval(()=>{if(document.body.dataset.screen==='start')refreshStudyNavigator();},60000);
// Keep native text entry and IME behavior. One Enter press performs one action.
document.addEventListener('keydown',e=>{
 if(e.key!=='Enter'||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.isComposing||e.target.closest('textarea,input,select,a'))return;
 if(e.repeat){e.preventDefault();return;}
 let action=null;
 if(!$('thinking').classList.contains('hidden')&&T?.running){
   if(T.locked)action=$('thinkNext');
   else if(T.choicesRevealed&&!$('thinkConfirm').classList.contains('hidden')&&!$('thinkConfirm').disabled)action=$('thinkConfirm');
 }else if(G?.running&&G.locked&&mode.type==='learn')action=playMode==='quiz'?$('qNext'):G.recall?$('wordNext'):null;
 const focusedButton=e.target.closest('button');
 if(focusedButton&&!focusedButton.matches('.choice,#thinkConfirm,#thinkNext,#qNext,#wordNext'))return;
 if(action&&!action.classList.contains('hidden')&&!action.disabled){e.preventDefault();action.click();}
});
refreshStudyNavigator();
