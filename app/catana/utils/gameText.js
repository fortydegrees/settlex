export const STATUS_TEXT = {
  PREGAME: "Waiting to start",
  ROLLING: "Roll Dice",
  THINKING: "Your Turn",
  MOVING_ROBBER: "Move Robber",
  STEALING: "Choose Player",
  DISCARDING: "Discard Cards",
  PLACING_SETTLEMENT: "Place Settlement",
  PLACING_ROAD: "Place Road",
  PLACING_CITY: "Place City"
};

const textToken = (text, extra = {}) => ({ kind: "text", text, ...extra });
const labelToken = (text, extra = {}) => ({ kind: "label", text, ...extra });
const dieToken = (value) => ({ kind: "die", value });
const resolvePlayerMeta = (id, playerMap = {}) => {
  const value = playerMap?.[id];
  if (typeof value === "string") {
    return { name: value };
  }
  if (value && typeof value === "object") {
    return value;
  }
  return {};
};

const playerToken = (id, playerMap) => {
  const meta = resolvePlayerMeta(id, playerMap);
  return {
    kind: "player",
    id,
    name: meta.name ?? (id === "system" ? "System" : `Player ${id}`),
    emoji: meta.emoji ?? null,
    color: meta.color ?? null
  };
};

const resourceTokensFromMap = (resourceMap) => {
  if (!resourceMap) return [];
  const entries = Object.entries(resourceMap);
  if (entries.length === 0) return [];
  const tokens = [];
  entries.forEach(([resource, count]) => {
    const copies = Math.max(0, Math.floor(Number(count) || 0));
    for (let i = 0; i < copies; i += 1) {
      tokens.push({ kind: "resource", resource });
    }
  });
  return tokens;
};

const formatResourceName = (resource) => String(resource ?? "").toLowerCase();

const getServerEventPlayerId = (entry) =>
  entry?.data?.playerId ?? entry?.playerId ?? null;

const findOtherPlayerId = (playerId, playerMap = {}) =>
  Object.keys(playerMap ?? {}).find((id) => id !== String(playerId)) ?? null;

const formatServerEntry = (entry, playerMap = {}) => {
  const affectedPlayerId = getServerEventPlayerId(entry);
  const winnerId =
    entry?.data?.winnerId ?? findOtherPlayerId(affectedPlayerId, playerMap);
  const tokens = [labelToken("server", { variant: "server" })];

  switch (entry?.type) {
    case "server:disconnect":
      if (affectedPlayerId != null) {
        tokens.push(playerToken(String(affectedPlayerId), playerMap));
      }
      tokens.push(
        textToken(" disconnected. Reconnect window started.", {
          variant: "server"
        })
      );
      return tokens;
    case "server:reconnect":
      if (affectedPlayerId != null) {
        tokens.push(playerToken(String(affectedPlayerId), playerMap));
      }
      tokens.push(textToken(" reconnected.", { variant: "server" }));
      return tokens;
    case "server:leave":
      if (affectedPlayerId != null) {
        tokens.push(playerToken(String(affectedPlayerId), playerMap));
      }
      tokens.push(textToken(" left.", { variant: "server" }));
      return tokens;
    case "server:return":
      if (affectedPlayerId != null) {
        tokens.push(playerToken(String(affectedPlayerId), playerMap));
      }
      tokens.push(textToken(" rejoined.", { variant: "server" }));
      return tokens;
    case "server:disconnectForfeit":
      if (affectedPlayerId != null) {
        tokens.push(playerToken(String(affectedPlayerId), playerMap));
      }
      tokens.push(textToken(" failed to reconnect. ", { variant: "server" }));
      if (winnerId != null) {
        tokens.push(playerToken(String(winnerId), playerMap));
        tokens.push(textToken(" wins by forfeit.", { variant: "server" }));
      } else {
        tokens.push(textToken(" lost by forfeit.", { variant: "server" }));
      }
      return tokens;
    case "server:resign":
      if (affectedPlayerId != null) {
        tokens.push(playerToken(String(affectedPlayerId), playerMap));
      }
      tokens.push(textToken(" resigned. ", { variant: "server" }));
      if (winnerId != null) {
        tokens.push(playerToken(String(winnerId), playerMap));
        tokens.push(textToken(" wins.", { variant: "server" }));
      }
      return tokens;
    case "server:idle":
      if (affectedPlayerId != null) {
        tokens.push(playerToken(String(affectedPlayerId), playerMap));
      }
      tokens.push(
        textToken(" was idle for 2 turns. Response window started.", {
          variant: "server"
        })
      );
      return tokens;
    case "server:idleAck":
      if (affectedPlayerId != null) {
        tokens.push(playerToken(String(affectedPlayerId), playerMap));
      }
      tokens.push(
        textToken(" responded and cleared the idle warning.", {
          variant: "server"
        })
      );
      return tokens;
    case "server:idleForfeit":
      if (affectedPlayerId != null) {
        tokens.push(playerToken(String(affectedPlayerId), playerMap));
      }
      tokens.push(textToken(" did not respond. ", { variant: "server" }));
      if (winnerId != null) {
        tokens.push(playerToken(String(winnerId), playerMap));
        tokens.push(textToken(" wins by forfeit.", { variant: "server" }));
      } else {
        tokens.push(textToken(" lost by forfeit.", { variant: "server" }));
      }
      return tokens;
    default:
      return [
        ...tokens,
        textToken(String(entry?.type ?? "server"), { variant: "server" })
      ];
  }
};

