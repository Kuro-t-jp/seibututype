/* Independent untimed sessions; rewards are awarded once per completed answer set. */
const THINKING = [];
const FIVE = [];
const FIVE_SOURCES = {};
let fiveMode=false;
const fiveFamilies={knowledge:"知識の正確さ",application:"資料・実験への応用"};
const thinkingBank=()=>fiveMode?FIVE:THINKING;
const THINK_KEY='seibutuThinking_v1';
let thinkingHistory={};
try{const h=JSON.parse(localStorage.getItem(THINK_KEY)||'{}');for(const q of [...THINKING,...FIVE])if(h[q.id]&&typeof h[q.id].ok==='boolean')thinkingHistory[q.id]=h[q.id];}catch(e){}
let T=null;
const thinkingKinds={graph:'グラフ',table:'表',text:'文章',mixed:'複数資料'};
const thinkingLevels={foundation:'基礎',standard:'条件整理',challenge:'応用'};
const thinkingSkills={quantify:'数量・割合',compare:'条件比較',integrate:'資料の統合',hypothesis:'仮説・実験計画',evidence:'根拠と結論の限界'};
const thinkingAnswers=q=>q.answers||[q.answer];
function thinkingPool(){return thinkingBank().filter(q=>(!fiveMode||$('fiveFamily').value==='all'||q.family===$('fiveFamily').value)&&($('thinkCollection').value==='all'||q.collection===$('thinkCollection').value)&&($('thinkSubject').value==='all'||CURRICULUM[q.unit].subject===$('thinkSubject').value)&&($('thinkKind').value==='all'||q.kind===$('thinkKind').value)&&($('thinkLevel').value==='all'||q.level===$('thinkLevel').value)&&(fiveMode||$('thinkSkill').value==='all'||q.competency===$('thinkSkill').value)&&(!$('thinkMistakes').checked||thinkingHistory[q.id]?.ok===false||thinkingHistory[q.id]?.uncertain));}
function thinkingSetup(){
 const bank=thinkingBank(),records=bank.filter(q=>thinkingHistory[q.id]).map(q=>thinkingHistory[q.id]);
 const n=thinkingPool().length,attempted=records.length,due=records.filter(r=>!r.ok||r.uncertain).length;
 $('thinkAvailable').textContent=`対象 ${n}問 ／ 学習済み ${attempted} / ${bank.length}問・要復習 ${due}問`;
 $('thinkBegin').disabled=n===0;$('thinkBegin').textContent=n?`${Math.min(n,Number($('thinkLength').value))}問に取り組む`:'対象の問題がありません';
 $('thinkSkills').innerHTML=Object.entries(fiveMode?fiveFamilies:thinkingSkills).map(([id,name])=>{const rows=bank.filter(q=>(fiveMode?q.family:q.competency)===id&&thinkingHistory[q.id]).map(q=>thinkingHistory[q.id]);return `<span>${name}：${rows.length?`${rows.filter(r=>r.ok).length}/${rows.length} 正解`:'未学習'}</span>`;}).join('')+'<small>全科目・各問題の直近の回答。得点予測ではありません。</small>';
}
function openThinking(){configureThinkingMode();show('thinking');$('thinkSetup').classList.remove('hidden');$('thinkRun').classList.add('hidden');$('thinkResult').classList.add('hidden');thinkingSetup();$('thinkTitle').focus();}
const originalThinkingCopy={notice:$('thinkNotice').textContent,intro:$('thinkIntro').textContent};
function configureThinkingMode(){
 $('thinkTitle').textContent=fiveMode?'共通テスト対策・5択演習':'思考問題トレーニング';
 $('thinkNotice').textContent=fiveMode?'5つから1つを選び、回答を確定。知識の正確さと、資料・実験への応用を練習します。独自教材で、実際の入試問題の転載ではありません。':originalThinkingCopy.notice;
 $('thinkIntro').textContent=fiveMode?'「正しい」か「誤っている」かを確認 → 5つを比較 → 自信を確認して回答。知識と応用を混ぜる設定では、両方を含めて出題します。時間制限はありません。':originalThinkingCopy.intro;
 for(const id of ['fiveFamilyLabel','fiveResearch'])$(id).classList.toggle('hidden',!fiveMode);
 for(const id of ['thinkSkillLabel','thinkResearch'])$(id).classList.toggle('hidden',fiveMode);
 for(const option of $('thinkCollection').options){option.hidden=option.disabled=fiveMode&&!['all','rag'].includes(option.value);if(option.value==='rag')option.textContent=`新着：生物RAG参照 ${thinkingBank().filter(q=>q.collection==='rag').length}問`;}
 if($('thinkCollection').selectedOptions[0]?.disabled)$('thinkCollection').value='all';
}
function launchThinkingMode(five){
 if(T?.running)return;fiveMode=five;
 for(const id of ['fiveFamily','thinkCollection','thinkSubject','thinkKind','thinkLevel','thinkSkill','fiveFamily'])$(id).value='all';
 $('thinkMistakes').checked=false;openThinking();
}
function chooseThinkingItems(){
 const pool=thinkingPool(),n=Math.min(pool.length,Number($('thinkLength').value));
 if(!fiveMode||$('fiveFamily').value!=='all')return shuffle(pool).slice(0,n);
 const groups=[shuffle(pool.filter(q=>q.family==='knowledge')),shuffle(pool.filter(q=>q.family==='application'))],result=[];
 while(result.length<n){for(const group of groups){if(group.length&&result.length<n)result.push(group.pop());}}
 return shuffle(result);
}
function beginThinking(requested,exhaustive=false){
 if(T?.running)return;const items=Array.isArray(requested)?[...new Set(requested)].filter(q=>thinkingBank().includes(q)).slice(0,exhaustive===true?thinkingBank().length:10):chooseThinkingItems();if(!items.length)return;
 T={five:fiveMode,running:true,items,index:0,review:[],miss:0,locked:false,up:{...SAVE.up},mode:$('thinkMode').value,started:Date.now()};
 $('thinkSetup').classList.add('hidden');$('thinkResult').classList.add('hidden');$('thinkRun').classList.remove('hidden');loadThinking();
}
function thinkingTable(headers,rows){return `<div class="thinking-table" tabindex="0" aria-label="資料の表。横にスクロールできます"><table><thead><tr>${headers.map(h=>`<th scope="col">${escapeHtml(String(h))}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>i===0?`<th scope="row">${escapeHtml(String(v))}</th>`:`<td>${escapeHtml(String(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function thinkingMaterial(m){let html=(m.graph||m.table)?'<p class="shelf-caption">図表が収まらないときは横にスクロールできます。</p>':'';if(m.graph){const g=m.graph;html+=`<div class="thinking-graph" tabindex="0" aria-label="グラフ。小さい画面では横にスクロールできます">${m.graphSvg}</div><details><summary>グラフの数値を表で確認</summary><p>線は測定点のつながりを示します。点の間の値を実測したものではありません。</p>${thinkingTable([g.xLabel,...g.series.map(s=>s.name+'：'+g.yLabel)],g.x.map((x,i)=>[x,...g.series.map(s=>s.values[i])]))}</details>`;}if(m.table)html+=thinkingTable(m.table.headers,m.table.rows);if(m.text)html+=`<p>${escapeHtml(m.text)}</p>`;return html;}
function loadThinking(){
 const q=T.items[T.index];T.locked=false;T.order=shuffle(q.options.map((_,i)=>i));T.selected=[];T.questionStarted=Date.now();
 $('thinkMeter').max=T.items.length;$('thinkMeter').value=T.index;
 $('thinkProgress').textContent=`${T.index+1} / ${T.items.length}問 · ${thinkingKinds[q.kind]} · ${thinkingLevels[q.level]} · ${CURRICULUM[q.unit].subject}`;
 $('thinkQuestionTitle').textContent=q.title;$('thinkPassage').textContent=q.passage;
 $('thinkMaterial').innerHTML=q.materials?q.materials.map(m=>`<section class="thinking-material"><h4>${escapeHtml(m.title)}</h4>${thinkingMaterial(m)}</section>`).join(''):thinkingMaterial(q);
 $('fiveDirection').classList.toggle('hidden',!T.five);$('fiveDirection').textContent=q.direction==='incorrect'?'誤っている記述を1つ選ぶ':'正しい・最も適切なものを1つ選ぶ';
 $('thinkQuestion').textContent=q.question;$('thinkMemo').value='';$('thinkMemo').disabled=false;
 window.refreshQuestionBookmark?.();$('questionBookmarkStatus').textContent='';
 $('thinkRecallPrompt').textContent=q.recall&&!T.five?'まず自分の言葉で：'+q.recall.prompt:'';
 $('thinkRecallPrompt').classList.toggle('hidden',!q.recall||T.five);
 T.choicesRevealed=T.five||!q.recall;$('thinkChoices').classList.toggle('hidden',!T.choicesRevealed);$('thinkRevealChoices').classList.toggle('hidden',T.choicesRevealed);
 $('thinkUncertain').checked=false;$('thinkUncertain').disabled=false;
 $('thinkFeedback').replaceChildren();$('thinkNext').classList.add('hidden');
 const multi=thinkingAnswers(q).length>1,confirm=T.five||multi;
 $('thinkAnswerGuide').textContent=T.five?'1〜5キーで選択できます。選び直せます。「回答を確定する」で採点します。':multi?'正しいものを二つ選び、回答を確定してください。1〜6キーで選択・解除できます。':'一つ選ぶと回答を確定します。1〜4キーでも回答できます。';
 $('thinkAnswerGuide').textContent+=confirm?' Enterで確定、解説後はEnterで次へ。':' 解説後はEnterで次へ進めます。';
 $('thinkConfirm').classList.toggle('hidden',!confirm||!T.choicesRevealed);$('thinkConfirm').disabled=true;$('thinkConfirm').textContent=`回答を確定する（0 / ${thinkingAnswers(q).length} 選択）`;
 $('thinkChoices').replaceChildren();T.order.forEach((oi,i)=>{const btn=document.createElement('button');btn.className='choice';btn.innerHTML=`<span class="num">${i+1}</span><span>${escapeHtml(q.options[oi].text)}</span>`;if(confirm)btn.setAttribute('aria-pressed','false');btn.onclick=()=>answerThinking(i);$('thinkChoices').appendChild(btn);});
 window.presentQuestionStage?.('thinkRun',T.index+1,T.items.length);
 $('thinkQuestionTitle').focus({preventScroll:true});$('thinkRun').scrollIntoView({block:'start',behavior:'instant'});
 window.refreshSuperRunLabel?.();
}
function thinkingSourceNotes(q){
 const sources=(q.sources||[]).map(id=>FIVE_SOURCES[id]).filter(Boolean);
 if(!sources.length)return '';
 return `<details class="thinking-sources"><summary>根拠・参考教材（${sources.length}件）</summary><ul>${sources.map(source=>{
  const label=escapeHtml(source.title),url=source.url;
  const title=typeof url==='string'&&/^https:\/\//.test(url)?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`:label;
  return `<li>${title}${source.location?` · ${escapeHtml(source.location)}`:''}${source.evidenceId?` · ${escapeHtml(source.evidenceId)}`:''}</li>`;
 }).join('')}</ul>${q.sourcePack==='rag-20261030'?'<p>生物RAGの教材を参照して独自に作問しています。数値モデルは実測値ではありません。原文・原図は掲載していません。</p>':''}</details>`;
}
function thinkingExplanation(q,order=q.options.map((_,i)=>i)){
 const answers=thinkingAnswers(q);return `${q.recall?`<section class="thinking-recall"><h4>自分の言葉で説明：解答例</h4><p>${escapeHtml(q.recall.prompt)}</p><p>${escapeHtml(q.recall.answer)}</p><small>表現の一致ではなく、理由や関係が説明できたかをメモと比べましょう。自動採点は行いません。</small></section>`:''}<p><b>読み取りの視点：${escapeHtml(q.skill)}</b></p><ol>${q.steps.map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ol><details open><summary>${q.options.length}つの選択肢の理由</summary>${order.map((oi,j)=>`<p><b>${j+1}. ${escapeHtml(q.options[oi].text)}${answers.includes(oi)?(q.family?'（選ぶべき選択肢）':'（正解）'):''}</b><br>${escapeHtml(q.options[oi].why)}</p>`).join('')}</details>${thinkingSourceNotes(q)}<small>対応単元：${escapeHtml(CURRICULUM[q.unit].subject)} · ${escapeHtml(CURRICULUM[q.unit].title)}</small>`;
}
function answerThinking(i){
 if(!T?.running||T.locked||!T.choicesRevealed||!Number.isInteger(i)||i<0||i>=T.order.length)return;
 const q=T.items[T.index],picked=T.order[i];
 if(thinkingAnswers(q).length===1&&!T.five){T.selected=[picked];submitThinking();return;}
 if(T.five)T.selected=T.selected.includes(picked)?[]:[picked];
 else
 if(T.selected.includes(picked))T.selected=T.selected.filter(x=>x!==picked);else T.selected.push(picked);
 [...$('thinkChoices').children].forEach((btn,j)=>{const selected=T.selected.includes(T.order[j]);btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',String(selected));});
 $('thinkConfirm').disabled=T.selected.length!==thinkingAnswers(q).length;
 $('thinkConfirm').textContent=`回答を確定する（${T.selected.length} / ${thinkingAnswers(q).length} 選択）`;
}
function submitThinking(){
 if(!T?.running||T.locked)return;const q=T.items[T.index],answers=thinkingAnswers(q);
 if(T.selected.length!==answers.length)return;T.locked=true;$('thinkMeter').value=T.index+1;
 const picked=[...T.selected],ok=picked.every(x=>answers.includes(x)),uncertain=$('thinkUncertain').checked;
 T.review.push({id:q.id,ok,hinted:false,picked,uncertain,order:[...T.order],memo:$('thinkMemo').value,seconds:Math.round((Date.now()-T.questionStarted)/1000)});if(!ok)T.miss++;
 recordThinkingHistory(q.id,ok,uncertain);
 window.captureQuestionNote?.(q,$('thinkMemo').value);
 window.recordSuperThinking?.(q,T.review[T.review.length-1]);
 [...$('thinkChoices').children].forEach((btn,idx)=>{btn.disabled=true;if(T.mode!=='practice'){if(answers.includes(T.order[idx]))btn.classList.add('correct');else if(picked.includes(T.order[idx]))btn.classList.add('wrong');}});
 $('thinkMemo').disabled=true;$('thinkUncertain').disabled=true;$('thinkConfirm').classList.add('hidden');
 $('thinkFeedback').innerHTML=T.mode==='practice'?'<h3>回答を記録しました</h3><p>正誤と解説は最後にまとめて確認します。</p>':`${answerReaction(ok)}${uncertain?'<p>正誤にかかわらず復習に登録しました。</p>':''}${thinkingExplanation(q,T.order)}`;
 $('thinkNext').textContent=T.index+1===T.items.length?'結果を見る（Enter）':'次の問題へ（Enter）';$('thinkNext').classList.remove('hidden');$('thinkFeedback').focus({preventScroll:true});revealAnswerReaction('thinkFeedback');
}
const pendingThinkingAnswers=[];
function flushThinkingAnswers(){
 if(!pendingThinkingAnswers.length)return true;
 try{
  const raw=JSON.parse(localStorage.getItem(THINK_KEY)||'{}'),next={};
  for(const q of [...THINKING,...FIVE])if(typeof raw?.[q.id]?.ok==='boolean')next[q.id]=raw[q.id];
  for(const r of pendingThinkingAnswers)next[r.id]={ok:r.ok,uncertain:r.uncertain,last:r.last,attempts:(Number(next[r.id]?.attempts)||0)+1};
  localStorage.setItem(THINK_KEY,JSON.stringify(next));thinkingHistory=next;pendingThinkingAnswers.length=0;return true;
 }catch(e){return false;}
}
window.flushThinkingAnswers=flushThinkingAnswers;
window.hasPendingStudyRecords=()=>pendingLearningAnswers.length>0||pendingThinkingAnswers.length>0;
function recordThinkingHistory(id,ok,uncertain){
 const last=Date.now();pendingThinkingAnswers.push({id,ok,uncertain,last});
 thinkingHistory[id]={ok,uncertain,last,attempts:(thinkingHistory[id]?.attempts||0)+1};flushThinkingAnswers();
}
function finishThinking(completed){
 if(!T?.running)return;T.running=false;
 const r=coinReward(T,'quiz',completed,T.up);const rewardSaved=saveRunReward(T.review,'quiz',r.total);
 $('thinkRun').classList.add('hidden');$('thinkResult').classList.remove('hidden');
 const correct=T.review.filter(x=>x.ok).length,seconds=Math.round((Date.now()-T.started)/1000);
 $('thinkOutcome').textContent=`${completed?'学習完了':'ここまでの結果'}：${correct} / ${T.review.length}問正解 · ${Math.floor(seconds/60)}分${seconds%60}秒（経過時間）`;
 $('thinkReward').textContent=`+${r.total} コイン（問題 ${r.base}・完走 ${r.finish}・葉緑体 ${r.growth}・ノーミス ${r.perfect}）`;
 if(!rewardSaved){$('thinkReward').textContent+='（未保存・再試行待ち）';$('thinkReward').dataset.rewardUnsaved='true';}
 $('thinkReview').replaceChildren();
 const breakdown=document.createElement('p');breakdown.id='thinkBreakdown';breakdown.textContent=Object.entries(T.five?fiveFamilies:thinkingSkills).map(([id,name])=>{const rows=T.review.filter(row=>(T.five?FIVE.find(q=>q.id===row.id).family:THINKING.find(q=>q.id===row.id).competency)===id);return rows.length?`${name} ${rows.filter(r=>r.ok).length}/${rows.length}`:'';}).filter(Boolean).join(' ／ ');$('thinkReview').appendChild(breakdown);
 for(const row of T.review){const q=(T.five?FIVE:THINKING).find(q=>q.id===row.id),d=document.createElement('details');d.open=!row.ok||row.uncertain;d.innerHTML=`<summary>${row.ok?'✓':'復習'} ${escapeHtml(q.title)}${row.uncertain?' · 自信なし':''} · ${row.seconds}秒</summary><p>${escapeHtml(q.passage)}</p>${q.materials?q.materials.map(m=>`<h4>${escapeHtml(m.title)}</h4>${thinkingMaterial(m)}`).join(''):thinkingMaterial(q)}<p>${escapeHtml(q.question)}</p><p>あなたの回答：${row.picked.map(i=>escapeHtml(q.options[i].text)).join(' ／ ')}</p><p>${T.five?'選ぶべき選択肢':'正解'}：${thinkingAnswers(q).map(i=>escapeHtml(q.options[i].text)).join(' ／ ')}</p>${thinkingExplanation(q,row.order)}${row.memo?`<p><b>あなたの根拠メモ</b><br>${escapeHtml(row.memo)}</p>`:''}`;window.appendQuestionBookmark?.(d,q);$('thinkReview').appendChild(d);}
 if(!T.review.length)$('thinkReview').textContent='回答はありません。コインは増えません。';
 $('thinkReviewWeak').classList.toggle('hidden',!T.review.some(row=>!row.ok||row.uncertain));
 $('thinkOutcome').focus();
 window.finishSuperRun?.(T,true);
}
$('thinkRevealChoices').onclick=()=>{if(!T?.running||T.locked)return;T.choicesRevealed=true;$('thinkChoices').classList.remove('hidden');$('thinkRevealChoices').classList.add('hidden');$('thinkConfirm').classList.toggle('hidden',thinkingAnswers(T.items[T.index]).length===1);$('thinkChoices').querySelector('button')?.focus();};
$('thinkingLaunch').onclick=()=>launchThinkingMode(false);
$('fiveLaunch').onclick=()=>launchThinkingMode(true);
for(const id of ['fiveFamily','thinkCollection','thinkSubject','thinkKind','thinkLength','thinkMistakes','thinkLevel','thinkSkill'])$(id).onchange=thinkingSetup;
$('thinkBegin').onclick=beginThinking;$('thinkConfirm').onclick=submitThinking;
$('thinkNext').onclick=()=>{if(!T?.running||!T.locked)return;if(T.index+1>=T.items.length)finishThinking(true);else{T.index++;loadThinking();}};
$('thinkReviewWeak').onclick=()=>{openThinking();$('thinkMistakes').checked=true;thinkingSetup();$('thinkBegin').focus({preventScroll:true});};
 $('thinkStop').onclick=()=>finishThinking(false);$('thinkAgain').onclick=openThinking;
$('thinkBack').onclick=()=>{if(T?.running)finishThinking(false);else show('start');};
document.addEventListener('keydown',e=>{if($('thinking').classList.contains('hidden')||!T?.running||T.locked||e.repeat||e.isComposing||e.ctrlKey||e.altKey||e.metaKey||e.target.closest('textarea,input,select'))return;if(/^[1-6]$/.test(e.key)){e.preventDefault();answerThinking(Number(e.key)-1);}});
