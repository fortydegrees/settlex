export function resolveLiveMatchClientMode({
  interruptedDuel = false,
  credentials = null,
  playerID = "",
  isSpectating = false,
} = {}) {
  if (interruptedDuel) return "interrupted";
  if (credentials && playerID) return "player";
  if (isSpectating) return "spectator";
  return "room";
}

export function resolveOpenSeatSelection({
  credentials = null,
  pendingChallengeState = null,
  spectatorMode = false,
  openSeats = [],
  playerID = "",
} = {}) {
  if (pendingChallengeState || spectatorMode || credentials) return playerID;
  if (openSeats.length === 0) return playerID;

  const openSeatIds = new Set(openSeats.map((seat) => String(seat.id)));
  const current = String(playerID || "");
  return current && openSeatIds.has(current)
    ? current
    : String(openSeats[0].id);
}

export function buildPufferBotJoinPayload({ matchID, seat }) {
  return {
    matchID,
    playerID: String(seat.id),
    participantType: "bot",
    botKey: "puffer",
    botName: `Puffer ${Number(seat.id) + 1}`,
    avatarEmoji: "🤖",
    avatarColor: "royal",
  };
}

export function buildInterruptedDuelLeavePayload({
  matchID,
  playerID,
  credentials,
}) {
  return {
    matchID,
    playerID,
    credentials,
    intent: "matchmaking_cancel",
  };
}

export function resolveInterruptedDuelLeaveFailure(error) {
  if (error?.code === "MATCH_FOUND") {
    return { refreshMatch: true, message: "" };
  }

  return {
    refreshMatch: false,
    message: error?.message || "Failed to leave the interrupted duel.",
  };
}
