// App presentation adapter promoted from the verified notation research prototype.
// Game rules and log consequences come exclusively from maintained game-core APIs.
import { replayHANTrace, projectHANLog } from '@settlehex/game-core';
import { formatLogEntryText } from '../shared/gameText.js';
import { maskGameLogEntries } from '../game-runtime/log/gameLogPrivacy.js';
const resources = { B: 'Brick', G: 'Wheat', L: 'Wood', O: 'Ore', W: 'Sheep' };
const cards = { k: 'knight', m: 'monopoly', r: 'roadBuilding', v: 'victoryPoint', y: 'yearOfPlenty' };
const nodeRefs = ['NORTH', 'NORTHEAST', 'SOUTHEAST', 'SOUTH', 'SOUTHWEST', 'NORTHWEST'];
const edgeRefs = ['NORTHEAST', 'EAST', 'SOUTHEAST', 'SOUTHWEST', 'WEST', 'NORTHWEST'];
const vectors = [[1, 0, -1], [1, -1, 0], [0, -1, 1], [-1, 0, 1], [-1, 1, 0], [0, 1, -1]];
const offsets = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]];
const key = (a, b) => a < b ? `${a},${b}` : `${b},${a}`;
const insist = (ok, message) => { if (!ok)
    throw new Error(message); };
