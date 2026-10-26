import environment from "../../../../lib/config/environment.cjs";
const { readEnvironment } = environment;
import {constants} from 'node:fs';
import {open} from 'node:fs/promises';
import {join,resolve} from 'node:path';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export const createDecisionReviewHandler=({directory=readEnvironment(process.env, "SETTLEHEX_DECISION_REVIEW_DIR"),mode=process.env.NODE_ENV}={})=>async request=>{
 if(mode!=='development')return json({error:'Not found'},404);
 const url=new URL(request.url),origin=request.headers.get('origin');
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||(origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Local access required'},403);
 if(!directory)return json({error:'Set SETTLEHEX_DECISION_REVIEW_DIR to the generic review packages directory and restart the development server.'},503);
 const caseId=url.searchParams.get('case'),stage=url.searchParams.get('stage');
 if((caseId!==null&&!/^case-\d{2}$/.test(caseId))||(caseId!==null&&!['position','compare','diagnostic'].includes(stage))||(caseId===null&&stage!==null))return json({error:'Invalid case or stage'},400);
 const name=caseId?`${caseId}.${stage}.json`:'index.json';let file;
 try{
  file=await open(join(resolve(directory),name),constants.O_RDONLY|constants.O_NOFOLLOW);
  const stat=await file.stat();if(!stat.isFile()||stat.size>32*1024*1024)throw new Error('Invalid package file');
  const payload=JSON.parse(await file.readFile('utf8'));
  if(payload.schemaVersion!==1||payload.format!==(caseId?'settlex-decision-review':'settlex-decision-review-index')||(caseId&&(payload.caseId!==caseId||payload.stage!==stage)))throw new Error('Invalid package identity');
  return json(payload);
 }catch(error){return json({error:'Review package unavailable or invalid.'},error.code==='ENOENT'?404:400);}
 finally{await file?.close();}
};
export const GET=request=>createDecisionReviewHandler()(request);