export function formatLogEntry(entry, playerMap = {}) {
  if (!entry) return [];
  const { type, actorId, data = {}, forced } = entry;

  if (typeof type === "string" && type.startsWith("forced:")) {
    return [];
  }

  if (type === "turn:end" || data.divider) {
    return [{ kind: "divider" }];
  }

  if (type === "phase:main") {
    return [{ kind: "divider", variant: "strong" }];
  }

  if (type === "phase:placement") {
    return [{ kind: "divider", variant: "strong" }];
  }

  if (typeof type === "string" && type.startsWith("server:")) {
    return formatServerEntry(entry, playerMap);
  }

  const tokens = [];
  if (actorId != null) {
    tokens.push(playerToken(actorId, playerMap));
  }

  switch (type) {
    case "roll": {
      const total = data.total ?? (Array.isArray(data.dice) ? data.dice[0] + data.dice[1] : null);
      tokens.push(textToken(" rolled "));
      if (Array.isArray(data.dice)) {
        tokens.push(...data.dice.slice(0, 2).map((die) => dieToken(die)));
      } else if (total != null) {
        tokens.push(textToken(String(total)));
      }
      break;
    }
    case "build:road":
      tokens.push(textToken(" placed a road"));
      break;
    case "build:settlement":
      tokens.push(textToken(" placed a settlement"));
      break;
    case "build:city":
      tokens.push(textToken(" placed a city"));
      break;
    case "discard": {
      tokens.push(textToken(" discarded "));
      tokens.push(...resourceTokensFromMap(data.resources));
      break;
    }
    case "resource:gain": {
      tokens.push(textToken(" received "));
      tokens.push(...resourceTokensFromMap(data.resources));
      break;
    }
    case "trade:maritime": {
      tokens.push(textToken(" traded "));
      tokens.push(...resourceTokensFromMap(data.give));
      tokens.push(textToken(" for "));
      tokens.push(...resourceTokensFromMap(data.receive));
      break;
    }
    case "dev:buy": {
      tokens.push(textToken(" bought a dev card"));
      break;
    }
    case "dev:play": {
      tokens.push(textToken(" played "));
      if (data.cardType) {
        tokens.push(textToken(String(data.cardType)));
      } else {
        tokens.push(textToken("a dev card"));
      }
      break;
    }
    case "dev:monopolyResult": {
      const amountStolen = Number(data.amountStolen ?? 0);
      const resourceName = formatResourceName(data.resource);
      tokens.push(textToken(` claimed ${amountStolen} ${resourceName}`));
      break;
    }
    case "robber:move": {
      if (data.tileResource && data.tileNumber != null) {
        tokens.push(
          textToken(
            ` moved the robber to ${formatResourceName(data.tileResource)} ${data.tileNumber}`
          )
        );
      } else {
        tokens.push(textToken(" moved the robber"));
      }
      break;
    }
    case "robber:skip": {
      tokens.push(textToken(" had no valid tile for robber movement"));
      break;
    }
    case "robber:steal": {
      tokens.push(textToken(" stole a card"));
      if (data.victimId != null) {
        tokens.push(textToken(" from "));
        tokens.push(playerToken(data.victimId, playerMap));
      }
      break;
    }
    case "resource:shortage": {
      const resourceName = formatResourceName(data.resource);
      const required = Number(data.required ?? 0);
      const available = Number(data.available ?? 0);
      const allocatedByPlayerId = data.allocatedByPlayerId ?? {};
      const allocatedPlayerIds = Object.keys(allocatedByPlayerId);

      if (allocatedPlayerIds.length === 1) {
        const playerId = allocatedPlayerIds[0];
        const allocated = Number(allocatedByPlayerId[playerId] ?? 0);
        tokens.push(
          textToken(
            `Bank only had ${available} of ${required} ${resourceName}, so `
          )
        );
        tokens.push(playerToken(playerId, playerMap));
        tokens.push(textToken(` only received ${allocated}.`));
      } else {
        tokens.push(
          textToken(
            `Bank only had ${available} of ${required} ${resourceName}, so none were distributed.`
          )
        );
      }
      break;
    }
    case "award:longestRoad": {
      tokens.push(textToken(" claimed Longest Road"));
      if (data.previousOwnerId != null && data.previousOwnerId !== actorId) {
        tokens.push(textToken(" from "));
        tokens.push(playerToken(String(data.previousOwnerId), playerMap));
      }
      break;
    }
    case "award:largestArmy": {
      tokens.push(textToken(" claimed Largest Army"));
      if (data.previousOwnerId != null && data.previousOwnerId !== actorId) {
        tokens.push(textToken(" from "));
        tokens.push(playerToken(String(data.previousOwnerId), playerMap));
      }
      break;
    }
    case "game:over": {
      const winnerId = data.winnerId ?? actorId;
      if (winnerId != null && winnerId !== actorId) {
        tokens.push(playerToken(String(winnerId), playerMap));
      }
      tokens.push(textToken(" won the game"));
      break;
    }
    default: {
      tokens.push(textToken(type));
      break;
    }
  }

  if (forced && type !== "roll" && type !== "turn:end" && type !== "resource:gain") {
    tokens.push(textToken(" (timeout)"));
  }

  return tokens;
}

export function formatChatEntry(entry, playerMap = {}) {
  if (!entry || entry.actorId == null) {
    return [];
  }

  const message = entry.message ?? entry.text ?? "";

  return [
    playerToken(String(entry.actorId), playerMap),
    textToken(": "),
    textToken(String(message))
  ];
}
