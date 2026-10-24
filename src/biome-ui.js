/* Living scenery: species, weather and learning change the same piece of land. */
(()=>{
'use strict';
const B=window.Biome,host=document.getElementById('biomeShelf');
const ART={};
const PLANT_CARDS={};
function sprite(id,step=3,extra=''){const c=B.species(id);return `<span class="bio-sprite ${extra}" aria-hidden="true" style="background-image:url('${ART['species-'+id]}');${c.artMode==='portrait'?'background-size:contain;background-repeat:no-repeat;background-position:center':`background-position:${step%2*100}% ${Math.floor(step/2)*100}%`}"></span>`;}
let biomeView='grow',layoutReady=false;
let notice='',selection='grass',plot=0,tab='plant',inspected=null,quizFeedback='',showOrigin=false,classroomOnly=false,collectionCelebration=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stable=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,k)=>(o[k]=x[k],o),{}):x);
function commit(change){
 try{
  if(stable(loadSave())!==stable(SAVE))throw Error('別の画面で記録が更新されています。再読み込みしてから続けてください。');
  const next=JSON.parse(JSON.stringify(SAVE));next.biome=B.normalize(next.biome);change(next);
  SAVE=next;if(!persist()){notice='保存できなかったため、この操作は確定していません。';render();return false;}refreshCoins();return true;
 }catch(e){notice=`保存を中止しました：${e.message}。コインは消費していません。`;render();return false;}
}
function transaction(fn,message){if(commit(n=>{const r=fn(n.biome,n.coins);n.biome=r.state;n.coins=r.coins;})){notice=message;render();return true;}return false;}
function focus(id){const e=document.getElementById(id);if(e){const panel=e.closest('[data-biome-panel]');if(panel)setBiomeView(panel.dataset.biomePanel);for(let parent=e.parentElement;parent&&parent!==host;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;e.tabIndex=-1;e.focus({preventScroll:true});e.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}
const DISCOVERY_STYLES=[
 {name:'芽吹きの出会い',symbol:'✦',delay:350,particles:8},
 {name:'青く輝く発見',symbol:'✧',delay:650,particles:14},
 {name:'特別な景色との出会い',symbol:'✺',delay:950,particles:22},
 {name:'きらめく、大きな発見',symbol:'✦',delay:1250,particles:32}
];
function showDiscovery(kind){
 if(document.getElementById('biomeDiscoveryDialog'))return;
 const s=B.normalize(SAVE.biome),isEnvironment=kind==='environment',item=isEnvironment?B.environment(s.environmentPending):s.pending;
 if(!item)return;
 const c=isEnvironment?item:B.species(item.id),grade=isEnvironment?c.grade:[0,1,3][item.tier],style=DISCOVERY_STYLES[grade];
 const duplicate=isEnvironment?s.environmentsOwned.includes(c.id):s.speciesKnown.includes(c.id);
 const keepId=isEnvironment?'environmentKeep':'biome-keep',recycleId=isEnvironment?'environmentRecycle':'biome-recycle';
 const xp=isEnvironment?B.ENVIRONMENT_XP[c.grade]:B.XP[item.tier],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const dialog=document.createElement('dialog');dialog.id='biomeDiscoveryDialog';dialog.className=`biome-discovery-modal discovery-grade-${grade}${reduced?' discovery-reduced':''}${duplicate?'':' discovery-first'}`;
 dialog.setAttribute('aria-labelledby','discoveryTitle');dialog.setAttribute('aria-describedby','discoveryDescription');
 dialog.innerHTML=`<div class="discovery-stage"><div class="discovery-halo" aria-hidden="true"></div><div class="discovery-particles" aria-hidden="true">${Array.from({length:style.particles},(_,i)=>`<i style="--angle:${i*137.5}deg;--distance:${100+i%5*20}px;--wait:${i%7*.06}s;--dot:${3+i%3*2}px"></i>`).join('')}</div>
 <button class="discovery-close" aria-label="演出を閉じる。発見は未受取のまま保存されます">×</button>
 <div class="discovery-intro">${duplicate?'':'<span class="discovery-book" aria-hidden="true"><i></i><i></i><b>?</b></span>'}<span class="discovery-sigil" aria-hidden="true">${style.symbol}</span><p>${!duplicate?'まだ白紙だった、あなたの図鑑に…':grade===3?'ひときわ大きな輝きが…':grade===2?'特別な光が見えてきた…':grade===1?'青い光の先に…':'新しい出会いの気配…'}</p></div>
 <div class="discovery-result" hidden><p class="discovery-eyebrow">${duplicate?'うれしい再会':'FIRST DISCOVERY · はじめての発見'}</p><span class="discovery-badge">${isEnvironment?B.ENVIRONMENT_GRADES[grade]:B.TIERS[item.tier]}</span>
 <div class="discovery-art ${isEnvironment?'landscape':'organism'}">${isEnvironment?`<span style="background-image:url('${ART['environment-'+c.id]}')"></span>`:sprite(c.id,3)}</div>
 ${duplicate?'':'<span class="discovery-first-seal">NEW · 図鑑の新しい１ページ</span>'}<h3 id="discoveryTitle">${c.name}</h3><p id="discoveryDescription">${isEnvironment?duplicate?`獲得済みの景色です。探索の記録が +${xp} XP になります。`:'新しい背景を発見。コレクションに加えて、あなたの世界へ。':c.kind==='observation'?'観察コレクションに新しい発見。学習を進めて、形やしくみを深く知ろう。':`成長後の姿を先取り。今は「${c.stages[B.stage(item)]}」から育てられます。${item.tier===2?'３育成日ごとに成長サポートが付きます。':''}`}</p>
 ${duplicate?'':`<p class="discovery-unlock-preview">${isEnvironment?'景色の図鑑':c.kind==='plant'?'植物の図鑑':c.kind==='observation'?'観察生物の図鑑':'動物の図鑑'} <strong>${collectionGroups(s).find(g=>g.key===(isEnvironment?'environment':c.kind)).count} → ${collectionGroups(s).find(g=>g.key===(isEnvironment?'environment':c.kind)).count+1}</strong><small>受け取ると名前と姿が図鑑に残ります</small></p>`}<div class="discovery-actions"><button class="btn discovery-keep">${isEnvironment?duplicate?`重複を経験へ +${xp} XP`:'コレクションに加える':'この生物を受け取る'}</button>${isEnvironment&&duplicate?'':`<button class="btn ghost discovery-recycle">記録を経験へ +${xp} XP</button>`}</div><small class="discovery-saved">抽選結果は保存済みです。閉じても失われません。</small></div>
 <button class="discovery-skip">演出をスキップ</button></div>`;
 document.body.append(dialog);const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';let timer,closed=false;
 const reveal=()=>{if(closed)return;clearTimeout(timer);dialog.classList.add('revealed');dialog.querySelector('.discovery-intro').hidden=true;dialog.querySelector('.discovery-result').hidden=false;dialog.querySelector('.discovery-skip').hidden=true;dialog.querySelector('.discovery-keep').focus();};
 const finish=action=>{if(closed)return;closed=true;clearTimeout(timer);dialog.close();dialog.remove();document.body.style.overflow=oldOverflow;const target=document.getElementById(action||keepId);if(action)target?.click();else target?.focus({preventScroll:true});};
 dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const buttons=[...dialog.querySelectorAll('button')].filter(b=>!b.disabled&&b.getClientRects().length);const index=buttons.indexOf(document.activeElement);if(index<0||e.shiftKey&&index===0||!e.shiftKey&&index===buttons.length-1){e.preventDefault();buttons[e.shiftKey?buttons.length-1:0]?.focus();}});
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});dialog.querySelector('.discovery-close').onclick=()=>finish();dialog.querySelector('.discovery-skip').onclick=reveal;
 dialog.querySelector('.discovery-keep').onclick=()=>finish(keepId);dialog.querySelector('.discovery-recycle')?.addEventListener('click',()=>finish(recycleId));
 dialog.showModal();dialog.querySelector('.discovery-skip').focus();if(reduced)reveal();else timer=setTimeout(reveal,style.delay+(duplicate?0:700));
}
function collectionGroups(s){
 return ['plant','animal','observation','environment'].map(key=>{const items=key==='environment'?B.ENVIRONMENTS:B.SPECIES.filter(c=>c.kind===key),known=key==='environment'?s.environmentsOwned:s.speciesKnown;return {key,name:{plant:'植物',animal:'動物',observation:'観察生物',environment:'景色'}[key],items,known,count:items.filter(c=>known.includes(c.id)).length};});
}
function collectionBook(s){
 const groups=collectionGroups(s),count=groups.reduce((a,g)=>a+g.count,0),total=groups.reduce((a,g)=>a+g.items.length,0),marks=[5,10,25,50,92,total],next=marks.find(n=>n>count),celebration=collectionCelebration;
 return `<section class="collection-book" id="collectionBook" aria-label="わたしの発見図鑑">
 <header><div><small>MY DISCOVERY BOOK</small><h4>わたしの発見図鑑</h4><p>${next?`次の達成スタンプまで、あと ${next-count} 種類。`:'すべてのページに、出会いが刻まれました。'}</p></div><div class="collection-total"><strong>${count}</strong><span>/ ${total} ページ</span></div></header>
 ${celebration?`<div class="collection-registration" role="status">${celebration.kind==='environment'?`<span class="collection-new-landscape" aria-hidden="true" style="background-image:url('${ART['environment-'+celebration.id]}')"></span>`:sprite(celebration.id)}<div><small>NEW PAGE · 図鑑登録！</small><b>${esc(celebration.name)}</b><p>${celebration.before} → <strong>${celebration.after} ページ</strong>　新しい出会いを記録しました。</p>${marks.includes(celebration.after)?`<em>${celebration.after===total?'全ページ完成！':`${celebration.after}ページ達成！`} スタンプが増えました。</em>`:''}</div><button class="collection-dismiss" aria-label="図鑑登録のお知らせを閉じる">×</button></div>`:''}
 <div class="collection-chapters">${groups.map(g=>`<div><div><b>${g.name}</b><span>${g.count} / ${g.items.length}${g.count===g.items.length?' · 完成！':''}</span></div><progress max="${g.items.length}" value="${g.count}" aria-label="${g.name}の図鑑 ${g.count}/${g.items.length}"></progress></div>`).join('')}</div>
 <ol class="collection-stamps" aria-label="図鑑の達成スタンプ">${marks.map(n=>`<li class="${count>=n?'earned':''}" aria-label="${n}ページ ${count>=n?'達成':'未達成'}"><span aria-hidden="true">${count>=n?'✦':'◇'}</span><b>${n===total?'全ページ':n+'ページ'}</b><small>${count>=n?'達成':'これから'}</small></li>`).join('')}</ol>
 <details class="collection-pages" ${celebration?'open':''}><summary>図鑑のページを見渡す<span>未獲得は「？」のまま</span></summary>${groups.map(g=>`<section><h5>${g.name} · ${g.count}/${g.items.length}</h5><div>${g.items.map((c,i)=>{const known=g.known.includes(c.id),fresh=celebration&&celebration.id===c.id&&((g.key==='environment')===(celebration.kind==='environment'));return `<${known?'button':'span'} ${known?`data-collection="${g.key}:${c.id}"`:``} class="collection-page ${known?'filled':'unfilled'} ${fresh?'new-page':''}" title="${known?esc(c.name):'未発見'}" aria-label="${g.name} ${i+1}ページ ${known?esc(c.name):'未発見'}">${known?(g.key==='environment'?`<span class="collection-page-landscape" aria-hidden="true" style="background-image:url('${ART['environment-'+c.id]}')"></span>`:sprite(c.id)):'?'}<small>${String(i+1).padStart(2,'0')}</small></${known?'button':'span'}>`;}).join('')}</div></section>`).join('')}</details>
 <small class="collection-note">初期の植物と景色も含みます。ストックに残した生物は、あとから経験値に変えても図鑑に残ります。</small></section>`;
}
function registerCollection(kind,id,before,after){
 const c=kind==='environment'?B.environment(id):B.species(id);collectionCelebration={kind,id,name:c.name,before:collectionGroups(before).reduce((a,g)=>a+g.count,0),after:collectionGroups(after).reduce((a,g)=>a+g.count,0)};
}
function growthCard(item,s){
 const p=B.progress(item,s),c=B.species(item.id),within=p.done?100:p.paused?p.percent:Math.min(99,p.percent+(100-p.percent)*s.study/(p.questions+s.study));
 return `<div class="habitat-growth"><div><b>${c.name} · ${c.kind==='observation'?'観察進度':'育成'} ${p.step}/12</b><span>${p.done?(c.kind==='observation'?'観察達成':'成長達成'):p.paused?'環境を整えると再開':`次の${c.kind==='observation'?'観察段階':'小さな成長'}まで あと ${p.questions} 問`}</span></div><progress max="100" value="${within}" aria-label="${c.name} 次の育成段階への進み具合"></progress><ol aria-label="12段階の育成">${Array.from({length:12},(_,i)=>`<li class="${i+1<p.step?'done':i+1===p.step?'current':''}" ${i+1===p.step?'aria-current="step"':''}>${i+1}</li>`).join('')}</ol><small>${p.done?'ここまでの成果は、これからも残ります。':p.paused?`成長に必要：${B.requirements(s,item.id).join('・')}`:c.kind==='observation'?'5問ごとに観察進度が進みます。生物の年齢や成長を表すものではありません。':'条件を満たす間の目安です。5問ごとに育成が進み、同じ生物学的段階の中でも少しずつ育ちます。'}</small></div>`;
}
function nextGrowing(s){return [...s.plants,...s.animals,...s.observations].filter(p=>p&&!B.progress(p,s).done).sort((a,b)=>Number(B.progress(a,s).paused)-Number(B.progress(b,s).paused)||B.progress(a,s).questions-B.progress(b,s).questions)[0];}
function goal(s){
 if(!s.plants.some(Boolean))return '最初のススキは無料。「生き物を配置する」を開いて、種をまこう。';
 if(!s.plants.some(p=>p&&p.age>0))return `あと ${5-s.study} 問クリアで１日進み、条件が合えば芽が出ます。`;
 if(!s.animals.some(Boolean))return '学習でコインを集めて探索へ。出会った生物をストックし、好きな場所へ迎えよう。';
 if(!s.plants.some(p=>p&&B.species(p.id).tree))return '草原が育ってきました。木を植えれば、鳥やリスのすみかにもつながります。';
 const waiting=[...s.plants,...s.animals,...s.observations].find(p=>p&&p.age<6&&B.requirements(s,p.id).length);
 if(waiting)return `${B.species(waiting.id).name}の成長には「${B.requirements(s,waiting.id).join('・')}」が必要です。`;
 const next=nextGrowing(s);return next?`${B.species(next.id).name}は育成 ${B.progress(next,s).step}/12。次の小さな成長まであと ${B.progress(next,s).questions} 問。`:'今の生き物はすべて成長しました。別の種類や、控えの生き物も育ててみよう。';
}
function actor(item,kind,i,s){
 const c=B.species(item.id),step=B.stage(item),detail=B.progress(item,s),sizes=c.tree?[48,64,132,182]:kind==='plant'?[42,54,76,96]:[42,58,70,84],size=Math.round(sizes[step]*(.86+.14*(detail.step-1)/11));
 const positions=kind==='plant'?[[17,52],[42,48],[68,51],[13,78],[39,79],[66,79]]:[[20,65],[46,69],[83,77],[75,43]];
 return `<button class="habitat-actor ${kind} ${item.id} stage-${step}" data-inspect="${kind}:${i}" style="--x:${positions[i][0]}%;--y:${positions[i][1]}%;--actor-size:${size}px" aria-label="${c.name}、${c.stages[step]}。観察する">${sprite(item.id,step,'actor-image')}<span class="actor-label">${c.name}<small>${c.stages[step]} · ${detail.step}/12</small></span></button>`;
}
function mysteryArt(kind){return `<span class="mystery-art ${kind}" aria-hidden="true"><span>?</span></span>`;}
function classroomCard(c){
 if(!c.classroom)return '';
 return `<aside class="habitat-classroom-card"><span>授業につながる発見</span><strong>${esc(c.topic)}</strong><p>${esc(c.fact)}</p><a href="${esc(c.sourceUrl)}" target="_blank" rel="noopener">${esc(c.sourceLabel)} ↗</a></aside>`;
}
function plantCard(c){
 const card=PLANT_CARDS[c.id];if(!card)return `<p>${esc(c.fact)}</p>`;
 const group=B.SPECIES.filter(x=>x.kind===c.kind),label=c.kind==='observation'?'観察生物':'植物',number=String(group.findIndex(x=>x.id===c.id)+1).padStart(2,'0');
 return `<article class="plant-dossier" data-plant-card="${esc(c.id)}" aria-label="${esc(c.name)}の${label}カード">
 <div class="plant-collectible"><header class="plant-card-header"><span>${label}図鑑 <b>No.${number}</b></span><span class="plant-card-owned">✓ 発見済み</span></header>
 <h4 class="plant-card-name">${esc(c.name)}</h4><p class="plant-card-group">${esc(card.group)}</p>
 <div class="plant-card-picture" role="img" aria-label="${esc(c.name)}の代表的な姿のイラスト">${sprite(c.id,3,'plant-card-art')}<span class="plant-card-picture-caption">${c.kind==='observation'?'代表的な姿':'成長した姿'}</span></div>
 <div class="plant-card-signature"><span>この生物の見どころ</span><strong>${esc(card.signature)}</strong></div>
 <div class="plant-card-topic"><span>学べるテーマ</span><b>${esc(card.topic)}</b></div><footer>バイオーム${label}コレクション · ${number} / ${group.length}</footer></div>
 <div class="plant-notes"><section><h5>姿をよく見る</h5><p>${esc(card.appearance)}</p></section>
 <section><h5>暮らしと増え方</h5><p>${esc(card.ecology)}</p></section>
 <section class="plant-learning ${c.classroom?'habitat-classroom-card':''}"><h5>高校生物につながる発見</h5><strong>${esc(card.topic)}</strong><p>${esc(card.learning)}</p></section>
 <section class="plant-distinction"><h5>ここを区別しよう</h5><p>${esc(card.misconception)}</p></section>
 <div class="plant-recall"><h5>読んだら、ひとつ思い出そう</h5><p>${esc(card.question)}</p><details><summary>答えと考え方を開く</summary><p>${esc(card.answer)}</p></details></div>
 <details class="plant-sources"><summary>参考資料を見る</summary><ul>${card.sources.map(x=>`<li><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.label)} ↗</a></li>`).join('')}</ul><p>生物の特徴と学習内容の参考資料です。育成に必要な数値や成長段階はゲーム用の設定です。</p></details></div></article>`;
}
function environmentCollection(s){
 const odds=B.ENVIRONMENT_ODDS[B.level(s)-1],pending=B.environment(s.environmentPending),duplicate=pending&&s.environmentsOwned.includes(pending.id);
 const thumb=e=>`<span class="environment-thumb" aria-hidden="true" style="background-image:url('${ART['environment-'+e.id]}')"></span>`;
 return `<details class="environment-collection" ${pending?'open':''}><summary>景色を探す <span>${s.environmentsOwned.length}/20 獲得</span></summary>
 <p>新しい背景を1つ発見。重複は育成経験になります。</p>
 <div class="environment-odds">${odds.map((n,i)=>`<span class="environment-grade grade-${i}">${B.ENVIRONMENT_GRADES[i]} <b>${n}%</b></span>`).join('')}</div>
 <p class="environment-rule">現在 Lv.${B.level(s)} の確率。グレード内は等確率です。初期背景「赤岩の谷」は抽選対象外。経験値は順に ${B.ENVIRONMENT_XP.join(' / ')} XP。グレードはゲームの獲得率であり、生態系の価値や成長速度を表しません。</p>
 ${pending?`<button class="btn ghost small" id="environmentReplay">発見の演出を見る</button><div id="environmentDiscovery" class="environment-discovery" role="status">${thumb(pending)}<div><span class="environment-grade grade-${pending.grade}">${B.ENVIRONMENT_GRADES[pending.grade]}</span><h4>${pending.name}</h4><p>${duplicate?'もう持っている景色です。探索記録を育成経験にできます。':'新しい景色を発見！ コレクションに加えると選べます。'}</p></div></div><div class="biome-decisions"><button id="environmentKeep" class="btn">${duplicate?`重複を経験へ +${B.ENVIRONMENT_XP[pending.grade]} XP`:'コレクションに加える'}</button>${duplicate?'':`<button id="environmentRecycle" class="btn ghost">記録を経験へ +${B.ENVIRONMENT_XP[pending.grade]} XP</button>`}</div>`:`<button id="environmentDraw" class="btn" ${SAVE.coins<B.ENVIRONMENT_COST||s.pending?'disabled':''}>${B.ENVIRONMENT_COST}コインで背景を1つ獲得</button><small class="environment-help">${s.pending?'生物の発見を受け取ると探索できます。':SAVE.coins<B.ENVIRONMENT_COST?`あと ${B.ENVIRONMENT_COST-SAVE.coins} コイン。学習で貯めよう。`:'生物の探索とは別に、背景を1つ抽選します。'}</small>`}
 <div class="environment-grid">${B.ENVIRONMENTS.map(e=>{const owned=s.environmentsOwned.includes(e.id),chance=e.id==='canyon'?null:odds[e.grade]/B.ENVIRONMENTS.filter(x=>x.grade===e.grade&&x.id!=='canyon').length;return `<button class="environment-card ${owned?'owned':'locked'}" id="environment-card-${e.id}" data-environment="${e.id}" ${owned?'':'disabled'} aria-pressed="${s.environment===e.id}">${owned?thumb(e):mysteryArt('landscape')}<span class="environment-grade grade-${e.grade}">${B.ENVIRONMENT_GRADES[e.grade]}</span><b>${owned?e.name:'未発見の景色'}</b><small>${s.environment===e.id?'✓ 使用中':owned?'獲得済み · この景色にする':'🔒 未獲得'}${chance===null?' · 初期背景':` · 1回 ${Number(chance.toFixed(2))}%`}</small></button>`;}).join('')}</div>
 <small>背景は見た目の変更です。生物・成長記録・育成条件はそのまま引き継ぎます。</small></details>`;
}

