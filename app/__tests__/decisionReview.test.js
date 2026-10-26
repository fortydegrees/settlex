import {describe,it,expect} from 'vitest';
import {createRecord,saveAnswer,revealRecord,restoreRecord,exportResponses} from '../_features/dev/decision-review/reviewModel.js';
const meta={caseId:'case-03',packageId:'review-v1-test'};
describe('saved decision judgments',()=>{
 it('requires position then comparison before reveal; retains immutable initial answers and revisions',()=>{
  const empty=createRecord(meta);
  expect(()=>saveAnswer(empty,'compare',{preference:'A'})).toThrow();
  expect(()=>revealRecord(empty)).toThrow();
  const first=saveAnswer(empty,'position',{status:'unsure',reason:'Need a route',confidence:'low'});
  const revised=saveAnswer(first,'position',{status:'idea',reason:'Build road',confidence:'medium'});
  expect(first.position.initial.reason).toBe('Need a route');
  expect(revised.position.initial).toEqual(first.position.initial);
  expect(revised.position.revisions).toHaveLength(1);
  expect(()=>revealRecord(revised)).toThrow();
  const comparison=saveAnswer(revised,'compare',{preference:'equivalent',reason:'Both viable'});
  const revealed=revealRecord(comparison);
  expect(revealed.revealedAt).toBeTruthy();
  expect(saveAnswer(revealed,'compare',{preference:'B',reason:'After explanation'}).compare.revisions[0].revealStage).toBe('explain');
 });
 it('round trips local persistence, rejects another package and exports identities/stages',()=>{
  const record=saveAnswer(createRecord(meta),'position',{status:'skip',reason:'',confidence:'unsure'});
  expect(restoreRecord(JSON.stringify(record),meta)).toEqual(record);
  expect(()=>restoreRecord(JSON.stringify(record),{...meta,packageId:'different'})).toThrow();
  expect(()=>restoreRecord('{',meta)).toThrow();
  expect(exportResponses([record]).responses[0]).toMatchObject({...meta,position:{initial:{status:'skip',revealStage:'position'}}});
 });
});
