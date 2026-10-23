import type { HANRecord, Board, Card, Counts, Event, Formula, Piece, Resource, State } from './types';
// HAN replay is independent of the SettleHex source-frame exporter.
const resources: Resource[] = ['B', 'G', 'L', 'O', 'W'];
const cards: Card[] = ['k', 'm', 'r', 'v', 'y'];
const costs: Record<Piece | 'development', Formula> = {
  road: {
    B: 1,
    L: 1
  },
  settlement: {
    B: 1,
    G: 1,
    L: 1,
    W: 1
  },
  city: {
    G: 2,
    O: 3
  },
  development: {
    G: 1,
    O: 1,
    W: 1
  }
};
const tilePattern = /^[a-z]+[1-9][0-9]*$/;
const vertexPattern = /^[a-z]+[1-9][0-9]*[ns]$/;
const edgePattern = /^[a-z]+[1-9][0-9]*(ne|nw|w)$/;
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
function requireThat(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
const empty = (): Counts => ({
  B: 0,
  G: 0,
  L: 0,
  O: 0,
  W: 0
});
const total = (c: Formula) => resources.reduce((n, r) => n + (c[r] ?? 0), 0);
const clone = <T,>(v: T): T => structuredClone(v);
function validate(record: HANRecord): void {
  requireThat(record && typeof record === 'object', 'record must be an object');
  requireThat(record.format === 'han-prototype', 'unsupported format');
  requireThat(record.version === 1, 'unsupported version');
  requireThat(['base-omniscient-prototype-1', 'base-friendly-omniscient-prototype-1', 'duel-friendly-omniscient-prototype-1'].includes(record.rules), 'unsupported rules');
  requireThat(record.knowledge === 'omniscient', 'knowledge must be omniscient');
  requireThat(record.coverage === 'prefix' || record.coverage === 'complete', 'unsupported coverage');
  requireThat(Array.isArray(record.players) && (record.rules === 'duel-friendly-omniscient-prototype-1' ? record.players.length === 2 : record.players.length === 3 || record.players.length === 4) && record.players.every((p, i) => p === String(i + 1)), 'players must be ordered 1,2,3[,4] without duplicates');
  requireThat(Array.isArray(record.actions) && record.actions.every(a => typeof a === 'string'), 'actions must be HAN strings');
  requireThat(record.coverage === 'prefix' ? record.result === null : !!record.result && Object.keys(record.result).length === 1 && record.players.includes(record.result.winner), 'prefix result must be null; complete result must name one player');
  const b = record.board;
  requireThat(b && Array.isArray(b.tiles) && b.tiles.length > 0 && b.edges && typeof b.edges === 'object' && !Array.isArray(b.edges) && b.ports && typeof b.ports === 'object' && !Array.isArray(b.ports), 'invalid board');
  const ids = new Set<string>(),
    vertices = new Set<string>();
  let deserts = 0;
  for (const tile of b.tiles) {
    requireThat(tile && typeof tile.id === 'string' && tilePattern.test(tile.id) && !ids.has(tile.id), 'invalid or duplicate tile ID');
    ids.add(tile.id);
    if (tile.resource === null) {
      requireThat(tile.number === null, 'desert must have null number');
      deserts++;
    } else requireThat(resources.includes(tile.resource) && Number.isInteger(tile.number) && tile.number !== null && tile.number >= 2 && tile.number <= 12 && tile.number !== 7, 'invalid resource or dice number');
    requireThat(Array.isArray(tile.vertices) && tile.vertices.length === 6 && new Set(tile.vertices).size === 6 && tile.vertices.every(v => typeof v === 'string' && vertexPattern.test(v)), 'tile must contain six distinct valid vertices');
    tile.vertices.forEach(v => vertices.add(v));
  }
  requireThat(deserts === 1, 'board must contain exactly one desert');
  requireThat(b.tiles.some(t => t.resource === null && t.id === record.robber), 'initial robber must name desert');
  const edgePairs = new Set<string>();
  for (const [id, ends] of Object.entries(b.edges)) {
    requireThat(edgePattern.test(id) && Array.isArray(ends) && ends.length === 2 && ends.every(v => typeof v === 'string' && vertexPattern.test(v)) && ends[0] !== ends[1], 'invalid edge graph');
    requireThat(ends.every(v => vertices.has(v)), 'edge endpoints must occur among listed tile vertices');
    const key = [...ends].sort().join(':');
    requireThat(!edgePairs.has(key), 'duplicate edge endpoints');
    edgePairs.add(key);
  }
  for (const [v, port] of Object.entries(b.ports)) requireThat(vertices.has(v) && (port === 'any' || resources.includes(port)), 'invalid port');
}
function initialState(record: HANRecord): State {
  return {
    current: record.players[0],
    phase: 'setupSettlement',
    setupIndex: 0,
    setupAnchor: null,
    returnPhase: 'preRoll',
    freeRoadsRemaining: 0,
    hands: Object.fromEntries(record.players.map(p => [p, empty()])),
    bank: {
      B: 19,
      G: 19,
      L: 19,
      O: 19,
      W: 19
    },
    dev: Object.fromEntries(record.players.map(p => [p, {
      old: [],
      fresh: []
    }])),
    deck: {
      k: 14,
      m: 2,
      r: 2,
      v: 5,
      y: 2
    },
    played: false,
    knights: Object.fromEntries(record.players.map(p => [p, 0])),
    buildings: {},
    roads: {},
    robber: record.robber,
    pendingDiscards: [],
    awards: {
      road: null,
      army: null
    },
    points: Object.fromEntries(record.players.map(p => [p, 0])),
    winner: null
  };
}
function formula(text: string, plenty = false): Formula {
  if (text.length === 0) throw new Error(plenty ? 'unsupported-empty-plenty' : 'resource formula cannot be empty');
  const counts: Formula = {};
  let at = 0;
  while (at < text.length) {
    const match = /^([BGLOW])([1-9][0-9]*)?/.exec(text.slice(at));
    requireThat(match, 'malformed resource formula');
    const r = match[1] as Resource,
      n = match[2] === undefined ? 1 : Number(match[2]);
    requireThat(!own(counts, r), 'duplicate resource term');
    requireThat(Number.isSafeInteger(n) && n > 0, 'resource quantity must be a positive safe integer');
    counts[r] = n;
    at += match[0].length;
  }
  requireThat(Number.isSafeInteger(total(counts)), 'resource formula total is unsafe');
  return counts;
}
function parse(token: string): Event {
  let m: RegExpExecArray | null;
  if (token === 'E') return {
    type: 'end'
  };
  if (m = /^R\(([1-6])\+([1-6])\)$/.exec(token)) return {
    type: 'roll',
    dice: [Number(m[1]), Number(m[2])]
  };
  if (m = /^P([RVC])(.+)$/.exec(token)) return {
    type: 'build',
    piece: ({
      R: 'road',
      V: 'settlement',
      C: 'city'
    } as const)[m[1]],
    at: m[2]
  };
  if (m = /^BD([kmrvy])$/.exec(token)) return {
    type: 'buyDev',
    card: m[1] as Card
  };
  if (token === 'UDk' || token === 'UDr') return {
    type: 'play',
    card: token[2] as 'k' | 'r'
  };
  if (m = /^UDm([BGLOW])$/.exec(token)) return {
    type: 'play',
    card: 'm',
    resource: m[1] as Resource
  };
  if (m = /^UDy\(([^()]*)\)$/.exec(token)) return {
    type: 'play',
    card: 'y',
    resources: formula(m[1], true)
  };
  if (m = /^([1-4])A\(([^()]*)\)$/.exec(token)) return {
    type: 'discard',
    player: m[1],
    resources: formula(m[2])
  };
  if (m = /^M([a-z]+[1-9][0-9]*)$/.exec(token)) return {
    type: 'moveRobber',
    at: m[1]
  };
  if (m = /^S([BGLOW])([1-4])$/.exec(token)) return {
    type: 'steal',
    from: m[2],
    resource: m[1] as Resource
  };
  if (m = /^T\(([^()]*)\)\(([^()]*)\)([0-4])$/.exec(token)) return {
    type: 'trade',
    with: m[3],
    give: formula(m[1]),
    take: formula(m[2])
  };
  throw new Error(`unknown or unsupported HAN action: ${token}`);
}
/** Checks the envelope, board and token grammar without applying game state. */
export function validateHANSyntax(record: HANRecord): void {
  validate(record);
  const vertices = new Set(record.board.tiles.flatMap(tile => tile.vertices));
  const tiles = new Set(record.board.tiles.map(tile => tile.id));
  const checkReference = (event: Event): void => {
    if (event.type === 'build') requireThat(event.piece === 'road' ? own(record.board.edges, event.at) : vertices.has(event.at), 'HAN build target is not on the board');
    if (event.type === 'moveRobber') requireThat(tiles.has(event.at), 'HAN robber target is not on the board');
    if (event.type === 'discard') requireThat(record.players.includes(event.player), 'HAN discard player is unknown');
    if (event.type === 'steal') requireThat(record.players.includes(event.from), 'HAN steal player is unknown');
    if (event.type === 'trade' && event.with !== '0') requireThat(record.players.includes(event.with), 'HAN trade player is unknown');
  };
  for (let i = 0; i < record.actions.length; i++) {
    const token = record.actions[i];
    if (/^B[RVC]$/.test(token)) {
      const next = record.actions[++i];
      requireThat(next !== undefined, 'dangling buy without placement pair');
      requireThat(next.startsWith(`P${token[1]}`), 'paid buy must have adjacent matching placement');
      checkReference(parse(next));
    } else checkReference(parse(token));
  }
}
function transfer(from: Counts, to: Counts, amount: Formula, label: string): void {
  for (const r of resources) requireThat(from[r] >= (amount[r] ?? 0), `${label}: insufficient ${r} in hand/bank`);
  for (const r of resources) {
    const n = amount[r] ?? 0;
    from[r] -= n;
    to[r] += n;
  }
}
const pieceCount = (s: State, player: string, piece: Piece) => piece === 'road' ? Object.values(s.roads).filter(p => p === player).length : Object.values(s.buildings).filter(b => b.owner === player && b.kind === piece).length;
function connected(s: State, b: Board, vertex: string): boolean {
  const building = s.buildings[vertex];
  if (building) return building.owner === s.current;
  return Object.entries(b.edges).some(([id, ends]) => s.roads[id] === s.current && ends.includes(vertex));
}
function roadAllowed(s: State, b: Board, edge: string, setup = false): boolean {
  if (!own(b.edges, edge) || own(s.roads, edge) || pieceCount(s, s.current, 'road') >= 15) return false;
  return setup ? b.edges[edge].includes(s.setupAnchor!) : b.edges[edge].some(v => connected(s, b, v));
}
function finishFreeRoads(s: State, b: Board): void {
  if (s.freeRoadsRemaining === 0 || !Object.keys(b.edges).some(e => roadAllowed(s, b, e))) {
    s.freeRoadsRemaining = 0;
    s.phase = s.returnPhase;
  }
}
function longest(s: State, b: Board, player: string): number {
  const incident = new Map<string, {
    edge: string;
    other: string;
  }[]>();
  for (const [edge, owner] of Object.entries(s.roads)) if (owner === player) {
    const ends = b.edges[edge];
    requireThat(ends, `injected road has unknown edge ${edge}`);
    for (let i = 0; i < 2; i++) {
      const entries = incident.get(ends[i]) ?? [];
      entries.push({
        edge,
        other: ends[1 - i]
      });
      incident.set(ends[i], entries);
    }
  }
  const used = new Set<string>();
  function walk(v: string): number {
    if (used.size > 0 && s.buildings[v] && s.buildings[v].owner !== player) return 0;
    let best = 0;
    for (const {
      edge,
      other
    } of incident.get(v) ?? []) if (!used.has(edge)) {
      used.add(edge);
      best = Math.max(best, 1 + walk(other));
      used.delete(edge);
    }
    return best;
  }
  return Math.max(0, ...[...incident.keys()].map(v => walk(v)));
}
function award(scores: Record<string, number>, minimum: number, incumbent: string | null): string | null {
  const maximum = Math.max(...Object.values(scores));
  if (maximum < minimum) return null;
  const tied = Object.keys(scores).filter(p => scores[p] === maximum);
  return tied.length === 1 ? tied[0] : incumbent !== null && tied.includes(incumbent) ? incumbent : null;
}
function derive(s: State, record: HANRecord): void {
  s.awards.army = award(s.knights, 3, s.awards.army);
  s.awards.road = award(Object.fromEntries(record.players.map(p => [p, longest(s, record.board, p)])), 5, s.awards.road);
  for (const p of record.players) s.points[p] = Object.values(s.buildings).filter(b => b.owner === p).reduce((n, b) => n + (b.kind === 'city' ? 2 : 1), 0) + [...s.dev[p].old, ...s.dev[p].fresh].filter(c => c === 'v').length + (s.awards.army === p ? 2 : 0) + (s.awards.road === p ? 2 : 0);
  if (s.points[s.current] >= (record.rules === 'duel-friendly-omniscient-prototype-1' ? 15 : 10)) {
    s.winner = s.current;
    s.phase = 'finished';
  }
}
function eligibleVictims(s: State, b: Board): string[] {
  const tile = b.tiles.find(t => t.id === s.robber)!;
  return Object.keys(s.hands).filter(p => p !== s.current && total(s.hands[p]) > 0 && tile.vertices.some(v => s.buildings[v]?.owner === p));
}
function build(s: State, record: HANRecord, piece: Piece, at: string, paid: boolean): void {
  const b = record.board,
    setup = s.phase === 'setupSettlement' || s.phase === 'setupRoad',
    free = s.phase === 'freeRoads';
  if (setup) requireThat(!paid && (s.phase === 'setupSettlement' && piece === 'settlement' || s.phase === 'setupRoad' && piece === 'road'), 'wrong setup phase placement');else if (free) requireThat(!paid && piece === 'road', 'pending free-road phase requires bare road placement');else requireThat(s.phase === 'actions' && paid, 'bare placement requires setup/free phase; ordinary build requires paid purchase pair in actions phase');
  if (piece === 'road') {
    requireThat(own(b.edges, at), 'unknown road edge location');
    requireThat(!own(s.roads, at), 'road edge is occupied');
    requireThat(pieceCount(s, s.current, 'road') < 15, 'road piece inventory exhausted');
    if (setup) requireThat(b.edges[at].includes(s.setupAnchor!), 'setup road must touch settlement anchor');else requireThat(roadAllowed(s, b, at), 'road must connect to unblocked own network');
  } else {
    requireThat(vertexPattern.test(at) && (b.tiles.some(t => t.vertices.includes(at)) || Object.values(b.edges).some(e => e.includes(at))), 'unknown building vertex location');
    requireThat(pieceCount(s, s.current, piece) < (piece === 'city' ? 4 : 5), `${piece} piece inventory exhausted`);
    if (piece === 'city') requireThat(s.buildings[at]?.owner === s.current && s.buildings[at].kind === 'settlement', 'city must upgrade own settlement');else {
      requireThat(!own(s.buildings, at), 'building vertex occupied');
      requireThat(!Object.values(b.edges).some(e => e.includes(at) && e.some(v => v !== at && own(s.buildings, v))), 'settlement distance rule: adjacent building');
      if (!setup) requireThat(Object.entries(b.edges).some(([id, e]) => s.roads[id] === s.current && e.includes(at)), 'settlement must connect to own road');
    }
  }
  if (paid) transfer(s.hands[s.current], s.bank, costs[piece], 'build payment');
  if (piece === 'road') s.roads[at] = s.current;else s.buildings[at] = {
    owner: s.current,
    kind: piece
  };
  if (setup && piece === 'settlement') {
    if (s.setupIndex >= record.players.length) for (const t of b.tiles) if (t.resource !== null && t.vertices.includes(at)) transfer(s.bank, s.hands[s.current], {
      [t.resource]: 1
    }, 'second setup settlement income');
    s.setupAnchor = at;
    s.phase = 'setupRoad';
  } else if (setup) {
    s.setupIndex++;
    s.setupAnchor = null;
    const order = [...record.players, ...[...record.players].reverse()];
    if (s.setupIndex === order.length) {
      s.current = record.players[0];
      s.phase = 'preRoll';
    } else {
      s.current = order[s.setupIndex];
      s.phase = 'setupSettlement';
    }
  } else if (free) {
    s.freeRoadsRemaining--;
    finishFreeRoads(s, b);
  }
}
function apply(s: State, record: HANRecord, event: Event, paid = false): void {
  const b = record.board,
    hand = s.hands[s.current];
  requireThat(s.winner === null && s.phase !== 'finished', 'no actions after victory/finished');
  switch (event.type) {
    case 'build':
      build(s, record, event.piece, event.at, paid);
      break;
    case 'roll':
      {
        requireThat(s.phase === 'preRoll', 'roll requires preRoll phase');
        const n = event.dice[0] + event.dice[1];
        if (n === 7) {
          s.returnPhase = 'actions';
          s.pendingDiscards = record.players.filter(p => total(s.hands[p]) > (record.rules === 'duel-friendly-omniscient-prototype-1' ? 9 : 7));
          s.phase = s.pendingDiscards.length ? 'discard' : 'robber';
          break;
        }
        const claims = Object.fromEntries(record.players.map(p => [p, empty()]));
        for (const tile of b.tiles) if (tile.id !== s.robber && tile.resource !== null && tile.number === n) for (const v of tile.vertices) {
          const building = s.buildings[v];
          if (building) claims[building.owner][tile.resource] += building.kind === 'city' ? 2 : 1;
        }
        for (const r of resources) {
          const recipients = record.players.filter(p => claims[p][r] > 0),
            demand = recipients.reduce((n, p) => n + claims[p][r], 0);
          if (demand <= s.bank[r]) for (const p of recipients) transfer(s.bank, s.hands[p], {
            [r]: claims[p][r]
          }, 'roll income');else if (recipients.length === 1) transfer(s.bank, s.hands[recipients[0]], {
            [r]: s.bank[r]
          }, 'single claimant partial income');
        }
        s.phase = 'actions';
        break;
      }
    case 'discard':
      {
        requireThat(s.phase === 'discard' && s.pendingDiscards.includes(event.player), 'discard requires pending player in discard phase');
        requireThat(total(event.resources) === Math.floor(total(s.hands[event.player]) / 2), 'discard must remove exact half hand');
        transfer(s.hands[event.player], s.bank, event.resources, 'discard');
        s.pendingDiscards = s.pendingDiscards.filter(p => p !== event.player);
        if (!s.pendingDiscards.length) s.phase = 'robber';
        break;
      }
    case 'moveRobber':
      requireThat(s.phase === 'robber', 'robber movement requires robber phase');
      requireThat(event.at !== s.robber, 'robber must change tile');
      requireThat(b.tiles.some(t => t.id === event.at), 'unknown robber tile');
      if (record.rules !== 'base-omniscient-prototype-1') for (const vertex of b.tiles.find(t => t.id === event.at)!.vertices) {
        const owner = s.buildings[vertex]?.owner;
        if (owner) {
          const publicPoints = Object.values(s.buildings).filter(x => x.owner === owner).reduce((n, x) => n + (x.kind === 'city' ? 2 : 1), 0) + (s.awards.army === owner ? 2 : 0) + (s.awards.road === owner ? 2 : 0);
          requireThat(publicPoints > 2, 'friendly robber protects public score two or less');
        }
      }
      s.robber = event.at;
      s.phase = eligibleVictims(s, b).length ? 'steal' : s.returnPhase;
      break;
    case 'steal':
      requireThat(s.phase === 'steal', 'steal requires steal phase');
      requireThat(eligibleVictims(s, b).includes(event.from), 'ineligible theft victim');
      transfer(s.hands[event.from], hand, {
        [event.resource]: 1
      }, 'stolen resource');
      s.phase = s.returnPhase;
      break;
    case 'buyDev':
      requireThat(s.phase === 'actions', 'development purchase requires actions phase');
      requireThat(cards.includes(event.card) && s.deck[event.card] > 0, 'development deck card exhausted');
      transfer(hand, s.bank, costs.development, 'development payment');
      s.deck[event.card]--;
      s.dev[s.current].fresh.push(event.card);
      break;
    case 'play':
      {
        requireThat(s.phase === 'preRoll' || s.phase === 'actions', 'development play requires preRoll/actions phase');
        requireThat(!s.played, 'only one development card may be played per turn');
        const old = s.dev[s.current].old,
          index = old.indexOf(event.card);
        requireThat(index >= 0, 'development card must be mature/old and available');
        if (event.card === 'y') {
          const wanted = total(event.resources);
          requireThat(wanted === Math.min(2, total(s.bank)), 'Year of Plenty requires two available cards or all remaining bank cards');
          for (const r of resources) requireThat((event.resources[r] ?? 0) <= s.bank[r], 'Year of Plenty resource unavailable in bank');
        }
        old.splice(index, 1);
        s.played = true;
        if (event.card === 'k') {
          s.knights[s.current]++;
          s.returnPhase = s.phase;
          s.phase = 'robber';
        } else if (event.card === 'r') {
          s.returnPhase = s.phase;
          s.phase = 'freeRoads';
          s.freeRoadsRemaining = Math.min(2, 15 - pieceCount(s, s.current, 'road'));
          finishFreeRoads(s, b);
        } else if (event.card === 'm') {
          for (const p of record.players) if (p !== s.current) transfer(s.hands[p], hand, {
            [event.resource]: s.hands[p][event.resource]
          }, 'monopoly');
        } else if (event.card === 'y') transfer(s.bank, hand, event.resources, 'Year of Plenty');
        break;
      }
    case 'trade':
      {
        requireThat(s.phase === 'actions', 'trade requires actions phase with no pending obligations');
        requireThat(resources.every(r => !(event.give[r] && event.take[r])), 'trade resource types must be disjoint');
        if (event.with === '0') {
          const give = resources.filter(r => event.give[r]),
            take = resources.filter(r => event.take[r]);
          if (record.rules === 'base-omniscient-prototype-1') requireThat(give.length === 1 && take.length === 1, 'bank trade requires one resource type each');
          let credits = 0;
          for (const resource of give) {
            let ratio = 4;
            for (const [v, port] of Object.entries(b.ports)) if (s.buildings[v]?.owner === s.current) {
              if (port === resource) ratio = 2;else if (port === 'any') ratio = Math.min(ratio, 3);
            }
            requireThat(event.give[resource]! % ratio === 0, 'bank trade ratio requires complete sets');
            credits += event.give[resource]! / ratio;
          }
          requireThat(credits === total(event.take), 'bank trade ratio is invalid');
          // Validate both baskets before the atomic exchange.
          requireThat(resources.every(r => hand[r] >= (event.give[r] ?? 0) && s.bank[r] >= (event.take[r] ?? 0)), 'bank trade hand/bank supply insufficient');
          transfer(hand, s.bank, event.give, 'bank trade');
          transfer(s.bank, hand, event.take, 'bank trade');
        } else {
          requireThat(record.rules !== 'duel-friendly-omniscient-prototype-1', 'player trades disabled in duel profile');
          requireThat(event.with !== s.current && record.players.includes(event.with), 'trade needs a distinct opponent');
          requireThat(resources.every(r => hand[r] >= (event.give[r] ?? 0) && s.hands[event.with][r] >= (event.take[r] ?? 0)), 'domestic trade hand supply insufficient');
          transfer(hand, s.hands[event.with], event.give, 'domestic trade');
          transfer(s.hands[event.with], hand, event.take, 'domestic trade');
        }
        break;
      }
    case 'end':
      requireThat(s.phase === 'actions', 'end requires actions phase after roll, without pending obligations');
      s.dev[s.current].old.push(...s.dev[s.current].fresh);
      s.dev[s.current].fresh = [];
      s.current = record.players[(record.players.indexOf(s.current) + 1) % record.players.length];
      s.played = false;
      s.returnPhase = 'preRoll';
      s.phase = 'preRoll';
      break;
  }
  derive(s, record);
}
export interface HANReplayStep {
  /** Zero-based logical action; token range is zero-based, end-exclusive. */
  actionIndex: number;
  tokenStart: number;
  tokenEnd: number;
  event: Event;
  paid: boolean;
  before: State;
  after: State;
}
export interface HANReplayTrace { initial: State; steps: HANReplayStep[] }

/** Validated logical actions and their independent replay checkpoints. */
export function replayHANTrace(record: HANRecord): HANReplayTrace {
  validate(record);
  const s = initialState(record);
  const initial = clone(s);
  const steps: HANReplayStep[] = [];
  let before = initial;
  for (let i = 0; i < record.actions.length; i++) {
    const tokenStart = i;
    const token = record.actions[i];
    let event: Event,
      paid = false;
    try {
      if (/^B[RVC]$/.test(token)) {
        const next = record.actions[++i];
        requireThat(next !== undefined, 'dangling buy without placement pair');
        requireThat(next.startsWith(`P${token[1]}`), 'paid buy must have adjacent matching placement');
        event = parse(next);
        requireThat(event.type === 'build', 'purchase requires placement pair');
        paid = true;
      } else event = parse(token);
      apply(s, record, event, paid);
      const after = clone(s);
      steps.push({ actionIndex: steps.length, tokenStart, tokenEnd: i + 1, event, paid, before, after });
      before = after;
    } catch (error) {
      throw new Error(`HAN action ${i + 1} (${token}): ${(error as Error).message}`);
    }
  }
  if (record.coverage === 'complete') requireThat(s.winner !== null && s.winner === record.result!.winner, 'complete result does not match derived victory/winner');
  return { initial, steps };
}
/** Initial state plus one independent checkpoint per logical action (paid pairs collapse). */
export function replayHAN(record: HANRecord): State[] {
  const trace = replayHANTrace(record);
  return [trace.initial, ...trace.steps.map(step => step.after)];
}
