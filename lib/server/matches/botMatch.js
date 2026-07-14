import { getMatchSetupData } from "./friendChallenge.js";

export const BOT_MATCH_KIND = "bot_game";

export const buildBotMatchSetupData = (setupData = {}) => ({
  ...setupData,
  matchKind: BOT_MATCH_KIND,
});

export const isBotMatch = (match = {}) =>
  getMatchSetupData(match)?.matchKind === BOT_MATCH_KIND;
