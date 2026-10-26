import {afterEach,describe,it,expect} from 'vitest';
import {mkdtemp,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createDecisionReviewHandler} from '../api/dev/decision-review/handler.js';
const dirs=[];afterEach(async()=>{await Promise.all(dirs.splice(0).map(p=>rm(p,{recursive:true,force:true})));});
const request=(q='',headers={})=>new Request('http://127.0.0.1:3103/api/dev/decision-review'+q,{headers});
describe('generic development review packages',()=>{
 it('serves separate stages, rejects traversal, links, external origins and production',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'review-test-'));dirs.push(directory);
  const doc={format:'settlex-decision-review',schemaVersion:1,caseId:'case-03',packageId:'version',stage:'position'};
  await writeFile(join(directory,'case-03.position.json'),JSON.stringify(doc));
  await writeFile(join(directory,'index.json'),JSON.stringify({format:'settlex-decision-review-index',schemaVersion:1,cases:[]}));
  await symlink(join(directory,'case-03.position.json'),join(directory,'case-04.position.json'));
  const get=createDecisionReviewHandler({directory,mode:'development'});
  expect(await(await get(request('?case=case-03&stage=position'))).json()).toEqual(doc);
  expect(await(await get(request())).json()).toMatchObject({cases:[]});
  for(const q of ['?case=../case-03&stage=position','?case=case-03&stage=other','?case=case-04&stage=position'])expect((await get(request(q))).status).toBeGreaterThanOrEqual(400);
  expect((await get(request('',{origin:'https://example.com'}))).status).toBe(403);
  expect((await createDecisionReviewHandler({directory,mode:'production'})(request())).status).toBe(404);
 });
});
