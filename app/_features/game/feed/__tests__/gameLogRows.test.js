import { describe, expect, it } from 'vitest';
import { CreateGameReducer, InitializeGame } from "boardgame.io/dist/cjs/internal.js";
import { createCatanGame } from "../../../../../lib/game-runtime/Game";
import { buildGameLogRows } from '../gameLogRows';

const headers = (entries) => buildGameLogRows(entries).filter((row) => row.isDivider && !row.isPhase);
describe('game log turn grouping', () => {
  it('labels the incoming turn, including actions before the roll', () => {
    const entries = [
      { id: 1, type: 'roll', actorId: '0', turn: 12 },
      { id: 2, type: 'turn:end', actorId: '0', turn: 12 },
      { id: 3, type: 'dev:play', actorId: '1', turn: 13 },
      { id: 4, type: 'roll', actorId: '1', turn: 13 },
      { id: 5, type: 'resource:gain', actorId: '0', turn: 13 },
    ];
    expect(headers(entries).map(({ turn, player }) => [turn, player.id])).toEqual([[12, '0'], [13, '1']]);
    expect(buildGameLogRows(entries).map((row) => row.key)).toEqual(['turn-1', '1', 'turn-3', '3', '4', '5']);
  });
  it('keeps victory with the preceding action despite imported end dividers and changed turn metadata', () => {
    const entries = [
      { id: 'buy', type: 'dev:buy', actorId: '0', turn: 60 },
      { id: 'end', type: 'turn:end', actorId: '0' },
      { id: 'win', type: 'game:over', actorId: '0', turn: 61 },
      { id: 'trailing', type: 'turn:end' },
    ];
    expect(buildGameLogRows(entries).map((row) => row.key)).toEqual(['turn-buy', 'buy', 'win']);
  });
  it('omits placement turn headings and preserves main turn grouping in older archives', () => {
    expect(headers([
      { type: 'build:settlement', actorId: '0', data: { initialPlacement: true } },
      { type: 'turn:end' },
      { type: 'build:settlement', actorId: '1', data: { initialPlacement: true } },
      { type: 'phase:main' },
      { type: 'roll', actorId: '0' },
      { type: 'turn:end' },
      { type: 'roll', actorId: '1' },
    ]).map(({ phase, turn, player }) => [phase, turn, player.id])).toEqual([
      ['main', 2, '1'],
    ]);
  });
  it('does not invent a turn for server messages or a lone result', () => {
    expect(headers([{ type: 'server:disconnect', data: { playerId: '0' } }, { type: 'game:over', actorId: '1' }])).toEqual([]);
  });
  it('uses the roller instead of a resource recipient to identify a turn', () => {
    expect(headers([
      { type: 'resource:gain', actorId: '1', turn: 4 },
      { type: 'roll', actorId: '0', turn: 4 },
    ])[0].player.id).toBe('0');
  });
  it('preserves event keys and hidden-entry filtering', () => {
    const rows = buildGameLogRows([{ id: 1, type: 'server:idle' }, { id: 2, type: 'roll', actorId: '0' }]);
    expect(rows.map((row) => row.key)).toEqual(['turn-2', '2']);
  });
});

