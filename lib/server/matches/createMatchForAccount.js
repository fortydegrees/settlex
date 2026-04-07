import {
  GAME_NAME,
  assertOk,
  getGameServerBaseUrl,
  joinMatchForAccount,
} from "./joinMatchForAccount.js";

export const createMatchForAccount = async ({
  fetchImpl = fetch,
  baseUrl,
  account,
  numPlayers = 2,
  setupData,
} = {}) => {
  const resolvedBaseUrl = getGameServerBaseUrl(baseUrl);

  const created = await fetchImpl(`${resolvedBaseUrl}/games/${GAME_NAME}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      numPlayers,
      ...(setupData ? { setupData } : {}),
    }),
  }).then(assertOk);

  if (!created?.matchID) {
    throw new Error("Create succeeded but returned no matchID.");
  }

  const joined = await joinMatchForAccount({
    fetchImpl,
    baseUrl: resolvedBaseUrl,
    account,
    matchID: created.matchID,
    playerID: "0",
  });

  const match = await fetchImpl(`${resolvedBaseUrl}/games/${GAME_NAME}/${created.matchID}`, {
    method: "GET",
  }).then(assertOk);

  return {
    matchID: created.matchID,
    playerID: "0",
    playerCredentials: joined?.playerCredentials,
    match,
  };
};
