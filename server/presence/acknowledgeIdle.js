const MATCH_PREFIX = "MATCH-";

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

export async function acknowledgeIdle({
  serverInstance,
  idleManager,
  matchID,
  playerID,
  credentials
}) {
  if (playerID == null || !credentials) {
    throw createHttpError(400, "playerID and credentials are required");
  }

  const normalizedMatchID = String(matchID);
  const normalizedPlayerID = String(playerID);
  const response = await serverInstance?.db?.fetch?.(normalizedMatchID, {
    state: true,
    metadata: true
  });
  const state = response?.state ?? null;
  const metadata = response?.metadata ?? null;

  if (!state || !metadata) {
    throw createHttpError(404, "match not found");
  }

  const isAuthorized = await serverInstance?.auth?.authenticateCredentials?.({
    playerID: normalizedPlayerID,
    credentials,
    metadata
  });

  if (!isAuthorized) {
    throw createHttpError(403, "invalid credentials");
  }

  const ok = idleManager?.acknowledge?.(normalizedMatchID, normalizedPlayerID) === true;
  if (ok) {
    serverInstance?.transport?.pubSub?.publish?.(`${MATCH_PREFIX}${normalizedMatchID}`, {
      type: "update",
      args: [normalizedMatchID, state]
    });
  }

  return { ok };
}
