export const replayPlayers = Object.freeze([
  { id: "0", name: "HarbourFox", color: "sky", emoji: "🦊" },
  { id: "1", name: "BoldTraderYM", color: "orange", emoji: "😉" },
]);

export const replayEvents = Object.freeze([
  { eventIndex: 0, frameIndex: 0, turn: 0, label: "Initial setup" },
  {
    eventIndex: 1,
    frameIndex: 1,
    turn: 1,
    label: "HarbourFox built a settlement",
  },
  {
    eventIndex: 2,
    frameIndex: 2,
    turn: 1,
    label: "HarbourFox ended their turn",
  },
  {
    eventIndex: 3,
    frameIndex: 3,
    turn: 2,
    label: "BoldTraderYM built a road",
  },
  {
    eventIndex: 4,
    frameIndex: 4,
    turn: 2,
    label: "BoldTraderYM ended their turn",
  },
]);

export const replayTurnStarts = Object.freeze([
  { turn: 0, eventIndex: 0 },
  { turn: 1, eventIndex: 1 },
  { turn: 2, eventIndex: 3 },
]);

export const replayScoreSeries = Object.freeze([
  { eventIndex: 0, turn: 0, scoresByPlayerId: { "0": 0, "1": 0 } },
  { eventIndex: 1, turn: 1, scoresByPlayerId: { "0": 1, "1": 0 } },
  { eventIndex: 2, turn: 1, scoresByPlayerId: { "0": 2, "1": 0 } },
  { eventIndex: 3, turn: 2, scoresByPlayerId: { "0": 2, "1": 1 } },
  { eventIndex: 4, turn: 2, scoresByPlayerId: { "0": 2, "1": 2 } },
]);

export const replayTimeline = Object.freeze({
  events: replayEvents,
  players: replayPlayers,
  playerMap: Object.freeze({
    "0": replayPlayers[0],
    "1": replayPlayers[1],
  }),
  turnStarts: replayTurnStarts,
  scoreSeries: replayScoreSeries,
  logEventIndexByKey: Object.freeze({}),
});
