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
const playerToken = (id, nameMap) => ({
  kind: "player",
  id,
  name: nameMap?.[id] ?? (id === "system" ? "System" : `Player ${id}`)
});

const resourceTokensFromMap = (resourceMap) => {
  if (!resourceMap) return [];
  const entries = Object.entries(resourceMap);
  if (entries.length === 0) return [];
  const tokens = [];
  entries.forEach(([resource, count], index) => {
    if (index > 0) {
      tokens.push(textToken(", "));
    }
    tokens.push({ kind: "resource", resource, count });
  });
  return tokens;
};

export function formatLogEntry(entry, nameMap = {}) {
  if (!entry) return [];
  const { type, actorId, data = {}, forced } = entry;

  if (type === "forced:roll" || type === "forced:endTurn") {
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
    tokens.push(playerToken(actorId, nameMap));
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
    case "robber:steal": {
      tokens.push(textToken(" stole a resource"));
      if (data.victimId != null) {
        tokens.push(textToken(" from "));
        tokens.push(playerToken(data.victimId, nameMap));
      }
      break;
    }
    case "game:over": {
      const winnerId = data.winnerId ?? actorId;
      if (winnerId != null && winnerId !== actorId) {
        tokens.push(playerToken(String(winnerId), nameMap));
      }
      tokens.push(textToken(" won the game"));
      break;
    }
    case "forced:discardSelection": {
      const targetId = data.playerId ?? data.playerID;
      tokens.push(textToken(" auto-selected discard for "));
      if (targetId != null) {
        tokens.push(playerToken(String(targetId), nameMap));
      }
      break;
    }
    default: {
      tokens.push(textToken(type));
      break;
    }
  }

  if (forced && type !== "roll" && type !== "turn:end" && type !== "resource:gain") {
    tokens.push(textToken(" (auto)"));
  }

  return tokens;
}
