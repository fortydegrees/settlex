'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Button} from '../../../ui/Button';
import {Panel} from '../../../ui/Panel';
import {ReplayStepControls} from '../../replay/components/ReplayStepControls';
import {parseLocalReplayFile} from '../../replay/localReplayFile';
import {saveAnswer,revealRecord,restoreRecord,storageKey,exportResponses} from './reviewModel';

const keyFor=(meta)=>storageKey(meta)+(typeof window!=='undefined'&&new URLSearchParams(location.search).has('smoke')?':smoke':'');
async function load(caseId,stage){
 const response=await fetch(`/api/dev/decision-review${caseId?`?case=${caseId}&stage=${stage}`:''}`,{cache:'no-store',credentials:'omit'});
 const doc=await response.json();if(!response.ok)throw new Error(doc.error??'Could not load case.');
 if(doc.history)parseLocalReplayFile(JSON.stringify(doc.history));
 if(doc.plans)for(const p of doc.plans)parseLocalReplayFile(JSON.stringify(p.replay));
 return doc;
}
const field='settlehex-ui-field w-full rounded-control border border-edge-subtle bg-surface-inset p-ui-2 type-body-small text-ink-primary';
export function DecisionReviewClient(){
 const [index,setIndex]=useState(null),[caseId,setCaseId]=useState(''),[position,setPosition]=useState(null),[compare,setCompare]=useState(null),[diagnostic,setDiagnostic]=useState(null);
 const [record,setRecord]=useState(null),[stage,setStage]=useState('position'),[plan,setPlan]=useState('A'),[step,setStep]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [reason,setReason]=useState(''),[action,setAction]=useState(''),[confidence,setConfidence]=useState('unsure'),[status,setStatus]=useState('idea'),[preference,setPreference]=useState('unsure');
 const board=useRef(null),display=useRef(null);
 useEffect(()=>{load().then(doc=>{setIndex(doc);setCaseId(new URLSearchParams(location.search).get('case')??doc.cases[0]?.caseId??'');}).catch(e=>setError(e.message));},[]);
 useEffect(()=>{
  if(!caseId)return;let active=true;setPosition(null);setCompare(null);setDiagnostic(null);setRecord(null);setError('');setNotice('');setReason('');setAction('');setStatus('idea');setConfidence('unsure');setPreference('unsure');
  load(caseId,'position').then(doc=>{if(!active)return;const stored=restoreRecord(localStorage.getItem(keyFor(doc)),doc);setRecord(stored);setPosition(doc);setStep(doc.rootIndex);setStage('position');setPlan('A');}).catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;};
 },[caseId]);
 useEffect(()=>{
  if(!position||stage==='position')return;let active=true;
  Promise.all([load(caseId,'compare'),stage==='explain'?load(caseId,'diagnostic'):Promise.resolve(null)]).then(([plans,explanation])=>{if(!active)return;if(plans.packageId!==position.packageId||(explanation&&explanation.packageId!==position.packageId))throw new Error('Package changed. Reload before reviewing.');setCompare(plans);if(explanation)setDiagnostic(explanation);}).catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;};
 },[caseId,position,stage]);
 const selected=compare?.plans.find(p=>p.label===plan);
 const frames=stage==='position'?position?.history.frames:selected?.replay.frames;
 const current=frames?.[Math.min(step,frames.length-1)];
 const seek=useCallback(value=>setStep(Math.max(0,Math.min(value,(frames?.length??1)-1))),[frames]);
 useEffect(()=>{
  display.current=current&&position?{frame:current,perspectiveId:position.perspectiveId,caseId}:null;
  if(display.current)board.current?.contentWindow?.postMessage({type:'decision-review-frame',display:display.current},location.origin);
 },[current,position,caseId]);
 useEffect(()=>{
  const key=event=>{if(!['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)&&!event.target?.isContentEditable){if(event.key==='ArrowLeft'){event.preventDefault();seek(step-1);}if(event.key==='ArrowRight'){event.preventDefault();seek(step+1);}if(event.key==='Home'){event.preventDefault();seek(0);}if(event.key==='End'){event.preventDefault();seek((frames?.length??1)-1);}}};
  const message=event=>{if(event.origin!==location.origin||event.source!==board.current?.contentWindow)return;if(event.data?.type==='decision-review-ready'&&display.current)board.current.contentWindow.postMessage({type:'decision-review-frame',display:display.current},location.origin);if(event.data?.type==='decision-review-key')key({key:event.data.key,preventDefault(){}});};
  window.addEventListener('keydown',key);window.addEventListener('message',message);return()=>{window.removeEventListener('keydown',key);window.removeEventListener('message',message);};
 },[seek,step,frames]);
 const persist=next=>{localStorage.setItem(keyFor(next),JSON.stringify(next));setRecord(next);};
 const save=()=>{try{persist(saveAnswer(record,stage==='position'?'position':'compare',stage==='position'?{status,action,reason,confidence}:{preference,reason}));setNotice('Saved on this browser. Initial answers stay unchanged; later saves are revisions.');if(stage==='position'){setStage('compare');setStep(0);setReason('');}}catch(e){setError(e.message);}};
 const reveal=()=>{try{persist(revealRecord(record));setStep(0);setStage('explain');setReason('');}catch(e){setError(e.message);}};
 const download=()=>{try{const records=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith('settlex-decision-review-v1:')){const value=JSON.parse(localStorage.getItem(key));if(index.cases.some(c=>c.caseId===value.caseId&&c.packageId===value.packageId)&&key===keyFor(value))records.push(restoreRecord(JSON.stringify(value),value));}}const url=URL.createObjectURL(new Blob([JSON.stringify(exportResponses(records),null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='decision-review-responses.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice(`Exported ${records.length} saved case response(s).`);}catch(e){setError(e.message);}};
 return <main className="decision-review-shell bg-surface-inset text-ink-primary">
  <section className="decision-review-board" aria-label="Saved board position"><iframe key={caseId} ref={board} title="Saved SettleHex board" src="/dev/decision-review/board" className="h-full w-full border-0"/></section>
  <aside className="decision-review-panel p-ui-3">
   <Panel title="Saved decision review">
    <label className="block type-caption text-ink-secondary">Case<select aria-label="Review case" className={field} value={caseId} onChange={e=>setCaseId(e.target.value)}>{index?.cases.map(c=><option key={c.caseId}>{c.caseId}</option>)}</select></label>
    <div className="my-ui-3 flex flex-wrap gap-ui-2"><Button size="sm" variant="subtle" onClick={()=>{setStage('position');setStep(position?.rootIndex??0);}}>Position</Button><Button size="sm" variant="subtle" disabled={!record?.position} onClick={()=>{setStage('compare');setStep(0);}}>Compare</Button><Button size="sm" variant="subtle" disabled={!record?.compare} onClick={reveal}>Explain</Button></div>
    {error?<p role="alert" className="my-ui-3 type-body-small">{error}</p>:null}
    {!position?<p role="status" className="type-body-small">Loading saved position…</p>:<>
     <h2 className="type-action">{stage==='position'?'1 · Your judgment':stage==='compare'?'2 · Anonymous plans':'3 · Explanation'}</h2>
     <p className="my-ui-2 type-caption text-ink-secondary">Player {Number(position.perspectiveId)+1} perspective · commitment root {position.rootIndex}{position.firstDifferenceIndex!==null?` · first differing primitive ${position.firstDifferenceIndex}`:''}</p>
     {stage==='position'?<Button size="sm" variant="secondary" onClick={()=>seek(position.rootIndex)}>Return to commitment root</Button>:<div className="my-ui-2 flex gap-ui-2">{compare?.plans.map(p=><Button key={p.label} size="sm" variant={plan===p.label?'primary':'secondary'} onClick={()=>{setPlan(p.label);setStep(0);}}>Plan {p.label}</Button>)}</div>}
     {frames?<div className="my-ui-3"><ReplayStepControls currentEventIndex={step} eventCount={frames.length} onPreviousEvent={()=>seek(step-1)} onNextEvent={()=>seek(step+1)} onPreviousTurn={()=>{const turn=current.state.ctx.turn;let i=step-1;while(i>0&&frames[i].state.ctx.turn===turn)i--;seek(i);}} onNextTurn={()=>{const turn=current.state.ctx.turn;let i=step+1;while(i<frames.length-1&&frames[i].state.ctx.turn===turn)i++;seek(i);}} onSeek={seek}/><p className="mt-ui-2 type-body-small" data-review-step>{(stage==='position'?step===position.rootIndex:step===0)?'Commitment root':current?.annotation.label} · {stage==='position'?`history ${step}/${position.rootIndex}`:`step ${step}/${frames.length-1}`}</p></div>:null}
     {current?<div className="my-ui-3 type-caption text-ink-secondary"><p>Own resources: {current.state.G.core.playerStateById[position.perspectiveId].resources.join(', ')||'none'}</p><p>Last roll total: {current.state.G.reviewObservation.diceTotal??'none'} · individual faces unavailable</p></div>:null}
     {current?<details className="my-ui-3 type-caption"><summary className="cursor-pointer">Information available at this position</summary><p className="my-ui-2">Opponent resources (known by duel bank conservation): {current.state.G.core.playerStateById[position.perspectiveId==='0'?'1':'0'].resources.join(', ')||'none'}. Opponent development identities are unknown.</p><p>Own newly bought development cards: {current.state.G.reviewObservation.ownNewDevelopmentCards.join(', ')||'none'}</p><pre className="my-ui-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(current.state.G.reviewObservation,null,2)}</pre>{stage==='position'&&step===position.rootIndex?<p>Available actions: {position.availableActions.map(a=>a.label).join(' · ')}</p>:null}</details>:null}
     {stage!=='position'&&selected?<div className="my-ui-3 type-body-small"><ol className="list-decimal space-y-ui-1 pl-ui-5">{selected.steps.map((s,i)=><li key={i}><button className="text-left underline decoration-edge-subtle underline-offset-4" onClick={()=>seek(i+1)}>{s.label}</button></li>)}</ol>{selected.queued?<p className="mt-ui-2">Queued, not executed: {selected.queued.label}</p>:null}<p className="mt-ui-2 text-ink-secondary">{selected.continuation}</p>{compare.plans.length===1?<p className="mt-ui-2 text-ink-secondary">Only one selected plan is available for this case.</p>:null}</div>:null}
     {stage==='position'?<>
      <label className="my-ui-2 block type-body-small">What would you consider doing?<textarea className={field} rows={3} value={action} onChange={e=>setAction(e.target.value)}/></label>
      <label className="my-ui-2 block type-body-small">Answer<select className={field} value={status} onChange={e=>setStatus(e.target.value)}><option value="idea">I have an idea</option><option value="unsure">Unsure</option><option value="skip">Skip</option></select></label>
      <label className="my-ui-2 block type-body-small">Confidence<select className={field} value={confidence} onChange={e=>setConfidence(e.target.value)}>{['unsure','low','medium','high'].map(v=><option key={v}>{v}</option>)}</select></label>
     </>:<label className="my-ui-2 block type-body-small">Preference<select className={field} value={preference} onChange={e=>setPreference(e.target.value)}>{(compare?.plans.length===1?['A','neither','unsure']:['A','B','equivalent','neither','unsure']).map(v=><option key={v} value={v}>{({equivalent:'Roughly equivalent',neither:'Neither / another plan',unsure:'Unsure'})[v]??`Plan ${v}`}</option>)}</select></label>}
     <label className="my-ui-2 block type-body-small">Reason<textarea className={field} rows={3} value={reason} onChange={e=>setReason(e.target.value)}/></label>
     <div className="my-ui-3 flex flex-wrap gap-ui-2"><Button size="sm" onClick={save}>{record?.[stage==='position'?'position':'compare']?'Save revision':stage==='position'?'Save judgment & compare':'Save comparison'}</Button>{stage==='compare'&&record?.compare?<Button size="sm" variant="secondary" onClick={reveal}>Reveal explanation</Button>:null}</div>
     {diagnostic&&stage==='explain'?<section className="mt-ui-4 type-body-small"><p>{diagnostic.interpretation}</p><p className="my-ui-2">Source: {diagnostic.population}. Plan identities: {Object.entries(diagnostic.planIdentities).map(([label,role])=>`${label}: ${role}`).join(' · ')}</p>{diagnostic.controllers.map(controller=><details key={controller.identity} className="my-ui-3"><summary className="cursor-pointer type-action">{controller.identity} · {controller.selectedEndpointKind}{controller.featureAlias?' · feature alias':''}</summary><p className="my-ui-2">{controller.rule}</p><pre className="overflow-x-auto whitespace-pre-wrap type-caption">{JSON.stringify(controller.selection,null,2)}</pre><p className="my-ui-2 type-action">Original candidate pool</p>{controller.pool.map(p=><div key={p.index} className="my-ui-2 border-t border-edge-subtle pt-ui-2"><p>#{p.index} · score {p.score}{p.terminalUtility!==null?` · certified utility ${p.terminalUtility}`:''}{p.protectedBaseline?' · protected baseline':''}{p.selected?' · selected':''}</p><p>{p.steps.map(s=>s.label).join(' → ')||'Root'}{p.queued?` → queued: ${p.queued.label}`:''}</p></div>)}</details>)}</section>:null}
     <details className="my-ui-3 type-caption"><summary className="cursor-pointer">Saved responses for this case</summary><pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(record,null,2)}</pre></details>
    </>}
    <Button size="sm" variant="secondary" onClick={download}>Download responses</Button>
    {notice?<p role="status" className="mt-ui-2 type-caption text-ink-secondary">{notice}</p>:null}
    <p className="mt-ui-3 type-caption text-ink-secondary">Answers save in this browser. Download a JSON copy to keep them independently. Use ← / → for manual steps.</p>
   </Panel>
  </aside>
  <style jsx>{`.decision-review-shell{display:grid;grid-template-columns:minmax(0,1fr) 390px;height:100dvh;overflow:hidden}.decision-review-board{min-width:0;height:100%;background:#132b2c}.decision-review-panel{overflow-y:auto;min-width:0}@media(max-width:900px){.decision-review-shell{grid-template-columns:1fr;height:auto;overflow:visible}.decision-review-board{height:70dvh}.decision-review-panel{overflow:visible}}`}</style>
 </main>;
}
