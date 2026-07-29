import { createEmptyState } from "@settlex/game-core";
import {
  buildGameScreenDisplayModel,
  buildPostgameSummary,
} from "../../utils/gameScreenDisplayModel";

const completedMatchData = [
  {
    id: "0",
    name: "HarbourFox",
    data: {
      color: "orange",
      emoji: "🦊",
      participantType: "human",
    },
  },
  {
    id: "1",
    name: "BoldTraderYM",
    data: {
      color: "teal",
      emoji: "😉",
      participantType: "human",
    },
  },
  {
    id: "2",
    name: "Puffer 3",
    data: {
      color: "royal",
      emoji: "🤖",
      participantType: "bot",
      botKey: "puffer",
    },
  },
];

const createCompletedCore = () => {
  const core = createEmptyState(["0", "1", "2"]);
  core.buildingsByNodeId = {
    "harbour-city-a": { ownerId: "0", type: "city" },
    "harbour-city-b": { ownerId: "0", type: "city" },
    "harbour-city-c": { ownerId: "0", type: "city" },
    "harbour-settlement-a": { ownerId: "0", type: "settlement" },
    "harbour-settlement-b": { ownerId: "0", type: "settlement" },
    "trader-city-a": { ownerId: "1", type: "city" },
    "trader-city-b": { ownerId: "1", type: "city" },
    "trader-settlement-a": { ownerId: "1", type: "settlement" },
    "trader-settlement-b": { ownerId: "1", type: "settlement" },
    "puffer-city": { ownerId: "2", type: "city" },
    "puffer-settlement": { ownerId: "2", type: "settlement" },
  };
  core.awards.longestRoadOwnerId = "0";
  return core;
};

const completedModel = buildGameScreenDisplayModel({
  core: createCompletedCore(),
  playerID: "1",
  gameOverState: {
    winnerId: "0",
    reason: "victoryPoints",
  },
  isGameOver: true,
  matchData: completedMatchData,
});

export const completedPostgameFixture = Object.freeze({
  scoreboard: completedModel.scoreboard,
  summary: buildPostgameSummary({
    isGameOver: true,
    winnerName: completedModel.winnerName,
    gameOverReasonText: completedModel.gameOverReasonText,
    winnerVP: completedModel.winnerVP,
  }),
});
