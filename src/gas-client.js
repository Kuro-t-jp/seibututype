/* Uses the same interface in static pages and the Apps Script iframe. */
function hasServer(){return typeof google!=='undefined'&&!!google.script?.run;}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const RANK_PLAYER_KEY='seibutuRankPlayer_v1';
let rankPlayer='',rankIdentitySaved=true;
try{rankPlayer=localStorage.getItem(RANK_PLAYER_KEY)||'';}catch(e){rankIdentitySaved=false;}
if(!/^[a-f0-9-]{32,36}$/.test(rankPlayer)){
 const bytes=crypto.getRandomValues(new Uint8Array(16));rankPlayer=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
 try{localStorage.setItem(RANK_PLAYER_KEY,rankPlayer);}catch(e){rankIdentitySaved=false;}
}
function gasCall(method,...args){
 return new Promise((resolve,reject)=>{
  if(!hasServer()){reject(new Error('GAS版で利用できます。'));return;}
  let settled=false;
  const timer=setTimeout(()=>{if(!settled){settled=true;reject(new Error('応答に時間がかかっています。通信環境を確認して再試行してください。'));}},20000);
  const finish=fn=>value=>{if(settled)return;settled=true;clearTimeout(timer);fn(value);};
  try{google.script.run.withSuccessHandler(finish(resolve)).withFailureHandler(finish(reject))[method](...args);}catch(e){finish(reject)(e);}
 });
}
function renderRankList(container,top){
 if(!container)return;
 if(!Array.isArray(top)||!top.length){container.innerHTML='<div class="rankempty">まだ記録がありません。最初の記録を残そう。</div>';return;}
 container.innerHTML=top.slice(0,5).map((r,i)=>`<div class="rankrow${r.isMe?' me':''}"><div class="pos">${['🥇','🥈','🥉'][i]||i+1}</div><div class="nm">${escapeHtml(r.name)}</div><div class="sc">${escapeHtml(r.score)}</div></div>`).join('');
}
function rankingContext(kind=playMode){
 return ['v5',mode.type,mode.val,[...selCats].sort().map(c=>c==='ALL'?0:CATS.indexOf(c)+1).join('-'),UPGRADES.map(u=>SAVE.up[u.key]).join(''),['all','生物基礎','生物'].indexOf($('learnSubject').value),$('learnUnit').value].join('_');
}
function rankingEligible(){return mode.type!=='learn'&&$('learnFocus').value==='all';}
const rankRequests=new WeakMap();
function rankError(container,error,retry){
 container.replaceChildren();const message=document.createElement('p');message.className='rankempty';message.textContent=error?.message||'通信に失敗しました。もう一度お試しください。';
 const button=document.createElement('button');button.className='btn ghost small';button.textContent='再試行';button.onclick=retry;container.append(message,button);
}
function loadRankingInto(container,md='type'){
 if(!container)return;const token={};rankRequests.set(container,token);
 if(!rankingEligible()){container.textContent='ランキングはランダム出題の60秒・120秒・15問で利用できます。学習モードは自分のペースで。';return;}
 if(!hasServer()){container.textContent='みんなで競うランキングは、先生が配布するGAS版で使えます。';return;}
 const context=rankingContext(md);container.textContent='ランキングを読み込み中…';
 gasCall('getRanking',getPlayer(),md,context,rankPlayer).then(res=>{if(rankRequests.get(container)===token)renderRankList(container,res.top);}).catch(error=>{if(rankRequests.get(container)===token)rankError(container,error,()=>loadRankingInto(container,md));});
}
function submitAndShow(payload){
 const container=$('rankResult'),line=$('myRankLine'),token={},run=G;rankRequests.set(container,token);
 container.textContent='記録を送信中…';line.textContent='';
 gasCall('submitScore',{...payload,playerId:rankPlayer}).then(res=>{
  if(rankRequests.get(container)!==token||G!==run)return;renderRankList(container,res.top);
  line.textContent=res.myRank>0?`あなたは ${res.myRank}位 / ${res.total}件（ベスト ${res.my.score}点）`:'記録を送信しました。';
 }).catch(error=>{if(rankRequests.get(container)===token&&G===run)rankError(container,error,()=>submitAndShow(payload));});
}
// No top-level navigation for in-page links in HtmlService's sandbox.
document.addEventListener('click',e=>{
 const a=e.target.closest('a[href^="#"]');if(!a)return;
 const target=document.getElementById(a.getAttribute('href').slice(1));if(!target)return;
 e.preventDefault();window.revealPracticeSection?.(target);target.scrollIntoView({block:'start',behavior:'instant'});
 if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
});
async function refreshGasStatus(){
 if(!hasServer())return;const box=$('gasStatus');box.classList.remove('hidden');box.textContent='GAS版に接続しています…';
 try{
  const info=await gasCall('getAppInfo');
  box.textContent=info.rankingReady?`GAS版 ${info.version} · 共有ランキングに接続。復習ノート・学習履歴はこのブラウザに保存されます。`:'GAS版 · 学習できます。共有ランキングは先生が初期設定するまで準備中です。';
  if(!rankIdentitySaved)box.textContent+=' ブラウザIDを保存できないため、再読み込み後のランキングは別の記録になります。';
 }catch(error){rankError(box,error,refreshGasStatus);}
}
refreshGasStatus();
