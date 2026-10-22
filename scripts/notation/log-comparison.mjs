// Proof-only source adapter. Never imported by the saved-record projector.
import { isDeepStrictEqual } from 'node:util';
const resources = { Brick:'B', Wheat:'G', Wood:'L', Ore:'O', Sheep:'W' };
const supported = new Set(['build:settlement','build:road','build:city','roll','discard','robber:move','robber:steal','dev:buy','dev:play','dev:monopolyResult','trade:maritime','turn:end','phase:main','resource:gain','resource:shortage','award:longestRoad','award:largestArmy','game:over']);
const lookup = (map, key, kind) => {
  if (!Object.hasOwn(map, key)) throw new Error(`Unmapped ${kind}: ${key}`);
  return map[key];
};
export function normalizeNativeLog(entries, mapping, seats) {
  return entries.map(entry => {
    if (!supported.has(entry.type)) throw new Error(`Uncompared native event type: ${entry.type}`);
    for (const key of Object.keys(entry)) {
      if (!['id','turn','phase','forced','type','actorId','data'].includes(key))
        throw new Error(`Uncompared native field: ${key}`);
    }
    const player = id => id === 'system' ? id : lookup(seats, id, 'seat');
    const resource = r => lookup(resources, r, 'resource');
    const formula = f => Object.fromEntries(Object.entries(f).map(([r,n]) => [resource(r),n]));
    const players = f => Object.fromEntries(Object.entries(f).map(([p,n]) => [player(p),n]));
    // Preserve every data field. A new field must compare or fail, never vanish.
    const data = structuredClone(entry.data ?? {});
    for (const key of ['nodeId','edgeId','tileId']) if (key in data)
      data[key] = lookup(mapping[{nodeId:'nodeBySource',edgeId:'edgeBySource',tileId:'tileBySource'}[key]],data[key],key);
    for (const key of ['victimId','previousOwnerId','winnerId']) if (key in data) data[key] = player(data[key]);
    for (const key of ['resources','give','receive']) if (key in data) data[key] = formula(data[key]);
    for (const key of ['entitledByPlayerId','allocatedByPlayerId']) if (key in data) data[key] = players(data[key]);
    if ('resource' in data) data.resource = resource(data.resource);
    if ('tileResource' in data) data.tileResource = data.tileResource === 'Desert' || data.tileResource === null ? null : resource(data.tileResource);
    return { type:entry.type, ...(entry.actorId === undefined ? {} : {actorId:player(entry.actorId)}), data };
  });
}
export function semanticLog(entries) {
  return entries.map(({type,actorId,data}) => ({type,...(actorId === undefined ? {} : {actorId}),data}));
}
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;

// A production roll emits gains followed by shortages. Only the adjacent shortage
// batch in that roll's consequence block is unordered; every other row stays put.
export function canonicalizeLogForComparison(rows) {
  const out = [...rows];
  for (let i = 0; i < out.length; i++) {
    if (out[i].type !== 'roll') continue;
    let start = i + 1;
    while (out[start]?.type === 'resource:gain') start++;
    let end = start;
    while (out[end]?.type === 'resource:shortage') end++;
    const batch = out.slice(start, end).sort((a,b) => JSON.stringify(stable(a)).localeCompare(JSON.stringify(stable(b))));
    out.splice(start, end - start, ...batch);
    i = Math.max(i, end - 1);
  }
  return out;
}
export function compareLogs(expectedRows, actualRows) {
  const expected = canonicalizeLogForComparison(expectedRows);
  const actual = canonicalizeLogForComparison(actualRows);
  const differences = [];
  for (let i=0; i<Math.max(expected.length,actual.length); i++)
    if (!isDeepStrictEqual(expected[i],actual[i])) differences.push({row:i+1,expected:expected[i]??null,actual:actual[i]??null});
  return {expectedRows:expected.length, actualRows:actual.length, mismatchCount:differences.length, differences};
}
