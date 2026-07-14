export const BOARD_SOURCE_IDS = Object.freeze({
  DUEL_FAIR_OFFICIAL_V1: "duel-fair-official-v1",
  GENERATED_OFFICIAL_SPIRAL_V1: "generated-official-spiral-v1",
  GENERATED_RANDOM_V1: "generated-random-v1"
});

export const GAME_MODES = Object.freeze({
  duel: Object.freeze({
    id: "duel",
    numPlayers: 2,
    rulesetId: "duel",
    boardSourceId: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1
  }),
  "standard-3p": Object.freeze({
    id: "standard-3p",
    numPlayers: 3,
    rulesetId: "standard",
    boardSourceId: BOARD_SOURCE_IDS.GENERATED_OFFICIAL_SPIRAL_V1
  }),
  "standard-4p": Object.freeze({
    id: "standard-4p",
    numPlayers: 4,
    rulesetId: "standard",
    boardSourceId: BOARD_SOURCE_IDS.GENERATED_OFFICIAL_SPIRAL_V1
  })
});

export const resolveGameMode = (id) => {
  const mode = GAME_MODES[id];
  if (!mode) throw new Error(`Unknown game mode: ${id}`);
  return mode;
};

export const resolveDefaultGameModeId = (numPlayers) => {
  if (numPlayers === 2) return "duel";
  if (numPlayers === 3) return "standard-3p";
  return "standard-4p";
};
