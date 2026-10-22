import { replayHANTrace } from './reader';
import type { HANRecord, Resource, Formula, State } from './types';

/** Experimental post-game presentation projection, not CGN wire syntax.
 * Seats and locations use record IDs; resources use HAN codes.
 * No native source log, clock, forced provenance, or identity metadata is read.
 */
export interface HANLogEntry {
  id: number;
  actionIndex: number;
  tokenStart: number;
  tokenEnd: number;
  type: string;
  actorId?: string;
  data: Record<string, unknown>;
}
const resources: Resource[] = ['B', 'G', 'L', 'O', 'W'];
const cardNames = { k: 'knight', r: 'roadBuilding', m: 'monopoly', y: 'yearOfPlenty' };

function gains(before: State, after: State, player: string): Formula {
  return Object.fromEntries(resources.map(r => [r, after.hands[player][r] - before.hands[player][r]])
    .filter(([, count]) => Number(count) > 0));
}

export function projectHANLog(record: HANRecord): HANLogEntry[] {
  const trace = replayHANTrace(record);
  const rows: HANLogEntry[] = [];
  for (const step of trace.steps) {
    const { event, before, after, actionIndex, tokenStart, tokenEnd } = step;
    const actor = before.current;
    const setup = before.phase === 'setupRoad' || before.phase === 'setupSettlement';
    const emit = (type: string, actorId: string | undefined, data: Record<string, unknown> = {}) => {
      rows.push({ id: rows.length + 1, actionIndex, tokenStart, tokenEnd, type,
        ...(actorId === undefined ? {} : { actorId }), data });
    };
    switch (event.type) {
      case 'build':
        emit(`build:${event.piece}`, actor, event.piece === 'city' ? { nodeId: event.at } :
          before.phase === 'freeRoads' ? { edgeId: event.at, free: true, via: 'devCard' } :
          { [event.piece === 'road' ? 'edgeId' : 'nodeId']: event.at, initialPlacement: setup });
        break;
      case 'roll': emit('roll', actor, { dice: event.dice, total: event.dice[0] + event.dice[1] }); break;
      // The current Settlex presentation deliberately omits the drawn card. The
      // omniscient core retains it; a richer viewer can display it from the trace.
      case 'buyDev': emit('dev:buy', actor); break;
      case 'play': emit('dev:play', actor, { cardType: cardNames[event.card] }); break;
      case 'discard': emit('discard', event.player, { resources: event.resources }); break;
      case 'moveRobber': {
        const tile = record.board.tiles.find(t => t.id === event.at)!;
        emit('robber:move', actor, { tileId: tile.id, tileResource: tile.resource, tileNumber: tile.number });
        break;
      }
      case 'steal': emit('robber:steal', actor, { victimId: event.from, resource: event.resource }); break;
      case 'trade':
        emit(event.with === '0' ? 'trade:maritime' : 'trade:domestic', actor,
          { give: event.give, receive: event.take, ...(event.with === '0' ? {} : { with: event.with }) });
        break;
      case 'end': emit('turn:end', actor); break;
    }
    for (const [key, type] of [['road', 'award:longestRoad'], ['army', 'award:largestArmy']] as const) {
      const owner = after.awards[key];
      if (owner !== null && owner !== before.awards[key])
        emit(type, owner, before.awards[key] === null ? {} : { previousOwnerId: before.awards[key] });
    }
    if (event.type === 'roll' || (event.type === 'build' && setup && event.piece === 'settlement') ||
        (event.type === 'play' && event.card === 'y')) {
      for (const player of record.players) {
        const received = gains(before, after, player);
        if (Object.keys(received).length) emit('resource:gain', player, { resources: received });
      }
    }
    if (event.type === 'roll' && event.dice[0] + event.dice[1] !== 7) {
      // Entitlement is derived from the board before allocation; the actual
      // allocation comes from replay, including the single-claimant short-bank rule.
      const claims: Partial<Record<Resource, Record<string, number>>> = {};
      for (const tile of record.board.tiles) {
        if (!tile.resource || tile.id === before.robber || tile.number !== event.dice[0] + event.dice[1]) continue;
        for (const vertex of tile.vertices) {
          const building = before.buildings[vertex];
          if (!building) continue;
          const entitled = claims[tile.resource] ??= {};
          entitled[building.owner] = (entitled[building.owner] ?? 0) + (building.kind === 'city' ? 2 : 1);
        }
      }
      for (const resource of resources) {
        const entitledByPlayerId = claims[resource];
        if (!entitledByPlayerId) continue;
        const required = Object.values(entitledByPlayerId).reduce((a, b) => a + b, 0);
        const available = before.bank[resource];
        if (required <= available) continue;
        const allocatedByPlayerId = Object.fromEntries(record.players.map(p => [p, gains(before, after, p)[resource] ?? 0])
          .filter(([, count]) => Number(count) > 0));
        emit('resource:shortage', undefined, { resource, required, available, entitledByPlayerId, allocatedByPlayerId });
      }
    }
    if (event.type === 'play' && event.card === 'm')
      emit('dev:monopolyResult', actor, { resource: event.resource,
        amountStolen: after.hands[actor][event.resource] - before.hands[actor][event.resource] });
    if (after.winner !== null && before.winner === null)
      emit('game:over', after.winner, { winnerId: after.winner, reason: 'victoryPoints' });
    if (setup && event.type === 'build' && event.piece === 'road') {
      if (after.phase === 'preRoll') emit('phase:main', 'system');
      else emit('turn:end', actor, { phase: 'placement' });
    }
  }
  return rows;
}
