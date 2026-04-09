import {
  GAME_NAME,
  assertOk,
  getGameServerBaseUrl,
} from "./joinMatchForAccount.js";

export const getLiveMatch = async ({
  fetchImpl = fetch,
  baseUrl,
  matchID,
} = {}) => {
  if (!matchID) {
    throw new Error("matchID is required");
  }

  return fetchImpl(`${getGameServerBaseUrl(baseUrl)}/games/${GAME_NAME}/${matchID}`, {
    method: "GET",
  }).then(assertOk);
};