// Show one purpose at a time. Existing controls and transaction handlers are retained.
function setBiomeView(value){
 biomeView=value;
 host.querySelectorAll('[data-biome-panel]').forEach(p=>{p.hidden=p.dataset.biomePanel!==value;});
 host.querySelectorAll('[data-biome-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.biomeView===value)));
}
function organizeBiome(s,openFolds){
 if(!layoutReady&&(s.pending||s.environmentPending))biomeView='explore';
 layoutReady=true;
 const take=selector=>host.querySelector(':scope > '+selector);
 const heading=take('.habitat-heading'),noticeNode=take('#biomeNotice');
 const nav=document.createElement('nav');nav.className='biome-view-nav';nav.setAttribute('aria-label','バイオームのメニュー');
 nav.innerHTML=[['grow','育てる'],['explore','コインで獲得'],['book','図鑑']].map(([key,label])=>`<button type="button" id="biomeView-${key}" data-biome-view="${key}" aria-controls="biomePanel-${key}" aria-pressed="${biomeView===key}">${label}${key==='explore'&&(s.pending||s.environmentPending)?'<small>未受取</small>':''}</button>`).join('');
 heading.after(nav);nav.after(noticeNode);noticeNode.hidden=!notice;
 const panels={};for(const key of ['grow','explore','book']){const node=document.createElement('section');node.id='biomePanel-'+key;node.dataset.biomePanel=key;node.setAttribute('aria-labelledby','biomeView-'+key);panels[key]=node;host.append(node);}
 const move=(parent,...nodes)=>nodes.filter(Boolean).forEach(n=>parent.append(n));
 const fold=(key,label,parent,nodes,initial=false)=>{const d=document.createElement('details');d.className='biome-fold';d.dataset.fold=key;d.open=openFolds.has(key)||initial;const summary=document.createElement('summary');summary.textContent=label;d.append(summary);move(d,...nodes);parent.append(d);return d;};
 const world=take('#habitatWorld'),observation=take('#habitatObservation'),nextStep=take('.habitat-next');
 const acquire=document.createElement('section');acquire.className='biome-acquire';acquire.setAttribute('aria-label','コインで生物を獲得');
 const pending=!!(s.pending||s.environmentPending),short=Math.max(0,B.COST-SAVE.coins);
 acquire.innerHTML=`<div><h4>コインで生物を獲得</h4><p id="biomeAcquireHelp">${pending?'前回の発見が未受取です。追加のコインは使いません。':`植物・動物・観察生物からランダムに1体。押すと ${B.COST} コイン消費します。`}</p></div><div class="biome-acquire-action"><button type="button" id="biomeAcquire" aria-describedby="biomeAcquireHelp" ${!pending&&short?'disabled':''}>${pending?'未受取の生物・背景を確認':`${B.COST}コインで生物を1体獲得`}</button>${!pending&&short?`<small>あと ${short} コイン必要です</small><button class="btn ghost small" id="biomeAcquireStudy">学習してコインを貯める</button>`:''}</div>`;
 acquire.querySelector('#biomeAcquire').onclick=()=>{setBiomeView('explore');if(s.pending)focus('biome-keep');else if(s.environmentPending)focus('environmentKeep');else host.querySelector('#biomeDraw')?.click();};
 acquire.querySelector('#biomeAcquireStudy')?.addEventListener('click',()=>host.querySelector('#habitatStudy').click());
 move(panels.grow,acquire,world,observation,nextStep);
 fold('environment','環境を整える',panels.grow,[take('.habitat-meters'),take('.habitat-weather'),take('.habitat-care'),take('.habitat-environment')]);
 const selectionNode=take('#habitatSelection'),tabs=take('.habitat-tabs'),filter=take('.habitat-collection-filter'),species=take('.habitat-species');
 const placement=fold('placement','生き物を配置する',panels.grow,[tabs],!s.starter);
 fold('species','生き物を選ぶ',placement,[filter,species]);
 placement.append(selectionNode);
 const dossier=selectionNode.querySelector('.plant-dossier');
 if(dossier){
  const c=B.species(selection),summary=document.createElement('div');summary.className='biome-selected-summary';summary.innerHTML=`${sprite(c.id)}<div><small>選んでいる生き物</small><h4>${esc(c.name)}</h4></div>`;
  dossier.before(summary);
  const content=dossier.parentElement;
  fold('field-guide','特徴・くわしい解説を読む',content,[dossier,content.querySelector('.plant-game-label'),content.querySelector('.habitat-life')]);
 }
 fold('observations',`観察棚 · ${s.observations.filter(Boolean).length}/4`,panels.grow,[take('#observationShelf')]);
 const growth=take('.habitat-growth');if(growth)fold('growth','成長の進み具合',panels.grow,[growth]);
 move(panels.grow,take('.habitat-journal'));
 const surface=selector=>{const old=take(selector),section=document.createElement('section');section.className=old.className;section.append(...old.childNodes);const summary=section.querySelector(':scope > summary'),title=document.createElement('h4');title.append(...summary.childNodes);summary.replaceWith(title);old.replaceWith(section);return section;};
 const expedition=surface('.habitat-expedition'),environment=surface('.environment-collection');
 const grid=environment.querySelector('.environment-grid');
 const gridNote=grid.nextElementSibling;
 fold('odds-species','確率・経験値のしくみ',expedition,[expedition.querySelector('.biome-progress'),expedition.querySelector('.habitat-small')]);
 fold('odds-environment','確率・経験値のしくみ',environment,[environment.querySelector('.environment-odds'),environment.querySelector('.environment-rule')]);

 const columns=document.createElement('div');columns.className='biome-explore-columns';move(columns,expedition,environment);panels.explore.append(columns);
 const pendingHint=document.createElement('p');pendingHint.className='biome-explore-hint';pendingHint.textContent=s.pending||s.environmentPending?'未受取の発見があります。受け取るか、経験へ変えると次の探索ができます。':'学習で貯めたコインを使います。未発見の名前や姿は、出会ってからのお楽しみ。';panels.explore.prepend(pendingHint);
 const book=take('#collectionBook');move(panels.book,book);
 fold('stamps','図鑑の達成スタンプ',book,[book.querySelector('.collection-stamps')]);
 fold('backgrounds','獲得した景色を選ぶ',panels.book,[grid,gridNote]);
 fold('connections','生き物どうしのつながり',panels.book,[take('.habitat-connections')]);
 move(panels.book,take('.habitat-notes'));
 nav.querySelectorAll('button').forEach(b=>b.onclick=()=>{setBiomeView(b.dataset.biomeView);b.focus({preventScroll:true});});
 setBiomeView(biomeView);
}

function render(){
 const openFolds=new Set([...host.querySelectorAll('details[data-fold][open]')].map(e=>e.dataset.fold));
 const active=document.activeElement;const activeId=host.contains(active)?active.id:'';const activeData=host.contains(active)?Object.entries(active.dataset).find(([k])=>['weather','species','habitatTab','plot','classroom'].includes(k)):null;
 const s=B.normalize(SAVE.biome),scene=B.scenery(s),lv=B.level(s),next=B.THRESHOLDS[lv],threshold=B.THRESHOLDS[lv-1];
 const selected=B.species(selection),known=s.speciesKnown.includes(selection),stock=s.reserve.filter(p=>p.id===selection),free=selection==='grass'&&!s.starter;
 const needs=B.requirements(s,selection),key=B.slotKey(selected.kind);
 const present=id=>[...s.plants,...s.animals,...s.observations].some(p=>p&&p.id===id&&p.age>=1);
 const links=[['rape','butterfly','アブラナの葉 → チョウの幼虫'],['grass','hopper','ススキ → バッタ'],['hopper','frog','昆虫 → カエル'],['pine','squirrel','マツの種子 → リス']];
 if(selected.kind!=='plant')plot=s[key].findIndex(x=>!x);
 else if(plot<0||plot>5)plot=0;
 const full=plot<0||!!s[key][plot],owned=stock.length>0||free,cost=0;
 const env=B.ENVIRONMENTS.find(e=>e.id===s.environment),art=ART['environment-'+env.id],cover=scene.cover/100;
 const locked=!owned||full||(selected.kind==='animal'&&needs.length>0);
 host.innerHTML=`
 <div class="habitat-heading"><div><h3>わたしのバイオーム</h3><p>学ぶたびに、少しずつ育つ。</p></div><div class="biome-level"><strong>Lv.${lv}</strong><span>${s.day} 日目 · ${scene.species} 種</span></div></div>
 <div class="habitat-environment"><label for="habitatEnvironment">獲得した景色 · ${s.environmentsOwned.length}/20</label><select id="habitatEnvironment">${B.ENVIRONMENTS.map(e=>`<option value="${e.id}" ${e.id===s.environment?'selected':''} ${s.environmentsOwned.includes(e.id)?'':'disabled'}>${B.ENVIRONMENT_GRADES[e.grade].split(' · ')[0]} · ${s.environmentsOwned.includes(e.id)?e.name:'？？？（未獲得）'}</option>`).join('')}</select><small>「探す」で背景を獲得できます。育成条件は変わりません。</small></div>
 <div id="habitatWorld" class="habitat-world weather-${s.weather} ${showOrigin?'show-origin':''}" data-cover="${scene.cover}" style="--scene-aspect:${env.aspect};--cover:${cover};--wet:${s.moisture/100};--habitat-art:url('${art}')">
  <div class="habitat-background"><div class="habitat-art habitat-dry"></div><div class="habitat-art habitat-middle" style="opacity:${Math.min(1,cover*2)}"></div><div class="habitat-art habitat-green" style="opacity:${Math.max(0,cover*2-1)}"></div></div>
  <div class="habitat-world-title"><span>${showOrigin?'0 日目 / 最初の景色':`${s.day} 日目 / ${B.WEATHER[s.weather].icon} ${B.WEATHER[s.weather].name}`}</span><h4>${env.name} · ${showOrigin?'はじまりの景色':scene.cover<15?'芽生えを待つ景色':scene.cover<50?'緑が広がる景色':'育ってきた景色'}</h4></div><button id="habitatCompare" class="habitat-compare">${showOrigin?'今の景色へ':'はじめと比べる'}</button>
  <div class="habitat-pond ${s.moisture>=45?'pond-full':''}" aria-hidden="true"></div>
  <div class="habitat-rain" aria-hidden="true">${Array.from({length:15},(_,i)=>`<i style="left:${i*7}%;animation-delay:${i*.13}s"></i>`).join('')}</div>
  ${s.plants.map((p,i)=>p?actor(p,'plant',i,s):`<button class="habitat-plot ${tab==='plant'&&plot===i?'selected':''}" style="--x:${[[17,52],[42,48],[68,51],[13,78],[39,79],[66,79]][i][0]}%;--y:${[[17,52],[42,48],[68,51],[13,78],[39,79],[66,79]][i][1]}%" data-plot="${i}" aria-label="植える場所 ${i+1}" aria-pressed="${tab==='plant'&&plot===i}">＋<small>${i+1}</small></button>`).join('')}
  ${s.animals.map((p,i)=>p?actor(p,'animal',i,s):'').join('')}
  <div class="habitat-world-footer">植物 ${s.plants.filter(Boolean).length}/6 区画 · 動物 ${s.animals.filter(Boolean).length}/4 枠 <span>生き物を押すと観察</span></div>
 </div>
 <section class="observation-shelf" id="observationShelf"><header><div><small>OBSERVATION COLLECTION</small><h4>🔬 小さな世界、広がる発見</h4></div><span>${s.observations.filter(Boolean).length} / 4 枠</span></header><p>微生物や海の動物を観察する、図鑑の展示棚。学習で観察進度が進みます。</p><div class="observation-slots">${s.observations.map((item,i)=>item?`<button data-inspect="observation:${i}">${sprite(item.id)}<b>${esc(B.species(item.id).name)}</b><small>観察 ${B.progress(item,s).step}/12</small></button>`:`<div class="observation-empty"><span>?</span><small>次の発見のために</small></div>`).join('')}</div></section>
 ${collectionBook(s)}
 ${environmentCollection(s)}
 <div class="habitat-meters">${[['水分',s.moisture,'💧'],['土の豊かさ',s.soil,'🌱'],['緑の広がり',scene.cover,'🍃']].map(([name,value,icon])=>`<div><label>${icon} ${name}<b>${value}</b></label><meter min="0" max="100" value="${value}" aria-label="${name} ${value}"></meter></div>`).join('')}</div>
 <div class="habitat-next"><b>次の一歩</b><p>${goal(s)}</p><button class="btn small" id="habitatStudy">学習に戻って育てる →</button></div>
 <p id="biomeNotice" class="biome-notice" role="status">${esc(notice)}</p>
 ${nextGrowing(s)?growthCard(nextGrowing(s),s):''}
 <section class="habitat-weather"><div><h4>空模様を選ぶ</h4><p>次の成長日に、水分が変わります。</p></div><div class="habitat-weather-buttons">${Object.entries(B.WEATHER).map(([id,w])=>`<button class="btn ghost small" data-weather="${id}" aria-pressed="${s.weather===id}">${w.icon} ${w.name}<small>水分 ${w.water>0?'+':''}${w.water}</small></button>`).join('')}</div></section>
 <div class="habitat-care"><button class="btn ghost small" id="habitatWater" ${SAVE.coins<8||s.moisture>=100?'disabled':''}>💧 水辺を整える <small>+25 · 🪙8</small></button><button class="btn ghost small" id="habitatSoil" ${SAVE.coins<8||s.soil>=100?'disabled':''}>🌱 土を整える <small>+15 · 🪙8</small></button></div>
 <nav class="habitat-tabs" aria-label="生き物を選ぶ"><button data-habitat-tab="plant" aria-pressed="${tab==='plant'}">植物を植える</button><button data-habitat-tab="animal" aria-pressed="${tab==='animal'}">🐾 動物を迎える</button><button data-habitat-tab="observation" aria-pressed="${tab==='observation'}">🔬 観察コレクション</button></nav>
 <div class="habitat-collection-filter" aria-label="表示する生物"><button class="btn ghost small" data-classroom="all" aria-pressed="${!classroomOnly}">すべて ${B.SPECIES.filter(c=>c.kind===tab).length}種</button><button class="btn ghost small" data-classroom="lesson" aria-pressed="${classroomOnly}">授業コレクション ${B.SPECIES.filter(c=>c.kind===tab&&c.classroom).length}種</button><small>図鑑公開 ${s.speciesKnown.length}/${B.SPECIES.length}種。未獲得の名前と姿は、出会ってからのお楽しみ。表示の絞り込みで探索の確率は変わりません。</small></div>
 <div class="habitat-species">${B.SPECIES.filter(c=>c.kind===tab&&(!classroomOnly||c.classroom)).map(c=>{const count=s.reserve.filter(p=>p.id===c.id).length,free=c.id==='grass'&&!s.starter,known=s.speciesKnown.includes(c.id);return `<button class="${known?'revealed-species':'mystery-species'}" data-species="${c.id}" aria-pressed="${c.id===selection}">${known?sprite(c.id):mysteryArt('organism')}<b>${known?c.name:`未発見の${c.kind==='plant'?'植物':'生物'}`}</b>${known&&c.classroom?`<span class="habitat-topic">${esc(c.topic)}</span>`:''}<small>${known?(count?`ストック ${count}`:free?'最初の１つは無料':'図鑑公開済み'):`No.${String(B.SPECIES.indexOf(c)+1).padStart(3,'0')} · ？？？`}</small></button>`;}).join('')}</div>
 ${known?`<section class="habitat-selection ${PLANT_CARDS[selected.id]?'with-plant-card':''}" id="habitatSelection"><div><small>${tab==='plant'?`植える場所 ${plot+1}`:tab==='observation'?'観察棚で学びを深めよう':'すみかと食物を整えよう'}</small>${PLANT_CARDS[selected.id]?plantCard(selected):`<h4>${selected.icon} ${selected.name}</h4>${selected.classroom?classroomCard(selected):`<p>${selected.fact}</p>`}`}<p class="plant-game-label">${selected.kind==='observation'?'学習で進む4つの観察段階（実際の成長段階ではありません）':selected.kind==='plant'?'育成で見られる姿':''}</p><div class="habitat-life">${selected.stages.map((x,i)=>`<span>${sprite(selected.id,i)}${x}</span>${i<3?'<i>→</i>':''}`).join('')}</div><p class="habitat-needs">${needs.length?`成長に必要：${needs.join(' / ')}${tab==='plant'?'。先に植えておくこともできます。':''}`:tab==='observation'?'✓ 学習で観察進度が進みます。':'✓ 今の環境で育てられます。'}${full?' 配置枠が埋まっています。配置済みの生き物を押すと、控えへ移せます。':''}</p></div><button class="btn" id="habitatPlace" ${locked?'disabled':''}>${tab==='plant'?'この場所に植える':tab==='observation'?'観察棚に並べる':'この生き物を迎える'}<small>${stock.length?'ストックを使用':free?'無料のはじめての種':'探索でストックすると配置できます'}</small></button></section>`:`<section class="habitat-selection mystery-selection" id="habitatSelection"><div>${mysteryArt('organism')}<small>まだ見ぬ出会い</small><h4>どんな${tab==='plant'?'植物':'生物'}が待っているだろう？</h4><p>名前も姿も、探索で出会ってからのお楽しみ。<br>「この生物を受け取る」で迎えると、成長の姿と学習カードが図鑑に開きます。</p></div><button class="btn" id="habitatPlace" disabled>探索で出会おう<small>獲得すると配置できます</small></button></section>`}
 <div id="habitatObservation"></div>
 <details class="habitat-expedition" open><summary>コインで生物を獲得</summary><p>押すと ${B.COST} コイン消費し、ランダムに1体登場します。受け取るか、育成経験に変えられます。</p>
 <div class="biome-progress"><label for="biomeProgress">${next?`次の育成レベルまで ${next-s.xp} XP`:'育成レベル MAX'}<span>${s.xp} XP</span></label><progress id="biomeProgress" value="${next?s.xp-threshold:1}" max="${next?next-threshold:1}"></progress></div>
 ${s.pending?`<button class="btn ghost small" id="biomeReplay">発見の演出を見る</button><div class="habitat-find">${sprite(s.pending.id,B.stage(s.pending))}<div><small>${B.TIERS[s.pending.tier]}</small><h4>${B.species(s.pending.id).name}</h4><p>${B.species(s.pending.id).kind==='observation'?'観察棚に並べて、学習とともに12段階の理解を深めよう。':s.pending.tier===2?'３育成日ごとに１日分の成長が加わるサポート付き。':s.pending.tier===1?'芽生え・幼体から育てられる発見です。':'好きな場所に配置して育てられます。'}</p></div></div><div class="biome-decisions"><button class="btn" id="biome-keep">この生物を受け取る</button><button class="btn ghost" id="biome-recycle">記録を経験に変える +${B.XP[s.pending.tier]} XP</button></div>`:`<button class="btn" id="biomeDraw" ${SAVE.coins<B.COST||s.environmentPending?'disabled':''}>${B.COST}コインで生物を1体獲得</button><small class="expedition-help">${s.environmentPending?'背景の発見を受け取ると探索できます。':SAVE.coins<B.COST?`あと ${B.COST-SAVE.coins} コインで探索できます。`: '新しい生き物との出会いへ！'}</small>`}
 <p class="habitat-small">${B.ODDS[lv-1].map((n,i)=>`${B.TIERS[i]} ${n}%`).join(' / ')}。植物${B.SPECIES.filter(c=>c.kind==='plant').length}種と、現在迎えられる動物（全${B.SPECIES.filter(c=>c.kind==='animal').length}種）、観察生物${B.SPECIES.filter(c=>c.kind==='observation').length}種類が等確率で候補になります。発見の大きさは生物の優劣ではありません。経験への変換は ${B.XP.join(' / ')} XP。レベルが上がるほど大きな発見が出やすくなります。</p></details>
 <section class="habitat-connections"><h4>つながりが生まれてきた <small>${links.filter(([a,b])=>present(a)&&present(b)).length}/4</small></h4><p>食べられる側から、食べる側へ。迎えた生き物どうしの関係を見つけよう。</p><div>${links.map(([a,b,label])=>`<span class="${present(a)&&present(b)?'connected':''}">${present(a)&&present(b)?'✓':'○'} ${label}</span>`).join('')}</div></section>
 <details class="habitat-journal"><summary>📖 成長の記録・控えのエリア (${s.reserve.length})</summary><ul>${s.log.length?s.log.map(l=>`<li>${esc(l)}</li>`).join(''):'<li>最初の種をまくと、ここから物語が始まります。</li>'}</ul><div>${s.reserve.map((p,i)=>`<div class="habitat-stock">${sprite(p.id,B.stage(p))}<span>${B.species(p.id).name} · ${B.species(p.id).stages[B.stage(p)]}<small>${B.TIERS[p.tier]} · ${B.progress(p,s).step}/12</small></span><button class="btn ghost small" data-recycle-stock="${i}">経験へ +${B.XP[p.tier]} XP</button></div>`).join('')}</div><p>控えの生き物は、種類を選んで配置すると元の成長段階から再開します。</p></details>
 <details class="habitat-notes"><summary>この世界と、生物の学習について</summary><p>ここは雨や土の条件を整えられる架空の土地です。現実の砂漠が時間だけで森林になるわけではなく、砂漠にも固有の生態系があります。森と草原に優劣はありません。</p><p>観察コレクションは、実際の成長や生息環境とは別の学習用展示です。観察進度は通常160問で達成します。微生物の色は特徴を見分けるための模式的な表現です。生物学的な成長段階の中を、ゲーム用の12段階に分けて育てます。通常の草花は160問・動物は190問・樹木は290問が成長達成の目安です（環境を満たす・成長サポートなしの場合）。最初の芽生えなどは5問から。学習で5問クリアすると育成の時間が1日進みます（タイピングは入力完了、クイズは正解。答えを表示した問題は除外）。1問につき1 XP。成長速度・水分・土の数値・迎える条件はゲーム用の簡略化で、実際の飼育条件や生態学的な予測ではありません。動物の子育て・個体数・捕食などは省略しています。生き物の絵は生成イラストで、各段階の倍率は異なります。種を同定するための精密図ではありません。背景は20種類から選ぶ景観で、配置した生物の実際の分布や気候を再現するものではありません。</p><p>学習していない間は時間が進まず、枯れたり死んだりしません。成長条件が足りないと成長を待ちます。コイン・生き物・成長記録は、このブラウザに保存されます。</p><p>参考：<a href="https:&#47;&#47;www.cgr.mlit.go.jp/ootagawa/Bio/terrest/index194.htm" target="_blank" rel="noopener">国土交通省：モンシロチョウ</a>、<a href="https:&#47;&#47;www.ffpri.go.jp/tmk/kengakuannai/midokoro/honyurui/nihonrisu.html" target="_blank" rel="noopener">森林総合研究所：ニホンリス</a>、<a href="https:&#47;&#47;www.rinya.maff.go.jp/chubu/policy/business/conservation/corridor/sizyuukara.html" target="_blank" rel="noopener">林野庁：シジュウカラ</a>。</p></details>`;
 organizeBiome(s,openFolds);
 host.querySelectorAll('[data-collection]').forEach(btn=>btn.onclick=()=>{const [kind,id]=btn.dataset.collection.split(':');if(kind==='environment'){focus('environment-card-'+id);}else{tab=kind;selection=id;classroomOnly=false;render();const guide=host.querySelector('[data-fold="field-guide"]');if(guide)guide.open=true;focus('habitatSelection');}});
 host.querySelector('.collection-dismiss')?.addEventListener('click',()=>{collectionCelebration=null;render();focus('collectionBook');});
 host.querySelector('#habitatEnvironment').onchange=e=>{const id=e.target.value;if(commit(n=>{n.biome=B.chooseEnvironment(n.biome,id);})){notice='景色を変更しました。生物と成長記録はそのままです。';render();focus('habitatWorld');}};
 const changeEnvironment=id=>{if(commit(n=>{n.biome=B.chooseEnvironment(n.biome,id);})){notice='獲得した景色に切り替えました。';render();focus('habitatWorld');}};
 host.querySelectorAll('[data-environment]').forEach(btn=>btn.onclick=()=>changeEnvironment(btn.dataset.environment));
 host.querySelector('#environmentDraw')?.addEventListener('click',()=>{const ok=transaction((s,c)=>B.drawEnvironment(s,c),'景色を発見しました。受け取り方を選ぼう。');host.querySelector('.environment-collection').open=true;if(ok)showDiscovery('environment');});
 host.querySelector('#environmentReplay')?.addEventListener('click',()=>showDiscovery('environment'));
 host.querySelector('#biomeReplay')?.addEventListener('click',()=>showDiscovery('species'));
 for(const [id,keep] of [['environmentKeep',true],['environmentRecycle',false]])host.querySelector('#'+id)?.addEventListener('click',()=>{let result,before;const found=s.environmentPending,isNew=keep&&!s.environmentsOwned.includes(found);if(commit(n=>{before=B.normalize(n.biome);result=B.resolveEnvironment(n.biome,keep);n.biome=result.state;})){collectionCelebration=null;if(isNew)registerCollection('environment',found,before,result.state);notice=result.gained?`景色の探索記録が育成経験 +${result.gained} XP になりました。`:'新しい背景を獲得しました。好きなときに切り替えられます。';render();host.querySelector('.environment-collection').open=true;focus(isNew?'collectionBook':'biomeNotice');}});
 host.querySelectorAll('[data-recycle-stock]').forEach(btn=>btn.onclick=()=>{const index=Number(btn.dataset.recycleStock),item=s.reserve[index];if(!confirm(`${B.species(item.id).name}をストックから手放し、${B.XP[item.tier]} XPに変えますか？この個体の成長は戻せません。`))return;if(commit(n=>{n.biome=B.recycleReserve(n.biome,index).state;})){notice='ストックの記録が経験になりました。';render();}});
 host.querySelectorAll('[data-weather]').forEach(btn=>btn.onclick=()=>{if(commit(n=>{n.biome.weather=btn.dataset.weather;})){notice=`次の成長日の空模様を「${B.WEATHER[btn.dataset.weather].name}」にしました。`;render();}});
 host.querySelectorAll('[data-habitat-tab]').forEach(btn=>btn.onclick=()=>{tab=btn.dataset.habitatTab;selection=B.SPECIES.find(c=>c.kind===tab&&(!classroomOnly||c.classroom)).id;plot=0;render();});
 host.querySelectorAll('[data-classroom]').forEach(btn=>btn.onclick=()=>{classroomOnly=btn.dataset.classroom==='lesson';if(classroomOnly&&!B.species(selection).classroom)selection=B.SPECIES.find(c=>c.kind===tab&&c.classroom).id;render();host.querySelector(`[data-classroom="${classroomOnly?'lesson':'all'}"]`)?.focus({preventScroll:true});});
 host.querySelectorAll('[data-species]').forEach(btn=>btn.onclick=()=>{selection=btn.dataset.species;render();});
 host.querySelectorAll('[data-plot]').forEach(btn=>btn.onclick=()=>{plot=Number(btn.dataset.plot);if(tab!=='plant'){tab='plant';selection=classroomOnly?B.SPECIES.find(c=>c.kind==='plant'&&c.classroom).id:'grass';}render();focus('habitatSelection');});
 host.querySelectorAll('[data-inspect]').forEach(btn=>btn.onclick=()=>{inspected=btn.dataset.inspect;quizFeedback='';renderObservation();focus('habitatObservation');});
 host.querySelector('#habitatPlace').onclick=()=>{showOrigin=false;transaction((state,coins)=>B.place(state,coins,selection,plot),`${selected.name}を${tab==='plant'?'植えました':'迎えました'}。学習で成長を見守ろう。`);focus(tab==='observation'?'observationShelf':'habitatWorld');};
 host.querySelector('#habitatCompare').onclick=()=>{showOrigin=!showOrigin;render();};
 host.querySelector('#habitatWater').onclick=()=>transaction((s,c)=>B.tend(s,c,'water'),'水辺が広がりました。水分 +25、育成経験 +2 XP。');
 host.querySelector('#habitatSoil').onclick=()=>transaction((s,c)=>B.tend(s,c,'soil'),'土の豊かさ +15、育成経験 +2 XP。');
 host.querySelector('#habitatStudy').onclick=()=>{show('start');window.revealPracticeSection?.('learningSetup');};
 const expedition=host.querySelector('.habitat-expedition');if(s.pending)expedition.open=true;
 host.querySelector('#biomeDraw')?.addEventListener('click',()=>{const ok=transaction((s,c)=>B.draw(s,c),'新しい発見を持ち帰りました。');host.querySelector('.habitat-expedition').open=true;if(ok)showDiscovery('species');});
 for(const action of ['keep','recycle'])host.querySelector(`#biome-${action}`)?.addEventListener('click',()=>{
  let before;const found=s.pending?.id,isNew=action==='keep'&&!s.speciesKnown.includes(found);if(commit(n=>{before=B.normalize(n.biome);n.biome=B.resolve(n.biome,action==='keep').state;})){collectionCelebration=null;if(isNew)registerCollection('species',found,before,B.normalize(SAVE.biome));notice=action==='keep'?'ストックに残しました。種類を選んで配置できます。':'発見の記録が育成経験になりました。次の探索へつながります。';render();host.querySelector('.habitat-expedition').open=true;if(isNew)focus('collectionBook');}
 });
 renderObservation();
 if(activeId)document.getElementById(activeId)?.focus({preventScroll:true});else if(activeData){const [key,value]=activeData;[...host.querySelectorAll('button')].find(b=>b.dataset[key]===value)?.focus({preventScroll:true});}
}
function renderObservation(){
 const box=document.getElementById('habitatObservation');if(!box||!inspected)return;
 const [kind,index]=inspected.split(':'),s=B.normalize(SAVE.biome),item=s[B.slotKey(kind)][Number(index)];if(!item){inspected=null;return;}
 const c=B.species(item.id),step=B.stage(item),needs=B.requirements(s,item.id),w=WORDS.find(w=>w.t===c.term),quiz=B.QUESTIONS[c.id];
 box.innerHTML=`<section class="habitat-observe"><span class="section-kicker">${c.kind==='observation'?'観察から、しくみを知る':'いま、ここで育ついのち'}</span><h4>${c.icon} ${c.name} <small>${c.stages[step]}</small></h4>${PLANT_CARDS[c.id]?plantCard(c):c.classroom?classroomCard(c):`<p>${c.fact}</p>`}<div class="habitat-life">${c.stages.map((x,i)=>`<span class="${i===step?'current':''}">${sprite(c.id,i)}${x}</span>${i<3?'<i>→</i>':''}`).join('')}</div>${growthCard(item,s)}${w?`<details><summary>関連する用語：${esc(c.term)}</summary><p>${esc(w.m)}</p><button id="habitatRecall" class="btn ghost small">この用語を記述で思い出す</button></details>`:''}<details class="habitat-quiz" ${quizFeedback?'open':''}><summary>一問で確かめる ${s.checked[c.id]?'✓ 初回ボーナス受取済み':'初回正解 +2 XP'}</summary><p>${quiz.q}</p><div>${[0,1,2].map((_,i)=>(i+B.SPECIES.indexOf(c))%3).map(i=>`<button class="btn ghost small" data-bio-answer="${i}">${quiz.answers[i]}</button>`).join('')}</div><p role="status">${esc(quizFeedback)}</p></details><div class="habitat-observe-actions"><button id="habitatReserve" class="btn ghost small">控えへ移す（進度を保存）</button><button id="habitatClose" class="btn ghost small">閉じる</button></div></section>`;
 box.querySelectorAll('[data-bio-answer]').forEach(btn=>btn.onclick=()=>{
  if(btn.dataset.bioAnswer!=='0'){quizFeedback=`もう一度確認しよう。${quiz.explanation||c.fact}`;renderObservation();return;}
  if(!s.checked[c.id]&&!commit(n=>{n.biome=B.check(n.biome,c.id);})){return;}
  quizFeedback=(s.checked[c.id]?'正解！ 知識を確認できました。':'正解！ 育成経験 +2 XP。')+(quiz.explanation?' '+quiz.explanation:'');render();focus('habitatObservation');
 });
 box.querySelector('#habitatReserve').onclick=()=>{if(commit(n=>{n.biome=B.remove(n.biome,kind,Number(index));})){inspected=null;notice='進度を保存して控えへ移しました。いつでも戻せます。';render();}};
 box.querySelector('#habitatClose').onclick=()=>{const old=inspected;inspected=null;box.innerHTML='';host.querySelector(`[data-inspect="${old}"]`)?.focus();};
 box.querySelector('#habitatRecall')?.addEventListener('click',()=>retryLearning([w],'recall'));
}
window.advanceBiomeLearning=function(rows,kind){
 const count=rows.filter(r=>!r.incomplete&&!r.revealed&&(kind==='type'||r.ok)).length;
 document.querySelectorAll('.habitat-result').forEach(e=>e.remove());
 if(!count)return;const before=B.normalize(SAVE.biome);SAVE.biome=B.learn(before,count);
 const days=SAVE.biome.day-before.day;
 const all=[...SAVE.biome.plants,...SAVE.biome.animals,...SAVE.biome.observations],old=[...before.plants,...before.animals,...before.observations];
 const milestones=all.filter((p,i)=>p&&old[i]&&B.progress(p,SAVE.biome).step>B.progress(old[i],before).step);
 const next=nextGrowing(SAVE.biome),p=next&&B.progress(next,SAVE.biome);
 const text=`🌱 バイオーム +${count} XP${days?` · 育成時間 +${days} 日`:''}${milestones.length?` · ${milestones.map(x=>`${B.species(x.id).name} ${B.progress(x,SAVE.biome).step}/12`).join('、')} に成長！`:''}${next?` · ${B.species(next.id).name}：${p.paused?'環境を整えると再開':`次の小さな成長まであと ${p.questions} 問`}`:' · 学習の成果を育成経験に保存しました。'}`;
 for(const id of ['result','thinkResult']){
  const target=document.getElementById(id);if(!target)continue;
  let banner=target.querySelector('.habitat-result');if(!banner){banner=document.createElement('p');banner.className='habitat-result';target.prepend(banner);}banner.textContent=text;
 }
};
window.renderBiomeShop=render;
})();
