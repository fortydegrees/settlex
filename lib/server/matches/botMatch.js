import { getMatchSetupData } from "./friendChallenge.js";
import { BOARD_SOURCE_IDS } from "../../shared/gameModes.js";
import { getBotModelSelection } from "../bots/modelSelection.js";

export const BOT_MATCH_KIND = "bot_game";

export const BOT_KEYS = Object.freeze({
  SETTLEGRAPH_V2: "settlegraph-v2",
});

const BOT_DESCRIPTORS = Object.freeze({
  [BOT_KEYS.SETTLEGRAPH_V2]: Object.freeze({
    key: BOT_KEYS.SETTLEGRAPH_V2,
    get displayName() { return getBotModelSelection().displayName; },
    boardSourceId: BOARD_SOURCE_IDS.SETTLEGRAPH_V2_NATIVE_V1,
  }),
});

export const resolveBotDescriptor = (botKey = BOT_KEYS.SETTLEGRAPH_V2) => {
  const descriptor = BOT_DESCRIPTORS[String(botKey)];
  if (!descriptor) {
    throw Object.assign(new Error(`Unknown bot: ${botKey}`), { status: 400 });
  }
  return descriptor;
};

export const isBotEnabled = (botKey, env = process.env) => {
  resolveBotDescriptor(botKey);
  return env.SETTLEX_SETTLEGRAPH_V2_ENABLED === "1";
};

export const buildBotMatchSetupData = (setupData = {}, botKey = BOT_KEYS.SETTLEGRAPH_V2) => {
  const descriptor = resolveBotDescriptor(botKey);
  return {
    ...setupData,
    ...(descriptor.boardSourceId
      ? {
          modeId: "duel",
          rulesetId: "duel",
          boardSourceId: descriptor.boardSourceId,
          botKey: descriptor.key,
        }
      : {}),
    matchKind: BOT_MATCH_KIND,
  };
};

export const isBotMatch = (match = {}) =>
  getMatchSetupData(match)?.matchKind === BOT_MATCH_KIND;
