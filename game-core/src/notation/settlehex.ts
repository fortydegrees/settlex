import { getVictoryPoints } from '../rules/victory';
import type { HANRecord, Card, Counts, Event, Resource, State } from './types';
import { replayHAN } from './reader';
import { toHAN } from './encoder';
import { mapSettleHexBoard, sourceResource, type BoardMapping } from './board';
type AnyRecord = Record<string, any>;
export type SourceFrame = {
  index: number;
  state: AnyRecord;
  logEntry: AnyRecord | null;
};
export type SourceArchive = {
  initialState: AnyRecord;
  log: AnyRecord[];
  finalState?: AnyRecord | null;
};
const cardCodes: Record<string, Card> = {
  knight: 'k',
  monopoly: 'm',
  roadBuilding: 'r',
  victoryPoint: 'v',
  yearOfPlenty: 'y'
};
const empty = (): Counts => ({
  B: 0,
  G: 0,
  L: 0,
  O: 0,
  W: 0
});
function insist(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function cards(values: unknown, label: string): Card[] {
  insist(Array.isArray(values), `${label} missing`);
  return values.map(v => {
    insist(typeof v === 'string' && cardCodes[v], `${label}: unknown card ${String(v)}`);
    return cardCodes[v];
  });
}
function counts(values: unknown, label: string): Counts {
  insist(Array.isArray(values), `${label} missing`);
  const out = empty();
  for (const v of values) out[sourceResource(v)]++;
  return out;
}
function formula(data: unknown, label: string): Partial<Counts> {
  insist(data && typeof data === 'object' && !Array.isArray(data), `${label} missing`);
  const out: Partial<Counts> = {};
  for (const [raw, n] of Object.entries(data)) {
    const r = sourceResource(raw);
    insist(Number.isSafeInteger(n) && Number(n) > 0, `${label}: invalid count ${raw}`);
    out[r] = Number(n);
  }
  return out;
}
function sourceCardDraw(before: AnyRecord, after: AnyRecord, actor: string): Card {
  const old = cards(before.G.core.playerStateById[actor]?.devCards, 'prior player development cards');
  const now = cards(after.G.core.playerStateById[actor]?.devCards, 'player development cards');
  const delta = [...now];
  for (const c of old) {
    const i = delta.indexOf(c);
    insist(i >= 0, 'development purchase removed an existing card');
    delta.splice(i, 1);
  }
  insist(delta.length === 1, 'development purchase has no unique actual card draw');
  return delta[0];
}
function validateRules(initial: AnyRecord): HANRecord['rules'] {
  const core = initial?.G?.core,
    r = core?.ruleset;
  insist(core && r, 'initial authoritative core/ruleset missing');
  const n = core.players?.length;
  const duel = n === 2;
  insist((n === 2 || n === 3 || n === 4) && core.players.every((p: string, i: number) => p === String(i)), 'unsupported source seat order');
  insist(r.victoryPointsToWin === (duel ? 15 : 10) && r.discardLimit === (duel ? 9 : 7), 'unsupported victory/discard rules');
  insist(r.friendlyRobber?.enabled === true && r.friendlyRobber?.vpThreshold === 2, 'unsupported friendly robber rules');
  insist(r.allowPlayerTrades === !duel && r.bank?.finite === true && r.tradeRates?.bank === 4 && r.tradeRates?.genericPort === 3 && r.tradeRates?.specificPort === 2, 'unsupported bank/trade rules');
  insist(r.pieceLimits?.roads === 15 && r.pieceLimits?.settlements === 5 && r.pieceLimits?.cities === 4 && r.longestRoadMinLength === 5 && r.largestArmyMinKnights === 3, 'unsupported piece/award rules');
  insist(r.devCardsEnabled === true, 'unsupported development-card rule: cards must be enabled');
  const expected = {
    knight: 14,
    monopoly: 2,
    roadBuilding: 2,
    victoryPoint: 5,
    yearOfPlenty: 2
  };
  insist(Object.entries(expected).every(([k, v]) => r.devCardCounts?.[k] === v), 'unsupported development inventory');
  const sameCounts = (value: unknown, want: Record<string, number>) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === Object.keys(want).length && Object.entries(want).every(([k, n]) => (value as AnyRecord)[k] === n);
  const bc = r.buildCosts;
  insist(bc && sameCounts(bc.road, {
    Wood: 1,
    Brick: 1
  }) && sameCounts(bc.settlement, {
    Wood: 1,
    Brick: 1,
    Sheep: 1,
    Wheat: 1
  }) && sameCounts(bc.city, {
    Wheat: 2,
    Ore: 3
  }) && sameCounts(bc.devCard, {
    Sheep: 1,
    Wheat: 1,
    Ore: 1
  }), 'unsupported build costs');
  for (const raw of ['Wood', 'Brick', 'Sheep', 'Wheat', 'Ore']) insist(r.bank?.resourceCounts?.[raw] === 19, 'unsupported bank inventory');
  insist(initial.G.core.devDeck?.length === 25, 'initial development deck must be complete');
  for (const p of core.players) {
    const s = core.playerStateById?.[p];
    insist(s && s.resources?.length === 0 && s.devCards?.length === 0, 'initial source player state is not empty');
  }
  insist(Object.keys(core.buildingsByNodeId ?? {}).length === 0 && Object.keys(core.roadsByEdgeId ?? {}).length === 0, 'initial source board is not empty');
  return duel ? 'duel-friendly-omniscient-prototype-1' : 'base-friendly-omniscient-prototype-1';
}
function seat(source: string): string {
  insist(/^\d+$/.test(source), 'invalid source seat');
  return String(Number(source) + 1);
}
function project(frame: SourceFrame, m: BoardMapping): Partial<State> {
  const core = frame.state.G.core;
  const hands: Record<string, Counts> = {},
    dev: State['dev'] = {},
    knights: Record<string, number> = {},
    points: Record<string, number> = {};
  for (const source of core.players) {
    const p = core.playerStateById[source],
      id = seat(source);
    hands[id] = counts(p.resources, `player ${source} resources`);
    const all = cards(p.devCards, `player ${source} development cards`);
    const fresh = cards(p.devCardsBoughtThisTurn, `player ${source} new cards`);
    const old = [...all];
    for (const c of fresh) {
      const i = old.indexOf(c);
      insist(i >= 0, `player ${source} fresh card missing from hand`);
      old.splice(i, 1);
    }
    dev[id] = {
      old: old.sort(),
      fresh: fresh.sort()
    };
    knights[id] = p.knightsPlayed;
    points[id] = getVictoryPoints(core, source);
  }
  const buildings: State['buildings'] = {};
  for (const [node, b] of Object.entries(core.buildingsByNodeId) as [string, AnyRecord][]) {
    const at = m.nodeBySource[node];
    insist(at, `unmapped building node ${node}`);
    buildings[at] = {
      owner: seat(b.ownerId),
      kind: b.type
    };
  }
  const roads: State['roads'] = {};
  for (const [edge, owner] of Object.entries(core.roadsByEdgeId)) {
    const at = m.edgeBySource[edge];
    insist(at, `unmapped road edge ${edge}`);
    roads[at] = seat(String(owner));
  }
  const deck = {
    k: 0,
    m: 0,
    r: 0,
    v: 0,
    y: 0
  };
  for (const c of cards(core.devDeck, 'development deck')) deck[c]++;
  const robber = m.tileBySource[String(core.robberTileId)];
  insist(robber, `unmapped robber tile ${core.robberTileId}`);
  return {
    hands,
    bank: counts(core.bank.resources, 'bank resources'),
    dev,
    deck,
    knights,
    buildings,
    roads,
    robber,
    awards: {
      road: core.awards.longestRoadOwnerId == null ? null : seat(core.awards.longestRoadOwnerId),
      army: core.awards.largestArmyOwnerId == null ? null : seat(core.awards.largestArmyOwnerId)
    },
    points,
    winner: core.gameOver?.winnerId == null ? null : seat(core.gameOver.winnerId)
  };
}
const projectionKeys = ['hands', 'bank', 'dev', 'deck', 'knights', 'buildings', 'roads', 'robber', 'awards', 'points', 'winner'] as const;
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}
function compare(actual: State, source: Partial<State>, frame: number): void {
  for (const key of projectionKeys) {
    const a = canonical(actual[key]),
      b = canonical(source[key]);
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`source checkpoint ${frame} differs at ${key}: notation=${JSON.stringify(a)} source=${JSON.stringify(b)}`);
  }
}
function translate(before: SourceFrame, after: SourceFrame, m: BoardMapping): Event[] {
  const action = after.logEntry?.action;
  insist(action?.type === 'MAKE_MOVE', 'unsupported non-move source action');
  const move = action.payload?.type,
    sourceActor = String(action.payload?.playerID ?? '');
  insist(before.state.G.core.players.includes(sourceActor), `unsupported source actor ${sourceActor}`);
  const oldLog = before.state.G.gameLog ?? [],
    newLog = after.state.G.gameLog ?? [];
  insist(Array.isArray(oldLog) && Array.isArray(newLog) && newLog.length >= oldLog.length, 'source gameLog missing or truncated');
  for (let i = 0; i < oldLog.length; i++) insist(JSON.stringify(oldLog[i]) === JSON.stringify(newLog[i]), `source gameLog was rewritten at ${i}`);
  const added = newLog.slice(oldLog.length);
  for (let i = 0; i < added.length; i++) insist(added[i]?.id === oldLog.length + i + 1, `source gameLog sequence gap at frame ${after.index}`);
  const entries = (type: string) => added.filter((e: AnyRecord) => e.type === type);
  const one = (type: string) => {
    const items = entries(type);
    insist(items.length === 1, `${move}: expected one ${type} outcome, got ${items.length}`);
    return items[0];
  };
  const actor = (entry: AnyRecord) => {
    insist(entry.actorId === sourceActor, `${move}: outcome actor mismatch`);
  };
  let events: Event[] = [];
  switch (move) {
    case 'readyUp':
    case 'autoStartGame':
      insist(entries('roll').length === 0, 'pregame move changed economy');
      break;
    case 'placeSettlement':
    case 'autoPlaceSettlement':
      {
        const e = one('build:settlement');
        actor(e);
        insist(typeof e.data?.initialPlacement === 'boolean', 'settlement placement fact missing');
        const at = m.nodeBySource[String(e.data.nodeId)];
        insist(at, 'settlement node unmapped');
        events = [{
          type: 'build',
          piece: 'settlement',
          at
        }];
        break;
      }
    case 'placeRoad':
    case 'autoPlaceRoad':
    case 'placeRoadFromDevCard':
    case 'autoPlaceRoadFromDevCard':
      {
        const e = one('build:road');
        actor(e);
        const free = e.data?.free === true,
          setup = e.data?.initialPlacement === true;
        insist(free || setup || e.data?.initialPlacement === false, 'road payment/free fact missing');
        if (move.includes('DevCard')) insist(free, 'development road missing free fact');
        const at = m.edgeBySource[String(e.data.edgeId)];
        insist(at, 'road edge unmapped');
        events = [{
          type: 'build',
          piece: 'road',
          at
        }];
        break;
      }
    case 'placeCity':
      {
        const e = one('build:city');
        actor(e);
        const at = m.nodeBySource[String(e.data?.nodeId)];
        insist(at, 'city node unmapped');
        events = [{
          type: 'build',
          piece: 'city',
          at
        }];
        break;
      }
    case 'rollDice':
    case 'autoRoll':
      {
        const e = one('roll');
        actor(e);
        const dice = e.data?.dice;
        insist(Array.isArray(dice) && dice.length === 2 && dice.every((n: number) => Number.isInteger(n) && n >= 1 && n <= 6) && dice[0] + dice[1] === e.data.total, 'actual dice faces missing or invalid');
        events = [{
          type: 'roll',
          dice: [dice[0], dice[1]]
        }];
        break;
      }
    case 'discardResources':
    case 'autoDiscard':
      {
        const e = one('discard');
        actor(e);
        events = [{
          type: 'discard',
          player: seat(sourceActor),
          resources: formula(e.data?.resources, 'discard outcome')
        }];
        break;
      }
    case 'moveRobber':
    case 'autoMoveRobber':
      {
        const e = one('robber:move');
        actor(e);
        const at = m.tileBySource[String(e.data?.tileId)];
        insist(at, 'robber destination unmapped');
        events = [{
          type: 'moveRobber',
          at
        }];
        for (const s of entries('robber:steal')) {
          actor(s);
          insist(typeof s.data?.victimId === 'string' && s.data?.resource, 'actual theft result missing');
          events.push({
            type: 'steal',
            from: seat(s.data.victimId),
            resource: sourceResource(s.data.resource)
          });
        }
        break;
      }
    case 'buyDevCard':
      {
        const e = one('dev:buy');
        actor(e);
        events = [{
          type: 'buyDev',
          card: sourceCardDraw(before.state, after.state, sourceActor)
        }];
        break;
      }
    case 'playDevCardStart':
      {
        const e = entries('dev:play');
        if (e.length) {
          insist(e.length === 1, 'multiple development plays');
          actor(e[0]);
          const card = cardCodes[e[0].data?.cardType];
          insist(card === 'k' || card === 'r', 'unexpected development start');
          events = [{
            type: 'play',
            card
          }];
        }
        break;
      }
    case 'confirmDevCardPlay':
    case 'autoResolveDevCard':
      {
        const e = one('dev:play');
        actor(e);
        const card = cardCodes[e.data?.cardType];
        if (card === 'm') {
          const result = one('dev:monopolyResult');
          actor(result);
          const resource = sourceResource(result.data?.resource);
          events = [{
            type: 'play',
            card: 'm',
            resource
          }];
        } else if (card === 'y') {
          const total: Partial<Counts> = {};
          for (const gain of entries('resource:gain')) {
            insist(gain.actorId === sourceActor, 'year of plenty gain actor mismatch');
            for (const [r, n] of Object.entries(formula(gain.data?.resources, 'year of plenty outcome'))) total[r as Resource] = (total[r as Resource] ?? 0) + n!;
          }
          insist(Object.keys(total).length > 0, 'unsupported-empty-plenty');
          events = [{
            type: 'play',
            card: 'y',
            resources: total
          }];
        } else throw new Error(`unsupported resolved development card ${String(card)}`);
        break;
      }
    case 'maritimeTrade':
      {
        const e = one('trade:maritime');
        actor(e);
        events = [{
          type: 'trade',
          with: '0',
          give: formula(e.data?.give, 'bank trade give'),
          take: formula(e.data?.receive, 'bank trade receive')
        }];
        break;
      }
    case 'endTurn':
    case 'autoEndTurn':
      {
        const e = one('turn:end');
        actor(e);
        events = [{
          type: 'end'
        }];
        break;
      }
    default:
      throw new Error(`unsupported SettleHex move ${String(move)}`);
  }
  const known = new Set(['build:settlement', 'build:road', 'build:city', 'roll', 'discard', 'robber:move', 'robber:steal', 'dev:buy', 'dev:play', 'dev:monopolyResult', 'trade:maritime', 'turn:end', 'phase:main', 'resource:gain', 'resource:shortage', 'award:longestRoad', 'award:largestArmy', 'game:over', 'forced:discardSelection', 'forced:moveRobber', 'forced:devCardResolution', 'forced:placeRoad', 'forced:placeSettlement', 'forced:placeRoad']);
  for (const e of added) insist(known.has(e.type), `unsupported source gameLog event ${String(e.type)}`);
  return events;
}
export interface SettleHexExport {
  record: HANRecord;
  checkpoints: {
    sourceFrame: number;
    actionCount: number;
    logicalCount: number;
    stateId: number;
  }[];
  sourceFrames: number;
}
function exportSettleHexFrames(frames: SourceFrame[]): SettleHexExport {
  insist(Array.isArray(frames) && frames.length > 0, 'source replay frames missing');
  insist(frames[0].index === 0 && Number.isSafeInteger(frames[0].state?._stateID) && frames[0].state._stateID >= 0, 'initial source frame/state ID missing or invalid');
  const initial = frames[0].state,
    final = frames[frames.length - 1].state,
    m = mapSettleHexBoard(initial);
  const rules = validateRules(initial);
  const winner = final.G.core.gameOver?.winnerId;
  insist(winner == null === (final.ctx.gameover == null), 'source core/context terminal result mismatch');
  if (winner != null) insist(final.ctx.gameover?.winnerId === winner && final.G.core.gameOver?.reason === 'victoryPoints', 'unsupported source terminal outcome');
  const record: HANRecord = {
    format: 'han-prototype',
    version: 1,
    rules,
    knowledge: 'omniscient',
    coverage: winner == null ? 'prefix' : 'complete',
    players: initial.G.core.players.map(seat),
    board: m.board,
    robber: m.tileBySource[String(initial.G.core.robberTileId)],
    result: winner == null ? null : {
      winner: seat(winner)
    },
    actions: []
  };
  insist(record.robber, 'initial robber tile unmapped');
  const checkpoints = [{
    sourceFrame: 0,
    actionCount: 0,
    logicalCount: 0,
    stateId: Number(initial._stateID)
  }];
  const expected: Partial<State>[] = [project(frames[0], m)];
  let logicalCount = 0;
  for (let i = 1; i < frames.length; i++) {
    insist(frames[i].index === i && Number.isSafeInteger(frames[i].state?._stateID) && frames[i].state._stateID === frames[i - 1].state._stateID + 1, `source frame ${i} is not contiguous`);
    const events = translate(frames[i - 1], frames[i], m);
    for (const event of events) {
      const before = frames[i - 1].state;
      const phase: State['phase'] = event.type === 'build' && before.ctx.phase === 'placement' ? 'setupRoad' : event.type === 'build' && before.G.devCardPlay?.type === 'roadBuilding' ? 'freeRoads' : 'actions';
      record.actions.push(...toHAN(event, phase));
      logicalCount++;
    }
    checkpoints.push({
      sourceFrame: i,
      actionCount: record.actions.length,
      logicalCount,
      stateId: Number(frames[i].state._stateID)
    });
    expected.push(project(frames[i], m));
  }
  const replay = replayHAN(record);
  insist(replay.length === logicalCount + 1, 'reader returned unexpected checkpoint count');
  for (let i = 0; i < checkpoints.length; i++) {
    compare(replay[checkpoints[i].logicalCount], expected[i], i);
  }
  return {
    record,
    checkpoints,
    sourceFrames: frames.length
  };
}
export function exportSettleHexNotationArchive(archive: SourceArchive, buildFrames: (archive: SourceArchive) => SourceFrame[]): SettleHexExport {
  insist(archive && archive.initialState && Array.isArray(archive.log), 'archive requires initialState and contiguous log array');
  const firstId = archive.initialState._stateID;
  insist(Number.isSafeInteger(firstId) && firstId >= 0, 'initial state ID missing or invalid');
  for (let i = 0; i < archive.log.length; i++) {
    const id = archive.log[i]?._stateID;
    insist(Number.isSafeInteger(id) && id === firstId + i, `log state ID missing, invalid or non-contiguous at action ${i}`);
    insist(archive.log[i]?.action, 'archive log action missing');
  }
  if (archive.finalState) {
    const id = archive.finalState._stateID;
    insist(Number.isSafeInteger(id) && id === firstId + archive.log.length, 'final state ID missing, invalid or different from replay log');
  }
  const frames = buildFrames(archive);
  insist(frames.length === archive.log.length + 1, 'archive contains non-action replay entries');
  insist(archive.finalState || !frames[frames.length - 1].state.G.core.gameOver, 'complete archive requires archived final state');
  if (archive.finalState) {
    const mapping = mapSettleHexBoard(archive.initialState);
    const actual = project({
      index: frames.length - 1,
      state: archive.finalState,
      logEntry: null
    }, mapping);
    const reconstructed = project(frames[frames.length - 1], mapping);
    for (const key of projectionKeys) insist(JSON.stringify(canonical(actual[key])) === JSON.stringify(canonical(reconstructed[key])), `archived final state differs from reconstructed log at ${key}`);
    insist(JSON.stringify(canonical(archive.finalState.ctx?.gameover ?? null)) === JSON.stringify(canonical(frames[frames.length - 1].state.ctx?.gameover ?? null)), 'archived final gameover differs from reconstructed log');
  }
  return exportSettleHexFrames(frames);
}
