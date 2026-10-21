export type Resource = 'B' | 'G' | 'L' | 'O' | 'W';
export type Card = 'k' | 'm' | 'r' | 'v' | 'y';
export type Counts = Record<Resource, number>;
export type Formula = Partial<Counts>;
export type Piece = 'road' | 'settlement' | 'city';
export interface Board {
  tiles: {
    id: string;
    resource: Resource | null;
    number: number | null;
    vertices: string[];
  }[];
  edges: Record<string, [string, string]>;
  ports: Record<string, Resource | 'any'>;
}
export type Event = {
  type: 'roll';
  dice: [number, number];
} | {
  type: 'build';
  piece: Piece;
  at: string;
} | {
  type: 'buyDev';
  card: Card;
} | {
  type: 'play';
  card: 'k' | 'r';
} | {
  type: 'play';
  card: 'm';
  resource: Resource;
} | {
  type: 'play';
  card: 'y';
  resources: Formula;
} | {
  type: 'discard';
  player: string;
  resources: Formula;
} | {
  type: 'moveRobber';
  at: string;
} | {
  type: 'steal';
  from: string;
  resource: Resource;
} | {
  type: 'trade';
  with: string;
  give: Formula;
  take: Formula;
} | {
  type: 'end';
};
export interface Envelope {
  version: 1;
  rules: 'base-omniscient-prototype-1' | 'base-friendly-omniscient-prototype-1' | 'duel-friendly-omniscient-prototype-1';
  knowledge: 'omniscient';
  coverage: 'complete' | 'prefix';
  players: string[];
  board: Board;
  robber: string;
  result: {
    winner: string;
  } | null;
  annotations?: unknown;
}
export interface HANRecord extends Envelope {
  format: 'han-prototype';
  actions: string[];
}
export type Phase = 'setupSettlement' | 'setupRoad' | 'preRoll' | 'actions' | 'discard' | 'robber' | 'steal' | 'freeRoads' | 'finished';
export interface State {
  current: string;
  phase: Phase;
  setupIndex: number;
  setupAnchor: string | null;
  returnPhase: 'preRoll' | 'actions';
  freeRoadsRemaining: number;
  hands: Record<string, Counts>;
  bank: Counts;
  dev: Record<string, {
    old: Card[];
    fresh: Card[];
  }>;
  deck: Record<Card, number>;
  played: boolean;
  knights: Record<string, number>;
  buildings: Record<string, {
    owner: string;
    kind: 'settlement' | 'city';
  }>;
  roads: Record<string, string>;
  robber: string;
  pendingDiscards: string[];
  awards: {
    road: string | null;
    army: string | null;
  };
  points: Record<string, number>;
  winner: string | null;
}
