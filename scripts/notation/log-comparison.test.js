import { describe, expect, it } from 'vitest';
import { compareLogs, normalizeNativeLog } from './log-comparison.mjs';
describe('native log comparison contract', () => {
  const rows = [{id:1,turn:1,phase:'main',type:'discard',actorId:'0',data:{resources:{Wood:2}}}];
  it('maps source identities without changing amounts and detects removed or altered rows', () => {
    const expected = normalizeNativeLog(rows, {}, {'0':'1'});
    expect(expected).toEqual([{type:'discard',actorId:'1',data:{resources:{L:2}}}]);
    expect(compareLogs(expected,[]).mismatchCount).toBe(1);
    expect(compareLogs(expected,[{...expected[0],data:{resources:{L:1}}}]).mismatchCount).toBe(1);
  });
  it('refuses unknown events, source identifiers or top-level fields; preserves extra data for comparison', () => {
    expect(() => normalizeNativeLog([{type:'chat'}],{},{})).toThrow(/Uncompared/);
    expect(() => normalizeNativeLog(rows,{},{})).toThrow(/Unmapped/);
    expect(() => normalizeNativeLog([{...rows[0],surprise:true}],{}, {'0':'1'})).toThrow(/Uncompared/);
    const extra = [{...rows[0],data:{...rows[0].data,surprise:true}}];
    expect(compareLogs(normalizeNativeLog(rows,{}, {'0':'1'}), normalizeNativeLog(extra,{}, {'0':'1'})).mismatchCount).toBe(1);
  });
  it('accepts only independent shortage reordering within the same roll', () => {
    const roll = dice => ({type:'roll',actorId:'1',data:{dice}});
    const shortage = (resource,available=0) => ({type:'resource:shortage',data:{resource,required:2,available,entitledByPlayerId:{'1':1,'2':1},allocatedByPlayerId:{}}});
    const end = {type:'turn:end',actorId:'1',data:{}};
    const ore=shortage('O'),brick=shortage('B');
    const expected=[roll([1,2]),ore,brick,end];
    expect(compareLogs(expected,[roll([1,2]),brick,ore,end]).mismatchCount).toBe(0);
    for (const actual of [
      [roll([1,2]),brick,shortage('O',1),end],
      [roll([1,2]),brick,end],
      [roll([1,2]),brick,ore,ore,end],
      [roll([2,1]),brick,ore,end],
      [roll([1,2]),brick,end,ore],
    ]) expect(compareLogs(expected,actual).mismatchCount).toBeGreaterThan(0);
    expect(compareLogs([roll([1,2]),ore,end,roll([1,2]),brick], [roll([1,2]),brick,end,roll([1,2]),ore]).mismatchCount).toBeGreaterThan(0);
    expect(compareLogs([ore,brick],[brick,ore]).mismatchCount).toBeGreaterThan(0);
  });

});
