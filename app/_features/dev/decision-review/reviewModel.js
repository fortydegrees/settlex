const clone=(v)=>JSON.parse(JSON.stringify(v));
export const storageKey=(meta)=>`settlex-decision-review-v1:${meta.packageId}:${meta.caseId}`;
export function createRecord(meta){return {schemaVersion:1,caseId:meta.caseId,packageId:meta.packageId,position:null,compare:null,revealedAt:null};}
export function saveAnswer(record,stage,answer,now=new Date().toISOString()){
 if(!['position','compare'].includes(stage) || (stage==='compare'&&!record.position))throw new Error('Save the position judgment first.');
 if(stage==='position' && !['idea','unsure','skip'].includes(answer.status))throw new Error('Choose an answer status.');
 if(stage==='compare' && !['A','B','equivalent','neither','unsure'].includes(answer.preference))throw new Error('Choose a comparison.');
 const next=clone(record),entry={...clone(answer),savedAt:now,revealStage:record.revealedAt?'explain':stage};
 if(next[stage])next[stage].revisions.push(entry);else next[stage]={initial:entry,revisions:[]};
 return next;
}
export function revealRecord(record,now=new Date().toISOString()){
 if(!record.position||!record.compare)throw new Error('Save both initial judgments before revealing diagnostics.');
 return {...clone(record),revealedAt:record.revealedAt??now};
}
export function restoreRecord(text,meta){
 if(!text)return createRecord(meta);
 const value=JSON.parse(text);
 if(value?.schemaVersion!==1||value.caseId!==meta.caseId||value.packageId!==meta.packageId)throw new Error('Saved response belongs to another case or package.');
 for(const stage of ['position','compare'])if(value[stage] && (!value[stage].initial?.savedAt||!Array.isArray(value[stage].revisions)))throw new Error('Saved response is malformed.');
 if((value.compare&&!value.position)||(value.revealedAt&&!value.compare))throw new Error('Saved stage order is invalid.');
 return value;
}
export function exportResponses(records){return {format:'settlex-decision-review-responses',schemaVersion:1,exportedAt:new Date().toISOString(),responses:clone(records)};}
