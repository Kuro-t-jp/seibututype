/* A visual transition only: never delays questions, changes focus or blocks answers. */
window.presentQuestionStage=function(id,number,total){
 const root=document.getElementById(id);
 if(!root)return;
 let heading=root.querySelector('.question-stage-heading');
 if(!heading){
  heading=document.createElement('div');heading.className='question-stage-heading';
  heading.innerHTML='<div class="question-stage-number"><small>さあ、この一問。</small><strong></strong></div><p></p><span class="question-stage-total"></span>';
  const anchor=id==='game'?root.querySelector('.prompt'):id==='quiz'?document.getElementById('qCat'):document.getElementById('thinkQuestionTitle');
  anchor.before(heading);
 }
 heading.querySelector('strong').textContent=`第 ${number} 問`;
 heading.querySelector('p').textContent=id==='game'?(G.recall?'説明を手がかりに、思い出そう。':'ことばと意味を、指先でつなごう。'):'手がかりを見つけて、自分の答えを。';
 heading.querySelector('.question-stage-total').textContent=total?`全 ${total} 問`:'自分のペースで挑戦';
 const target=id==='game'?root.querySelector('.prompt'):id==='quiz'?document.getElementById('qText'):document.getElementById('thinkQuestionTitle');
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  target.getAnimations().filter(a=>a.id==='question-entry').forEach(a=>a.cancel());
  target.animate([{transform:'translateY(7px)'},{transform:'translateY(0)'}],{duration:id==='game'?150:240,easing:'ease-out',id:'question-entry'});
 }
};
