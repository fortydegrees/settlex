import {
  GAME_NAME,
  assertOk,
  getGameServerBaseUrl,
  joinMatchForAccount,
} from "./joinMatchForAccount.js";
import { leaveMatchForAccount } from "./leaveMatchForAccount.js";
import {
  BOT_KEYS,
  buildBotMatchSetupData,
  resolveBotDescriptor,
} from "./botMatch.js";

export const createMatchForAccount = async ({
  fetchImpl = fetch,
  baseUrl,
  account,
  numPlayers = 2,
  creatorSeatId = "0",
  setupData,
  matchmakingRequestId,
  requestedCredentials,
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
    playerID: String(creatorSeatId),
    matchmakingRequestId,
    requestedCredentials,
  });

  const match = await fetchImpl(`${resolvedBaseUrl}/games/${GAME_NAME}/${created.matchID}`, {
    method: "GET",
  }).then(assertOk);

  return {
    matchID: created.matchID,
    playerID: String(creatorSeatId),
    playerCredentials: joined?.playerCredentials,
    match,
  };
};

export const createBotMatchForAccount = async ({
  fetchImpl,
  baseUrl,
  account,
  numPlayers = 2,
  setupData,
  botKey = BOT_KEYS.PUFFER,
  createMatchForAccountImpl = createMatchForAccount,
  joinMatchForAccountImpl = joinMatchForAccount,
  leaveMatchForAccountImpl = leaveMatchForAccount,
  logger = console,
} = {}) => {
  const bot = resolveBotDescriptor(botKey);
  const transport = {
    ...(fetchImpl ? { fetchImpl } : {}),
    ...(baseUrl ? { baseUrl } : {}),
  };
  const created = await createMatchForAccountImpl({
    ...transport,
    account,
    numPlayers,
    setupData: buildBotMatchSetupData(setupData, bot.key),
  });

  try {
    await joinMatchForAccountImpl({
      ...transport,
      account,
      matchID: created.matchID,
      playerID: "1",
      participant: {
        participantType: "bot",
        botKey: bot.key,
        usernameSnapshot: bot.displayName,
        avatarSnapshot: { emoji: "🤖", color: "royal" },
      },
    });
    return created;
  } catch (error) {
    try {
      await leaveMatchForAccountImpl({
        ...transport,
        account,
        matchID: created.matchID,
        playerID: created.playerID,
        credentials: created.playerCredentials,
      });
    } catch (cleanupError) {
      logger.error("Failed to clean up private bot match after setup failure", {
        matchID: created.matchID,
        accountId: account?.id,
        error: cleanupError,
      });
    }
    throw error;
  }
};
