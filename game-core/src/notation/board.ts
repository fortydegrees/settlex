import type { Board, Resource } from './types';
type SourceTile = {
  coordinate: [number, number, number];
  type: string;
  tile: {
    id: number;
    resource?: string | null;
    number?: number | null;
    nodes?: Record<string, number>;
    edges?: Record<string, [number, number]>;
  };
};
type SourceState = {
  G: {
    tiles: SourceTile[];
    coreTopology: {
      edgeNodes: Record<string, [number, number]>;
      portsByNodeId: Record<string, string>;
    };
  };
};
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
function isSourceState(value: unknown): value is SourceState {
  if (!isRecord(value) || !isRecord(value.G)) return false;
  const {
    tiles,
    coreTopology
  } = value.G;
  if (!Array.isArray(tiles) || !isRecord(coreTopology) || !isRecord(coreTopology.edgeNodes) || !isRecord(coreTopology.portsByNodeId)) return false;
  if (!tiles.every(item => isRecord(item) && Array.isArray(item.coordinate) && item.coordinate.length === 3 && item.coordinate.every(Number.isSafeInteger) && typeof item.type === 'string' && isRecord(item.tile) && Number.isSafeInteger(item.tile.id))) return false;
  if (!Object.values(coreTopology.edgeNodes).every(ends => Array.isArray(ends) && ends.length === 2 && ends.every(Number.isSafeInteger))) return false;
  return Object.values(coreTopology.portsByNodeId).every(port => typeof port === 'string');
}
const resourceCodes: Record<string, Resource> = {
  Brick: 'B',
  Wheat: 'G',
  Wood: 'L',
  Ore: 'O',
  Sheep: 'W'
};
export function sourceResource(value: unknown): Resource {
  if (typeof value !== 'string' || !resourceCodes[value]) throw new Error(`unsupported source resource ${String(value)}`);
  return resourceCodes[value];
}
const column = (q: number): string => {
  if (!Number.isInteger(q) || q < 1) throw new Error(`invalid tile column ${q}`);
  let out = '';
  for (let n = q; n > 0; n = Math.floor((n - 1) / 26)) out = String.fromCharCode(97 + (n - 1) % 26) + out;
  return out;
};
const tileName = (q: number, r: number) => `${column(q)}${r}`;
const point = (x: number, y: number) => `${x},${y}`;
const pair = (a: string, b: string) => [a, b].sort().join('|');
const vertexOffsets: [number, number][] = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]];
const edgeIndexes = {
  ne: [0, 1],
  nw: [5, 0],
  w: [4, 5]
} as const;
export interface BoardMapping {
  board: Board;
  tileBySource: Record<string, string>;
  nodeBySource: Record<string, string>;
  edgeBySource: Record<string, string>;
}
export function mapSettleHexBoard(state: unknown): BoardMapping {
  if (!isSourceState(state)) throw new Error('source board/topology missing or malformed');
  const tiles = state.G.tiles;
  const topology = state.G.coreTopology;
  const land = tiles.filter(t => t?.type === 'Land');
  if (land.length !== 19) throw new Error(`unsupported source board: expected 19 land tiles, got ${land.length}`);
  const coords = land.map(t => t.coordinate);
  if (coords.some(c => !Array.isArray(c) || c.length !== 3 || c.some(n => !Number.isInteger(n)) || c.reduce((a, b) => a + b, 0) !== 0)) throw new Error('invalid source cube coordinates');
  const minQ = Math.min(...coords.map(c => c[0]));
  const minR = Math.min(...coords.map(c => c[2]));
  const toQR = (c: [number, number, number]): [number, number] => [c[0] - minQ + 3, c[2] - minR + 3];
  const vertexNames = new Map<string, string>();
  const edgeNames = new Map<string, string>();
  // Include the surrounding virtual hexes so every coast node and edge has a
  // canonical n/s or ne/nw/w representative, as the HAN profile requires.
  for (let q = 1; q <= 12; q++) for (let r = 1; r <= 12; r++) {
    const cx = 2 * q + r,
      cy = 3 * r,
      id = tileName(q, r);
    const corners = vertexOffsets.map(([dx, dy]) => point(cx + dx, cy + dy));
    for (const [index, suffix] of [[0, 'n'], [3, 's']] as const) {
      const p = corners[index],
        name = id + suffix;
      if (!vertexNames.has(p)) vertexNames.set(p, name);
    }
    for (const [suffix, [a, b]] of Object.entries(edgeIndexes)) {
      const key = pair(corners[a], corners[b]),
        name = id + suffix;
      if (!edgeNames.has(key)) edgeNames.set(key, name);
    }
  }
  const tileBySource: Record<string, string> = {},
    nodeBySource: Record<string, string> = {},
    edgeBySource: Record<string, string> = {};
  const board: Board = {
    tiles: [],
    edges: {},
    ports: {}
  };
  const ordered = ['NORTH', 'NORTHEAST', 'SOUTHEAST', 'SOUTH', 'SOUTHWEST', 'NORTHWEST'];
  const sourcePoints = new Map<string, string>();
  for (const item of land) {
    const [q, r] = toQR(item.coordinate),
      cx = 2 * q + r,
      cy = 3 * r,
      id = tileName(q, r);
    const sourceId = String(item.tile.id);
    if (tileBySource[sourceId]) throw new Error(`duplicate source tile ${sourceId}`);
    tileBySource[sourceId] = id;
    const vertices = ordered.map((direction, index) => {
      const node = item.tile.nodes?.[direction];
      if (!Number.isInteger(node)) throw new Error(`tile ${sourceId} missing ${direction} node`);
      const [dx, dy] = vertexOffsets[index],
        p = point(cx + dx, cy + dy),
        name = vertexNames.get(p);
      if (!name) throw new Error(`no HAN vertex for source node ${node}`);
      const old = nodeBySource[String(node)];
      if (old && old !== name) throw new Error(`source node ${node} has inconsistent geometry`);
      nodeBySource[String(node)] = name;
      sourcePoints.set(String(node), p);
      return name;
    });
    const raw = item.tile.resource;
    const resource = raw === 'Desert' ? null : sourceResource(raw);
    const number = resource === null ? null : item.tile.number;
    if (resource !== null && !Number.isInteger(number)) throw new Error(`source tile ${sourceId} missing number`);
    board.tiles.push({
      id,
      resource,
      number: number as number | null,
      vertices
    });
  }
  for (const [sourceEdge, ends] of Object.entries(topology.edgeNodes)) {
    const a = sourcePoints.get(String(ends?.[0])),
      b = sourcePoints.get(String(ends?.[1]));
    if (!a || !b) continue; // Water-only edge: cannot carry a road in this profile.
    const name = edgeNames.get(pair(a, b));
    if (!name) throw new Error(`no HAN edge for source edge ${sourceEdge}`);
    if (board.edges[name]) throw new Error(`duplicate mapped edge ${name}`);
    edgeBySource[sourceEdge] = name;
    board.edges[name] = [nodeBySource[String(ends[0])], nodeBySource[String(ends[1])]];
  }
  for (const [sourceNode, raw] of Object.entries(topology.portsByNodeId)) {
    const name = nodeBySource[sourceNode];
    if (!name) throw new Error(`source port node ${sourceNode} absent from land`);
    board.ports[name] = raw === 'Any' ? 'any' : sourceResource(raw);
  }
  if (Object.keys(nodeBySource).length !== 54 || Object.keys(board.edges).length !== 72) throw new Error(`unsupported source topology: ${Object.keys(nodeBySource).length} nodes, ${Object.keys(board.edges).length} edges`);
  return {
    board,
    tileBySource,
    nodeBySource,
    edgeBySource
  };
}
