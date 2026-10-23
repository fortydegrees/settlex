import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { replayHAN, replayHANTrace } from './reader';
import { projectHANLog } from './log';
import type { HANRecord } from './types';
const record: HANRecord = JSON.parse(readFileSync(resolve(__dirname, '../../../docs/notation/examples/settlehex-complete.han.json'), 'utf8'));
const prefix = (n: number): HANRecord => ({ ...structuredClone(record), coverage: 'prefix', result: null, actions: record.actions.slice(0, n) });

describe('saved-record post-game log', () => {
  it('reconstructs setup actors, free placements, starting resources and main-phase boundary', () => {
    const rows = projectHANLog(prefix(12));
    expect(rows.filter(r => r.type === 'build:settlement').map(r => r.actorId)).toEqual(['1','2','3','3','2','1']);
    expect(rows.filter(r => r.type === 'build:road')).toHaveLength(6);
    expect(rows.filter(r => r.type === 'resource:gain')).toHaveLength(3);
    expect(rows.filter(r => r.type === 'turn:end')).toHaveLength(5);
    expect(rows[rows.length - 1]).toMatchObject({type:'phase:main', actorId:'system', actionIndex:11});
    expect(rows.filter(r => r.type.startsWith('build:')).every(r => r.data.initialPlacement === true)).toBe(true);
  });
  it('preserves checkpoint parity and exact token ranges for compound paid actions', () => {
    const trace = replayHANTrace(record);
    expect([trace.initial, ...trace.steps.map(s => s.after)]).toEqual(replayHAN(record));
    expect(trace.steps.flatMap(s => record.actions.slice(s.tokenStart, s.tokenEnd))).toEqual(record.actions);
    const paid = trace.steps.filter(s => s.paid);
    expect(paid.length).toBeGreaterThan(0);
    expect(paid.every(s => s.tokenEnd - s.tokenStart === 2 && s.event.type === 'build')).toBe(true);
    const rows = projectHANLog(record);
    expect(rows[rows.length - 1]).toMatchObject({type:'game:over', actorId:'1',data:{winnerId:'1',reason:'victoryPoints'}});
    expect(rows.filter(r => r.type === 'resource:shortage')).toHaveLength(10);
    expect(rows.filter(r => r.type === 'award:largestArmy')).toHaveLength(1);
  });
  it('ignores optional additions without changing core log and rejects invalid histories', () => {
    const small = prefix(12);
    expect(projectHANLog({...small,annotations:{chat:[{text:'hi'}],clock:123}})).toEqual(projectHANLog(small));
    expect(() => projectHANLog({...small,actions:['BR']})).toThrow();
    expect(() => projectHANLog({...small,actions:['E']})).toThrow();
    expect(projectHANLog(prefix(0))).toEqual([]);
  });
  it('derives Monopoly and Year of Plenty gains from legal alternate draw histories', () => {
    // Same legal opening, replacing its first draw with a different observed card.
    // This is a constructed conformance example, not another native-game proof.
    const monopoly = prefix(62);
    expect(monopoly.actions[52]).toBe('BDv');
    monopoly.actions[52] = 'BDm';
    monopoly.actions.push('UDmO');
    expect(projectHANLog(monopoly).slice(-2).map(({type,actorId,data}) => ({type,actorId,data}))).toEqual([
      {type:'dev:play',actorId:'1',data:{cardType:'monopoly'}},
      {type:'dev:monopolyResult',actorId:'1',data:{resource:'O',amountStolen:9}}
    ]);
    const plenty = prefix(62);
    plenty.actions[52] = 'BDy';
    plenty.actions.push('UDy(BL)');
    expect(projectHANLog(plenty).slice(-2).map(({type,actorId,data}) => ({type,actorId,data}))).toEqual([
      {type:'dev:play',actorId:'1',data:{cardType:'yearOfPlenty'}},
      {type:'resource:gain',actorId:'1',data:{resources:{B:1,L:1}}}
    ]);
  });
  it('distinguishes setup, Road Building and paid placement without payment rows', () => {
    const rows = projectHANLog(record);
    for (const index of [426,427,1305,1306]) {
      expect(rows.filter(r => r.tokenStart === index)).toMatchObject([
        {type:'build:road',actorId:'1',tokenEnd:index+1,data:{free:true,via:'devCard'}}
      ]);
    }
    const paid = replayHANTrace(record).steps.find(s => s.paid)!;
    expect(rows.find(r => r.actionIndex === paid.actionIndex)).toMatchObject({type:'build:city',tokenStart:paid.tokenStart,tokenEnd:paid.tokenStart+2});
  });

});
