/* Shared static/GAS helpers. Learning data remains in browser storage. */
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// No top-level navigation for in-page links in HtmlService's sandbox.
document.addEventListener('click',e=>{
 const a=e.target.closest('a[href^="#"]');if(!a)return;
 const target=document.getElementById(a.getAttribute('href').slice(1));if(!target)return;
 e.preventDefault();window.revealPracticeSection?.(target);target.scrollIntoView({block:'start',behavior:'instant'});
 if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
});
