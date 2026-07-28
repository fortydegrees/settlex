const playersOf = (match) => {
  const players = match?.players;
  return (Array.isArray(players) ? players : Object.values(players ?? {}))
    .filter(Boolean);
};

const isOccupied = (player) =>
  Boolean(player?.name || player?.data?.usernameSnapshot);

export function findHumanSeatForAccount({ match, accountId } = {}) {
  if (!accountId) return null;

  return (
    playersOf(match).find(
      (player) =>
        isOccupied(player) &&
        player?.data?.participantType === "human" &&
        player?.data?.accountId === accountId
    ) ?? null
  );
}
