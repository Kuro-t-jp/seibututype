/* Reveal the relevant menu for links, saved hashes and result-screen shortcuts. */
function revealPracticeSection(target){
 if(typeof target==='string')target=document.getElementById(target);
 if(!target)return;
 for(let node=target;node&&node.id!=='start';node=node.parentElement){
  if(node.tagName==='DETAILS')node.open=true;
 }
}
window.revealPracticeSection=revealPracticeSection;
function revealPracticeHash(){
 const target=document.getElementById(location.hash.slice(1));
 if(!target||!$('start').contains(target))return;
 revealPracticeSection(target);
 requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'instant'}));
}
window.addEventListener('hashchange',revealPracticeHash);
revealPracticeHash();
