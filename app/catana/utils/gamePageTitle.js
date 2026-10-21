export function getGamePageTitle({ playerID, nameMap = {}, isReplay = false } = {}) {
  if (isReplay) return "Replay · SettleHex";
  if (playerID != null && playerID !== "" && nameMap[String(playerID)]) {
    const opponents = Object.entries(nameMap).filter(
      ([id, name]) => id !== String(playerID) && name
    );
    if (opponents.length === 1) {
      return `Game vs ${opponents[0][1]} · SettleHex`;
    }
  }
  return "Game · SettleHex";
}
