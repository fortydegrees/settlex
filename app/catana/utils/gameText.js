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

const textToken = (text) => ({ kind: "text", text });
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

  const tokens = [];
  if (actorId != null) {
    tokens.push(playerToken(actorId, playerMap));
  }

  switch (type) {
    case "roll": {
      const total = data.total ?? (Array.isArray(data.dice) ? data.dice[0] + data.dice[1] : null);
      tokens.push(textToken(" rolled "));
      if (Array.isArray(data.dice)) {
        tokens.push(textToken(`${data.dice[0]} + ${data.dice[1]}`));
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
    case "robber:move": {
      tokens.push(textToken(" moved the robber"));
      break;
    }
    case "robber:skip": {
      tokens.push(textToken(" had no valid tile for robber movement"));
      break;
    }
    case "robber:steal": {
      tokens.push(textToken(" stole a resource"));
      if (data.victimId != null) {
        tokens.push(textToken(" from "));
        tokens.push(playerToken(data.victimId, playerMap));
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
