// Run from the repository root after: pnpm -C game-core build
// Usage: node docs/notation/examples/inspect-record.mjs [record.json] [position]
// Tutorial only: full-information local files, no app/server/database imports.
import { readFile } from 'node:fs/promises';
import { replayHANTrace, projectHANLog } from '@settlehex/game-core';

const input = process.argv[2] ?? new URL('./settlehex-complete.han.json', import.meta.url);
const record = JSON.parse(await readFile(input, 'utf8'));
const trace = replayHANTrace(record);
const positions = [trace.initial, ...trace.steps.map(step => step.after)];
const cursor = process.argv[3] === undefined ? trace.steps.length : Number(process.argv[3]);
if (!Number.isInteger(cursor) || cursor < 0 || cursor >= positions.length) {
  throw new Error(`Position must be an integer from 0 to ${trace.steps.length}`);
}

const state = positions[cursor];
const log = projectHANLog(record).filter(row => row.actionIndex < cursor);

// A short valid prefix retains the SAME explicit initial board, not a snapshot.
// Cut at a logical action boundary: never split a paid buy/place pair.
const prefixSteps = trace.steps.slice(0, 2);
const prefix = {
  ...record,
  coverage: 'prefix',
  result: null,
  actions: record.actions.slice(0, prefixSteps.at(-1)?.tokenEnd ?? 0),
};
// Do not inherit annotations whose references might point past the cut.
delete prefix.annotations;
const prefixTrace = replayHANTrace(prefix);

console.log(JSON.stringify({
  format: record.format,
  rules: record.rules,
  coverage: record.coverage,
  tokens: record.actions.length,
  logicalActions: trace.steps.length,
  positions: positions.length,
  cursor,
  currentPlayer: state.current,
  phase: state.phase,
  winner: state.winner,
  points: state.points,
  // Pass this model to your renderer. Coordinates and artwork are presentation.
  board: {
    ...record.board,
    buildings: state.buildings,
    roads: state.roads,
    robber: state.robber,
  },
  visibleLogRowCount: log.length,
  latestLogRows: log.slice(-5),
  shortPrefix: {
    actions: prefix.actions,
    phase: prefixTrace.steps.at(-1)?.after.phase ?? prefixTrace.initial.phase,
  },
}, null, 2));