describe('phase markers and starting settlement hexes', () => {
  it('shows each phase once, before its actions, without selectable event identities', () => {
    const rows = buildGameLogRows([
      { id: 'start', type: 'phase:placement' },
      { id: 's', type: 'build:settlement', actorId: '0', data: { initialPlacement: true } },
      { id: 'main', type: 'phase:main' },
      { id: 'r', type: 'roll', actorId: '0' },
    ]);
    expect(rows.filter(r => r.isPhase).map(r => r.phase)).toEqual(['placement', 'main']);
    expect(rows.map(r => r.key)).toEqual(['phase-placement', 's', 'phase-main', 'r']);
    expect(rows.filter(r => r.isPhase).every(r => r.isDivider && !r.entry)).toBe(true);
  });
  it('infers setup for older logs and shows setup before the first move', () => {
    expect(buildGameLogRows([], {}, { phase: 'placement' })[0]).toMatchObject({ isPhase: true, phase: 'placement' });
    const rows = buildGameLogRows([
      { type: 'build:settlement', actorId: '0', data: { initialPlacement: true } },
      { type: 'roll', actorId: '0' },
    ]);
    expect(rows.filter(r => r.isPhase).map(r => r.phase)).toEqual(['placement', 'main']);
  });
  const tiles = [
    { type: 'Land', tile: { id: 1, resource: 'Wood', number: 6, nodes: { N: 10, S: 11, E: 12 } } },
    { type: 'Land', tile: { id: 2, resource: 'Ore', number: 9, nodes: { N: 10, S: 11 } } },
    { type: 'Land', tile: { id: 3, resource: 'Desert', number: null, nodes: { N: 10 } } },
    { type: 'Water', tile: { id: 4, resource: 'Sea', nodes: { N: 10, S: 12 } } },
  ];
  it.each([[10, 3], [11, 2], [12, 1]])('shows exactly the land hexes adjacent to node %s', (nodeId, count) => {
    const entry = { id: 's', type: 'build:settlement', actorId: '0', data: { initialPlacement: true, nodeId } };
    const rows = buildGameLogRows([entry], {}, { tiles });
    const tokens = rows.find(r => r.key === 's').tokens.filter(t => t.kind === 'tileDestination');
    expect(tokens).toHaveLength(count);
    expect(tokens[0]).toMatchObject({ resource: 'Wood', number: 6 });
    expect(entry.data).not.toHaveProperty('tiles');
  });
  it('leaves main-game settlements and logs without a board readable', () => {
    const entry = { id: 's', type: 'build:settlement', actorId: '0', data: { nodeId: 10 } };
    for (const rows of [buildGameLogRows([entry], {}, { tiles }), buildGameLogRows([{ ...entry, data: { ...entry.data, initialPlacement: true } }])]) {
      expect(rows.find(r => r.key === 's').tokens.some(t => t.kind === 'tileDestination')).toBe(false);
    }
  });
});

it("projects a real runtime settlement and board into phase and tile rows", () => {
  const game = createCatanGame({ includeDebugMoves: false, includeEffects: false });
  const reducer = CreateGameReducer({ game, isClient: false });
  let state = InitializeGame({ game, numPlayers: 2 });
  const move = (type, args, playerID) => {
    state = reducer(state, { type: "MAKE_MOVE", payload: { type, args, playerID } });
  };
  move("readyUp", [], "0");
  move("readyUp", [], "1");
  expect(buildGameLogRows(state.G.gameLog, {}, { tiles: state.G.tiles, phase: state.ctx.phase })[0]).toMatchObject({ isPhase: true, phase: "placement" });
  const nodeId = state.G.valids.nodes[0];
  move("placeSettlement", [nodeId], state.ctx.currentPlayer);
  const rows = buildGameLogRows(state.G.gameLog, {}, { tiles: state.G.tiles, phase: state.ctx.phase });
  const settlement = rows.find(row => row.entry?.type === "build:settlement");
  const adjacent = state.G.tiles.filter(({ type, tile }) => type === "Land" && Object.values(tile.nodes).includes(nodeId));
  expect(adjacent.length).toBeGreaterThan(0);
  expect(settlement.tokens.filter(t => t.kind === "tileDestination")).toEqual(adjacent.map(({ tile }) => ({ kind: "tileDestination", resource: tile.resource, number: tile.number })));
});

it('uses the phase heading for the first turn while retaining subsequent turn headings', () => {
  const rows = buildGameLogRows([
    { id: 'phase', type: 'phase:main' },
    { id: 'knight', type: 'dev:play', actorId: '0', turn: 1 },
    { id: 'roll', type: 'roll', actorId: '0', turn: 1 },
    { id: 'end', type: 'turn:end', actorId: '0', turn: 1 },
    { id: 'next', type: 'roll', actorId: '1', turn: 2 },
  ]);
  expect(rows.map(row => row.key)).toEqual(['phase-main', 'knight', 'roll', 'turn-next', 'next']);
  expect(rows.find(row => row.key === 'turn-next')).toMatchObject({ turn: 2, player: { id: '1' } });
});
