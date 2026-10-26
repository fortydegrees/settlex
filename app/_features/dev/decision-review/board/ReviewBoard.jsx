'use client';
import {useEffect,useState} from 'react';
import {GameScreenWithEffects} from '../../../game/GameScreen';
import {buildReplayGameScreenProps} from '../../../replay/replayGameScreenProps';
export function ReviewBoard(){
 const [display,setDisplay]=useState(null);
 useEffect(()=>{
  const receive=event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='decision-review-frame')setDisplay(event.data.display);};
  const key=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)){event.preventDefault();parent.postMessage({type:'decision-review-key',key:event.key},location.origin);}};
  window.addEventListener('message',receive);window.addEventListener('keydown',key);
  parent.postMessage({type:'decision-review-ready'},location.origin);
  return()=>{window.removeEventListener('message',receive);window.removeEventListener('keydown',key);};
 },[]);
 if(!display)return <p className="p-ui-4 type-body text-ink-secondary">Loading position…</p>;
 const {frame,perspectiveId,caseId}=display;
 const matchData=['0','1'].map(id=>({id:Number(id),name:`Player ${Number(id)+1}`}));
 return <><GameScreenWithEffects {...buildReplayGameScreenProps({event:{...frame,turn:frame.state.ctx.turn},perspectiveId,matchID:caseId,matchData,resultsOpen:false,isComplete:false,revealAllHands:false})}/><style jsx global>{`[data-meta-left-rail-shell]{display:none!important}`}</style></>;
}
