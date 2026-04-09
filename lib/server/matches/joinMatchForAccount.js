const GAME_NAME = "catan";
const LOCAL_GAME_SERVER_BASE_URL = "http://localhost:8080";

const getDefaultGameServerBaseUrl = () =>
  process.env.NODE_ENV === "production" ? "" : LOCAL_GAME_SERVER_BASE_URL;

const getGameServerBaseUrl = (
  baseUrl = process.env.GAME_SERVER_INTERNAL_URL ?? getDefaultGameServerBaseUrl()
) => {
  const resolved = baseUrl?.trim();
  if (resolved) return resolved.replace(/\/+$/, "");
  throw new Error("GAME_SERVER_INTERNAL_URL is required");
};

const readJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const assertOk = async (response) => {
  if (response.ok) {
    return readJson(response);
  }

  const body = await readJson(response);
  const message =
    body?.error ?? body?.message ?? `HTTP ${response.status} ${response.statusText}`;
  throw new Error(message);
};

const createHumanParticipant = (account) => {
  if (!account?.id || !account?.currentUsername) {
    throw new Error("A current account is required to join a human seat");
  }

  return {
    participantType: "human",
    accountId: account.id,
    usernameSnapshot: account.currentUsername,
    avatarSnapshot: {
      emoji: account.avatarEmoji ?? "",
      color: account.avatarColor ?? "",
    },
  };
};

const buildJoinPayload = ({ account, participant, playerID }) => {
  const resolvedParticipant = participant ?? createHumanParticipant(account);
  const avatarEmoji = resolvedParticipant.avatarSnapshot?.emoji ?? "";
  const avatarColor = resolvedParticipant.avatarSnapshot?.color ?? "";

  if (resolvedParticipant.participantType === "bot") {
    return {
      playerID: String(playerID),
      playerName: resolvedParticipant.usernameSnapshot,
      data: {
        participantType: "bot",
        botKey: resolvedParticipant.botKey ?? "puffer",
        usernameSnapshot: resolvedParticipant.usernameSnapshot,
        avatarSnapshot: {
          emoji: avatarEmoji,
          color: avatarColor,
        },
        bot: resolvedParticipant.botKey ?? "puffer",
        isBot: true,
        emoji: avatarEmoji,
        color: avatarColor,
      },
    };
  }

  return {
    playerID: String(playerID),
    playerName: resolvedParticipant.usernameSnapshot,
    data: {
      participantType: "human",
      accountId: resolvedParticipant.accountId,
      usernameSnapshot: resolvedParticipant.usernameSnapshot,
      avatarSnapshot: {
        emoji: avatarEmoji,
        color: avatarColor,
      },
      isBot: false,
      emoji: avatarEmoji,
      color: avatarColor,
    },
  };
};

export { GAME_NAME, getGameServerBaseUrl, assertOk };

export const joinMatchForAccount = async ({
  fetchImpl = fetch,
  baseUrl,
  matchID,
  playerID,
  account,
  participant,
} = {}) => {
  if (!matchID) throw new Error("matchID is required");
  if (playerID == null) throw new Error("playerID is required");

  const response = await fetchImpl(
    `${getGameServerBaseUrl(baseUrl)}/games/${GAME_NAME}/${matchID}/join`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildJoinPayload({ account, participant, playerID })),
    }
  );

  return assertOk(response);
};
