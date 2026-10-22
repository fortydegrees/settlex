import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { exportSettlexNotationArchive, projectHANLog } from '@settlex/game-core';
import { mapSettlexBoard } from '../../game-core/src/notation/board';
import { runLocalSettlexGame } from '../../server/__tests__/helpers/notationGame.ts';
import { buildReplayFrames } from '../../lib/server/replays/buildReplayFrames.js';
import { formatLogEntry } from '../../app/catana/utils/gameText.js';
import { normalizeNativeLog, semanticLog, compareLogs, canonicalizeLogForComparison } from './log-comparison.mjs';
const hash = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])) : value;
const counts = rows => rows.reduce((out,r) => ({...out,[r.type]:(out[r.type]??0)+1}),{});
const names = { B:'Brick',G:'Wheat',L:'Wood',O:'Ore',W:'Sheep' };
// Display-only resource translation. The comparison above it retains coordinates,
// baskets and all semantic fields even when the current UI doesn't render them.
function displayEntry(row) {
  const data=structuredClone(row.data);
  for(const key of ['resources','give','receive']) if(data[key])
    data[key]=Object.fromEntries(Object.entries(data[key]).sort().map(([r,n])=>[names[r],n]));
  for(const key of ['resource','tileResource']) if(data[key]) data[key]=names[data[key]];
  return {...row,data};
}
const text = row => formatLogEntry(displayEntry(row)).map(t => {
  if(t.kind==='player') return t.name;
  if(t.kind==='resource') return `[${t.resource}]`;
  if(t.kind==='die') return `[${t.value}]`;
  if(t.kind==='divider') return t.variant==='strong' ? '— Main game —' : '— End turn —';
  if(t.kind==='tileDestination') return `${t.resource} ${t.number}`;
  return t.text ?? t.label ?? `[${t.kind}]`;
}).join('');

describe('actual Settlex saved-record log proof', () => {
  it('compares the saved-record-only projection with every native gameplay row in order', () => {
    const raw=readFileSync(resolve('docs/notation/examples/settlex-complete.han.json'),'utf8');
    const saved=JSON.parse(raw);
    // Project BEFORE generating any native source or comparison log.
    const projected=projectHANLog(saved);
    const quiet=vi.spyOn(console,'log').mockImplementation(()=>{});
    let run, exported;
    try {
      run=runLocalSettlexGame({maxMoves:6000});
      exported=exportSettlexNotationArchive(run.archive,buildReplayFrames);
    } finally {quiet.mockRestore();}
    expect(exported.record).toEqual(saved);
    const native=run.archive.finalState.G.gameLog;
    const seats=Object.fromEntries(run.archive.initialState.G.core.players.map((p,i)=>[p,saved.players[i]]));
    const expected=canonicalizeLogForComparison(normalizeNativeLog(native,mapSettlexBoard(run.archive.initialState),seats));
    const actual=canonicalizeLogForComparison(semanticLog(projected));
    const comparison=compareLogs(expected,actual);
    const receipt={comparisonPolicy:'same-roll shortage notices unordered; all other rows ordered',source:{kind:'actual-local-boardgame-io',seed:run.seed,moves:run.moves},
      savedRecordFileSha256:hash(raw),recordSha256:hash(saved),nativeLogSha256:hash(native),
      expectedSemanticSha256:hash(canonical(expected)),actualSemanticSha256:hash(canonical(actual)),
      sourceCheckpointsCompared:exported.checkpoints.length,
      comparison,sourceEventCounts:counts(native),projectedEventCounts:counts(projected),
      ignoredNativeMetadata:{fields:['id','turn','phase','forced'],forcedTrueRows:native.filter(r=>r.forced===true).length},
      unsupportedCoverage:['player trades','Monopoly','Year of Plenty','Longest Road transfers','forced actions','forfeit endings','chat','negotiation','clocks'],
      renderedTextDifferences:expected.map(text).filter((line,i)=>line!==text(actual[i]??{data:{}})).length};
    const output=process.env.CGN_LOG_PROOF_OUT;
    if(output){
      const dir=resolve(output); mkdirSync(dir); // New destination only; never overwrite evidence.
      writeFileSync(resolve(dir,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
      writeFileSync(resolve(dir,'projected-log.jsonl'),projected.map(r=>JSON.stringify(r)).join('\n')+'\n',{flag:'wx'});
      const sample=[...projected.slice(0,24),...projected.filter(r=>['resource:shortage','award:largestArmy','game:over'].includes(r.type))];
      writeFileSync(resolve(dir,'comparison.md'),'# Saved-record log comparison\n\nNative and reconstructed rows use record seat IDs and resource names. Resource icons are written as bracketed names.\n\n| Row | Native log | Saved-record log |\n|---|---|---|\n'+sample.map(r=>`| ${r.id} | ${text(expected[r.id-1])} | ${text(r)} |`).join('\n')+'\n',{flag:'wx'});
    }
    expect(comparison.mismatchCount,JSON.stringify(comparison.differences.slice(0,4),null,2)).toBe(0);
    expect(receipt.renderedTextDifferences).toBe(0);
    expect(native.length).toBeGreaterThan(3000);
  },120_000);
});