const qr = (id) => {
    const m = /^([a-z]+)([1-9][0-9]*)$/.exec(id);
    if (!m)
        throw new Error('invalid drawing address');
    return [[...m[1]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 96, 0), Number(m[2])];
};
function vertexPoint(id) { const [q, r] = qr(id.slice(0, -1)); return [2 * q + r, 3 * r + (id.endsWith('n') ? -2 : 2)].join(','); }
/** Presentation adapter only. State is reconstructed solely by the HAN reader. */
export function buildNotationReplayFile(record, { playerIdBySeat = null, playerMap = {} } = {}) {
    const trace = replayHANTrace(record);
    const states = [trace.initial, ...trace.steps.map(step => step.after)];
    const projected = projectHANLog(record);
    const playerId = id => id == null || id === 'system' ? id : playerIdBySeat?.[id] ?? id;
    const players = record.players.map(playerId);
    insist(players.every(id => typeof id === 'string') && new Set(players).size === record.players.length, 'invalid presentation player mapping');
    const vertices = [...new Set(record.board.tiles.flatMap(t => t.vertices))].sort();
    const node = Object.fromEntries(vertices.map((v, i) => [v, i]));
    const edge = Object.fromEntries(Object.entries(record.board.edges).map(([id, [a, b]]) => [id, key(node[a], node[b])]));
    const center = record.board.tiles.map(t => qr(t.id)).reduce(([q, r], [a, b]) => [q + a, r + b], [0, 0]).map(x => Math.round(x / record.board.tiles.length));
    const tileIds = Object.fromEntries(record.board.tiles.map((t, i) => [t.id, i]));
    const tiles = record.board.tiles.map((t, i) => {
        const [q, r] = qr(t.id), x = q - center[0], z = r - center[1];
        insist(t.vertices.every((v, j) => vertexPoint(v) === [2 * q + r + offsets[j][0], 3 * r + offsets[j][1]].join(',')), 'board geometry differs from tile incidence');
        const pairs = t.vertices.map((v, j) => [node[v], node[t.vertices[(j + 1) % 6]]]);
        insist(pairs.every(([a, b]) => Object.values(edge).includes(key(a, b))), 'board incidence is missing a drawable edge');
        return { coordinate: [x, -x - z, z], type: 'Land', tile: { id: i, resource: t.resource === null ? 'Desert' : resources[t.resource], number: t.number, nodes: Object.fromEntries(nodeRefs.map((ref, j) => [ref, node[t.vertices[j]]])), edges: Object.fromEntries(edgeRefs.map((ref, j) => [ref, pairs[j]])) } };
    });
    const drawnEdges = new Set(tiles.flatMap(t => Object.values(t.tile.edges).map(ends => key(...ends))));
    insist(Object.values(edge).length === drawnEdges.size && Object.values(edge).every(e => drawnEdges.has(e)), 'board topology differs from drawable edge set');
    // Ports in the envelope are vertex privileges. Recover a unique coastal
    // pairing for rendering; adjacent identical ports need a matching, not greed.
    const candidates = [];
    for (const [id, [a, b]] of Object.entries(record.board.edges)) {
        const kind = record.board.ports[a];
        if (!kind || record.board.ports[b] !== kind)
            continue;
        const incident = tiles.flatMap(t => Object.entries(t.tile.edges).filter(([, ends]) => key(...ends) === edge[id]).map(([direction]) => ({ t, direction })));
        if (incident.length === 1)
            candidates.push({ a, b, kind, ...incident[0] });
    }
    const solutions = [];
    function match(remaining, chosen) {
        if (solutions.length > 1)
            return;
        if (!remaining.size) {
            solutions.push(chosen);
            return;
        }
        const options = [...remaining].map(v => candidates.filter(c => (c.a === v || c.b === v) && remaining.has(c.a) && remaining.has(c.b))).sort((a, b) => a.length - b.length)[0];
        for (const c of options) {
            const next = new Set(remaining);
            next.delete(c.a);
            next.delete(c.b);
            match(next, [...chosen, c]);
        }
    }
    match(new Set(Object.keys(record.board.ports)), []);
    insist(solutions.length === 1, 'unpaired or ambiguous port geometry');
    for (const { a, b, kind, t, direction } of solutions[0]) {
        const vector = vectors[edgeRefs.indexOf(direction)];
        tiles.push({ coordinate: t.coordinate.map((n, i) => n + vector[i]), type: 'Port', tile: { id: tiles.length, resource: kind === 'any' ? 'Any' : resources[kind], nodes: [node[a], node[b]], edges: {}, direction } });
    }
    const topology = { tiles, nodeIds: Object.values(node), landNodeIds: Object.values(node), edgeIds: Object.values(edge), edgeNodes: {}, nodeEdges: {}, nodeNeighbors: {}, portsByNodeId: {} };
    for (const [id, [a, b]] of Object.entries(record.board.edges)) {
        const ends = [node[a], node[b]], e = edge[id];
        topology.edgeNodes[e] = ends;
        for (const [v, n] of [ends, [...ends].reverse()]) {
            (topology.nodeEdges[v] ??= []).push(e);
            (topology.nodeNeighbors[v] ??= []).push(n);
        }
    }
    for (const [v, r] of Object.entries(record.board.ports))
        topology.portsByNodeId[node[v]] = r === 'any' ? 'Any' : resources[r];
    const duel = record.rules === 'duel-friendly-omniscient-prototype-1';
    const ruleset = { victoryPointsToWin: duel ? 15 : 10, discardLimit: duel ? 9 : 7, friendlyRobber: { enabled: record.rules !== 'base-omniscient-prototype-1', vpThreshold: 2 }, allowPlayerTrades: !duel, diceMode: 'random', bank: { finite: true, resourceCounts: Object.fromEntries(Object.values(resources).map(r => [r, 19])) }, tradeRates: { bank: 4, genericPort: 3, specificPort: 2 }, devCardsEnabled: true, devCardCounts: { knight: 14, victoryPoint: 5, roadBuilding: 2, monopoly: 2, yearOfPlenty: 2 }, longestRoadMinLength: 5, largestArmyMinKnights: 3, pieceLimits: { roads: 15, settlements: 5, cities: 4 }, buildCosts: { road: { Wood: 1, Brick: 1 }, settlement: { Wood: 1, Brick: 1, Sheep: 1, Wheat: 1 }, city: { Wheat: 2, Ore: 3 }, devCard: { Sheep: 1, Wheat: 1, Ore: 1 } } };
    const rowsByAction = new Map();
    for (const row of projected) {
        const data = { ...row.data };
        for (const field of ['resources', 'give', 'receive'])
            if (data[field])
                data[field] = Object.fromEntries(Object.entries(data[field]).map(([r, n]) => [resources[r], n]));
        for (const field of ['resource', 'tileResource'])
            if (data[field])
                data[field] = resources[data[field]];
        if ('nodeId' in data)
            data.nodeId = node[data.nodeId];
        if ('edgeId' in data)
            data.edgeId = edge[data.edgeId];
        if ('tileId' in data)
            data.tileId = tileIds[data.tileId];
        for (const field of ['victimId', 'with', 'previousOwnerId', 'winnerId'])
            if (data[field] != null) data[field] = playerId(data[field]);
        for (const field of ['entitledByPlayerId', 'allocatedByPlayerId'])
            if (data[field]) data[field] = Object.fromEntries(Object.entries(data[field]).map(([p, n]) => [playerId(p), n]));
        const rows = rowsByAction.get(row.actionIndex) ?? [];
        rows.push({ ...row, ...(row.actorId == null ? {} : { actorId: playerId(row.actorId) }), data });
        rowsByAction.set(row.actionIndex, rows);
    }
    let history = [];
    let turn = 0, dice = [1, 1];
    let lastRoll = null;
    const expand = (amount) => Object.entries(amount).flatMap(([r, n]) => Array(n).fill(resources[r]));
    const frames = states.map((s, index) => {
        let label = 'Initial position';
        const event = trace.steps[index - 1]?.event;
        if (event?.type === 'end') {
            turn++;
            lastRoll = null;
        }
        if (event?.type === 'roll') {
            dice = [...event.dice];
            lastRoll = dice[0] + dice[1];
        }
        const added = rowsByAction.get(index - 1) ?? [];
        if (added.length) {
            // One logical action is one seekable position. Independent consequences
            // belong to that position; do not fabricate intermediate game states.
            history = [...history, ...added.map(row => ({ ...row, turn }))];
            label = formatLogEntryText(maskGameLogEntries([added[0]], null)[0], playerMap) || (event?.type === 'end' ? 'End of turn' : 'Game updated');
        }
        const setup = s.phase === 'setupSettlement' || s.phase === 'setupRoad';
        if (!setup && turn === 0)
            turn = 1;
        const gameOver = s.winner ? { winnerId: playerId(s.winner), reason: 'victoryPoints' } : null;
        const core = { phase: setup ? 'placement' : 'normal', players: [...players], ruleset,
            buildingsByNodeId: Object.fromEntries(Object.entries(s.buildings).map(([v, b]) => [node[v], { ownerId: playerId(b.owner), type: b.kind }])),
            roadsByEdgeId: Object.fromEntries(Object.entries(s.roads).map(([e, p]) => [edge[e], playerId(p)])),
            pendingRoadFromNodeIdByPlayer: Object.fromEntries(record.players.map(p => [playerId(p), p === s.current && s.setupAnchor ? node[s.setupAnchor] : null])),
            caches: { buildableNodeIdsByPlayer: {}, buildableEdgeIdsByPlayer: {} },
            playerStateById: Object.fromEntries(record.players.map(p => [playerId(p), { resources: expand(s.hands[p]), victoryPoints: s.points[p], devCards: [...s.dev[p].old, ...s.dev[p].fresh].map(c => cards[c]), devCardsBoughtThisTurn: s.dev[p].fresh.map(c => cards[c]), devCardsPlayedThisTurn: p === s.current && s.played ? 1 : 0, knightsPlayed: s.knights[p], roadsRemaining: 15 - Object.values(s.roads).filter(x => x === p).length, settlementsRemaining: 5 - Object.values(s.buildings).filter(x => x.owner === p && x.kind === 'settlement').length, citiesRemaining: 4 - Object.values(s.buildings).filter(x => x.owner === p && x.kind === 'city').length }])),
            bank: { resources: expand(s.bank) }, devDeck: Array(Object.values(s.deck).reduce((a, b) => a + b, 0)).fill('hidden'), robberTileId: tileIds[s.robber],
            awards: { longestRoadOwnerId: playerId(s.awards.road), largestArmyOwnerId: playerId(s.awards.army) }, gameOver,
            turn: { currentPlayerId: playerId(s.current), phase: s.phase === 'discard' ? 'robberDiscard' : s.phase === 'robber' ? 'robberMove' : s.phase === 'steal' ? 'robberSteal' : s.phase === 'preRoll' ? 'preRoll' : 'postRoll', hasRolled: lastRoll !== null, lastRollTotal: lastRoll, pendingDiscards: s.pendingDiscards.map(playerId) },
        };
        return { index, annotation: { label, notes: [] }, state: { _stateID: index, G: { core, coreTopology: topology, tiles, diceRoll: [...dice], robberTileId: tileIds[s.robber], valids: { nodes: [], edges: [], tiles: [] }, gameLog: history, gameLogSeq: history.length, devCardPlay: null, gameSettings: {}, placementOrder: [...players, ...[...players].reverse()] }, ctx: { currentPlayer: playerId(s.current), turn, phase: setup ? 'placement' : 'main', numPlayers: record.players.length, activePlayers: null, ...(gameOver ? { gameover: gameOver } : {}) } } };
    });
    return { format: 'settlehex-replay-file', schemaVersion: 1, replay: { match: { replayId: 'notation-replay', winnerSeatId: playerId(record.result?.winner) ?? null }, participants: record.players.map(seat => ({ seatId: playerId(seat), usernameSnapshot: playerMap[playerId(seat)]?.name ?? `Player ${seat}`, result: record.result ? (record.result.winner === seat ? 'win' : 'loss') : null })), isComplete: record.coverage === 'complete', initialPerspectivePlayerID: players[0], metadata: { warnings: [], source: 'CGN reconstructed replay', notationFormat: record.format } }, frames };
}
