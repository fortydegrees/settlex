import { describe, expect, it } from 'vitest';
import { buildGameLogRows } from '../gameLogRows';

const headers = (entries) => buildGameLogRows(entries).filter((row) => row.isDivider);
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
  it('counts main turns independently of setup when old archives omit turn metadata', () => {
    expect(headers([
      { type: 'build:settlement', actorId: '0', data: { initialPlacement: true } },
      { type: 'turn:end' },
      { type: 'build:settlement', actorId: '1', data: { initialPlacement: true } },
      { type: 'phase:main' },
      { type: 'roll', actorId: '0' },
      { type: 'turn:end' },
      { type: 'roll', actorId: '1' },
    ]).map(({ phase, turn, player }) => [phase, turn, player.id])).toEqual([
      ['placement', null, '0'], ['placement', null, '1'], ['main', 1, '0'], ['main', 2, '1'],
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
