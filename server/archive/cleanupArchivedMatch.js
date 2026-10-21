export const cleanupArchivedMatch = async ({ matchID, serverDb } = {}) => {
  if (!matchID) {
    throw new Error("matchID is required");
  }

  if (!serverDb?.wipe) {
    throw new Error("A live boardgame.io DB is required to clean archived matches");
  }

  await serverDb.wipe(matchID);

  return {
    matchID,
    cleanedUp: true,
  };
};
