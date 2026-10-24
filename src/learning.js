/* Separate exposure, recognition and recall. Intervals are a teaching heuristic,
   not a validated estimate of an individual learner's memory. */
const Learning = (() => {
  const DAY = 86400000, intervals = [1, 3, 7, 14, 30];
  function lane(state, term, kind) {
    return state[term]?.[kind] || {attempts:0, successes:0, stage:0, due:0, last:0, lastOk:false, uncertain:false};
  }
  function filter(words, units, {subject='all',unit='all',cats=['ALL']}={}) {
    return words.filter(w => (subject==='all' || units[w.unit]?.subject===subject || w.unit==='P') &&
      (unit==='all' || w.unit===unit) && (cats.includes('ALL') || cats.includes(w.c)));
  }
  function record(state, term, kind, result, now=Date.now()) {
    if (result.incomplete || !['type','quiz','recall'].includes(kind)) return state;
    const prev=lane(state,term,kind), clean=result.ok && !result.hinted && !result.uncertain;
    let stage=prev.stage, due=prev.due;
    if(kind==='type'){stage=0;due=now;}
    else if(!clean){stage=0;due=now;}
    else if(!prev.attempts || now>=prev.due){stage=Math.min(5,stage+1);due=now+intervals[stage-1]*DAY;}
    return {...state,[term]:{...state[term],[kind]:{attempts:prev.attempts+1,successes:prev.successes+(clean?1:0),stage,due,last:now,lastOk:!!clean,uncertain:!!result.uncertain}}};
  }
  function queue(words,state,kind,focus,now=Date.now()) {
    const due=w=>{const r=lane(state,w.t,kind);return r.attempts>0 && r.due<=now;};
    if(focus==='due') return words.filter(due).sort((a,b)=>lane(state,a.t,kind).due-lane(state,b.t,kind).due);
    if(focus==='new') return words.filter(w=>!lane(state,w.t,kind).attempts);
    if(focus==='all') return words.slice();
    const priority=w=>kind==='type'?(!lane(state,w.t,kind).attempts?0:1):due(w)?0:!lane(state,w.t,kind).attempts?1:2;
    return words.slice().sort((a,b)=>priority(a)-priority(b) || (priority(a)===0?lane(state,a.t,kind).due-lane(state,b.t,kind).due:0));
  }
  function sanitize(raw,words) {
    const state={};
    if(!raw || typeof raw!=='object' || Array.isArray(raw)) return state;
    for(const w of words) for(const kind of ['type','quiz','recall']) {
      const r=raw[w.t]?.[kind];
      if(!r || !['attempts','successes','stage','due','last'].every(k=>Number.isFinite(r[k])&&r[k]>=0) ||
        !Number.isInteger(r.stage)||r.stage>5||!Number.isInteger(r.attempts)||!Number.isInteger(r.successes)||r.successes>r.attempts) continue;
      (state[w.t] ||= {})[kind]={attempts:r.attempts,successes:r.successes,stage:r.stage,due:r.due,last:r.last,lastOk:r.lastOk===true,uncertain:r.uncertain===true};
    }
    return state;
  }
  return {lane,filter,record,queue,sanitize};
})();
if(typeof module!=='undefined' && module.exports) module.exports=Learning;
