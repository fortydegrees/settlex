import { buildNotationReplayFile } from "../../../lib/replays/notationReplay.js";

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const fail = (detail) => { throw new Error(`Invalid local replay: ${detail}`); };
const RESOURCES = ["Wood", "Brick", "Sheep", "Wheat", "Ore", "hidden"];
const DEV_CARDS = ["knight", "victoryPoint", "roadBuilding", "yearOfPlenty", "monopoly", "hidden"];
const NODE_REFS = ["NORTH", "NORTHEAST", "SOUTHEAST", "SOUTH", "SOUTHWEST", "NORTHWEST"];
const EDGE_REFS = ["NORTHEAST", "EAST", "SOUTHEAST", "SOUTHWEST", "WEST", "NORTHWEST"];
const nodeId = (id) => Number.isSafeInteger(id) && id >= 0;
function validateTiles(tiles, index) {
  if (!tiles.length) fail(`frame ${index+1} has no board`);
  const ids = new Set();
  for (const item of tiles) {
    const tile = item?.tile;
    if (!Array.isArray(item?.coordinate) || item.coordinate.length !== 3 || !item.coordinate.every(Number.isSafeInteger)
      || item.coordinate.reduce((sum, value) => sum+value, 0) !== 0 || !isRecord(tile) || !nodeId(tile.id) || ids.has(tile.id)) fail(`frame ${index+1} has invalid tile geometry`);
    ids.add(tile.id);
    if (item.type === "Land") {
      if (![...RESOURCES.slice(0,5), "Desert"].includes(tile.resource) || (tile.resource !== "Desert" && (!Number.isInteger(tile.number) || tile.number < 2 || tile.number > 12 || tile.number === 7))
        || !isRecord(tile.nodes) || !NODE_REFS.every((ref) => nodeId(tile.nodes[ref])) || !isRecord(tile.edges)
        || !EDGE_REFS.every((ref) => Array.isArray(tile.edges[ref]) && tile.edges[ref].length === 2 && tile.edges[ref].every(nodeId))) fail(`frame ${index+1} has invalid land tile`);
    } else if (item.type === "Port") {
      if (![...RESOURCES.slice(0,5), "Any"].includes(tile.resource) || !EDGE_REFS.includes(tile.direction)
        || !Array.isArray(tile.nodes) || tile.nodes.length !== 2 || !tile.nodes.every(nodeId)) fail(`frame ${index+1} has invalid port`);
    } else fail(`frame ${index+1} has unsupported tile type`);
  }
}

function validatePieces(core, tiles, players, index) {
  const nodes = new Set();
  const edges = new Set();
  for (const {tile} of tiles.filter((item) => item.type === "Land")) {
    for (const ref of NODE_REFS) nodes.add(String(tile.nodes[ref]));
    for (const ref of EDGE_REFS) edges.add([...tile.edges[ref]].sort((a,b)=>a-b).join(","));
  }
  for (const [node, building] of Object.entries(core.buildingsByNodeId)) {
    if (!nodes.has(node) || !isRecord(building) || !players.includes(building.ownerId)
      || !["settlement","city"].includes(building.type)) fail(`frame ${index+1} has an invalid building piece`);
  }
  for (const [edge, owner] of Object.entries(core.roadsByEdgeId)) {
    if (!edges.has(edge) || !players.includes(owner)) fail(`frame ${index+1} has an invalid road piece`);
  }
}

export function parseLocalReplayFile(text) {
  let payload;
  try { payload = JSON.parse(text); } catch { throw new Error("The selected file is not valid JSON. Convert the recording to a replay file first."); }
  if (payload?.format === "han-prototype") payload = buildNotationReplayFile(payload);
  if (!["settlehex-replay-file", "settlex-replay-file"].includes(payload?.format) || payload.schemaVersion !== 1) fail("unsupported format or version");
  const { replay, frames } = payload;
  if (!isRecord(replay) || typeof replay.match?.replayId !== "string" || !Array.isArray(replay.participants) || replay.participants.length < 2
    || typeof replay.isComplete !== "boolean" || !Array.isArray(frames) || frames.length === 0) fail("missing participants, completion status or frames");
  const players = replay.participants.map((player) => String(player?.seatId));
  if (players.some((id) => !id || id === "undefined" || id === "null") || new Set(players).size !== players.length
    || replay.participants.some((player) => typeof player.usernameSnapshot !== "string")) fail("participant seats must be unique and named");
  if (replay.initialPerspectivePlayerID != null && !players.includes(String(replay.initialPerspectivePlayerID))) fail("unknown initial perspective");
  for (const [index, frame] of frames.entries()) {
    const core = frame?.state?.G?.core;
    if (frame?.index !== index || !isRecord(frame.state?.ctx) || !isRecord(core) || !Array.isArray(frame.state.G.tiles)
      || !Array.isArray(core.players) || core.players.length !== players.length || new Set(core.players).size !== players.length || !core.players.every((id) => players.includes(id))
      || !isRecord(core.playerStateById) || !isRecord(core.buildingsByNodeId) || !isRecord(core.roadsByEdgeId)) fail(`frame ${index+1} has invalid state or identity`);
    validateTiles(frame.state.G.tiles, index);
    validatePieces(core, frame.state.G.tiles, players, index);
    if (!isRecord(core.ruleset) || !Number.isSafeInteger(core.ruleset.victoryPointsToWin) || core.ruleset.victoryPointsToWin < 1
      || !isRecord(core.turn) || !players.includes(core.turn.currentPlayerId) || !players.includes(frame.state.ctx.currentPlayer)
      || !Number.isSafeInteger(frame.state.ctx.turn) || frame.state.ctx.turn < 0) fail(`frame ${index+1} has invalid turn/settings`);
    for (const player of players) {
      const hand = core.playerStateById[player];
      if (!isRecord(hand) || !Array.isArray(hand.resources) || !hand.resources.every((card) => RESOURCES.includes(card))
        || !Array.isArray(hand.devCards) || !hand.devCards.every((card) => DEV_CARDS.includes(card))) fail(`frame ${index+1} has invalid player inventory`);
    }
    const annotation = frame.annotation;
    if (!isRecord(annotation) || typeof annotation.label !== "string" || !Array.isArray(annotation.notes) || annotation.notes.some((note) => typeof note !== "string")) fail(`frame ${index+1} needs a label and notes`);
    if (annotation.decision && (!players.includes(annotation.decision.playerId) || typeof annotation.decision.label !== "string" || !isRecord(annotation.decision.action))) fail(`frame ${index+1} has invalid decision`);
  }
  if (replay.isComplete && !frames.at(-1).state.G.core.gameOver) fail("complete replay needs a terminal final position");
  if (replay.metadata?.warnings && (!Array.isArray(replay.metadata.warnings) || replay.metadata.warnings.some((note) => typeof note !== "string"))) fail("invalid capture warnings");
  if (replay.metadata?.checkpoint?.label != null && typeof replay.metadata.checkpoint.label !== "string") fail("invalid checkpoint label");
  return payload;
}

// Ignore completions from older game selections or an unmounted library.
export function createLocalReplayReader({ onReady, onError }) {
  let generation = 0;
  return {
    cancel() { generation += 1; },
    async read(readText) {
      const request = ++generation;
      try {
        const payload = parseLocalReplayFile(await readText());
        if (request === generation) onReady(payload);
      } catch (error) { if (request === generation) onError(error); }
    },
  };
}
