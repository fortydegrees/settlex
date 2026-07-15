const playersOf = (match = {}) =>
  (Array.isArray(match?.players)
    ? match.players
    : Object.values(match?.players ?? {}))
    .filter(Boolean);

const isOccupiedSeat = (player = {}) =>
  Boolean(player?.name || player?.data?.usernameSnapshot);

export function isInterruptedCredentialedDuel({
  match,
  playerID,
  credentials,
} = {}) {
  if (!credentials || playerID == null || playerID === "") return false;

  const matchKind =
    match?.metadata?.setupData?.matchKind ?? match?.setupData?.matchKind;
  if (matchKind === "friend_challenge" || matchKind === "bot_game") {
    return false;
  }

  const players = playersOf(match);
  if (players.length !== 2) return false;

  const currentSeat = players.find(
    (player) => String(player?.id) === String(playerID)
  );
  if (!currentSeat || !isOccupiedSeat(currentSeat)) return false;

  return players.some((player) => !isOccupiedSeat(player));
}
