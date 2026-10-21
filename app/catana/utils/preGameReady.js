export const shouldAutoReady = ({
  readySent,
  playerID,
  phase,
  hasReadyMove,
  isMultiplayer,
  isConnected,
  matchData,
  readyByPlayerId
}) => {
  if (readySent) return false;
  if (playerID == null || playerID === "") return false;
  if (!hasReadyMove) return false;
  if (phase !== "preGame") return false;
  if (readyByPlayerId?.[String(playerID)]) return false;

  if (!isMultiplayer) {
    return true;
  }

  return isConnected && Array.isArray(matchData);
};
