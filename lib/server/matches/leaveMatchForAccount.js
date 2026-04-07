import { GAME_NAME, assertOk, getGameServerBaseUrl } from "./joinMatchForAccount.js";

export const leaveMatchForAccount = async ({
  fetchImpl = fetch,
  baseUrl,
  matchID,
  playerID,
  credentials,
  account,
} = {}) => {
  if (!account?.id) {
    throw new Error("A current account is required to leave a match");
  }

  if (!matchID) throw new Error("matchID is required");
  if (playerID == null) throw new Error("playerID is required");
  if (!credentials) throw new Error("credentials are required");

  const response = await fetchImpl(
    `${getGameServerBaseUrl(baseUrl)}/games/${GAME_NAME}/${matchID}/leave`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerID: String(playerID),
        credentials,
      }),
    }
  );

  await assertOk(response);

  return {
    matchID,
    playerID: String(playerID),
    left: true,
  };
};
