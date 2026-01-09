import type { DevCardType, Resource } from "../types";
import type { GameState } from "../core/state";
import { canAfford, spendResources } from "./buildActions";

export function createStandardDevDeck(): DevCardType[] {
  return [
    ...Array(14).fill("knight"),
    ...Array(5).fill("victoryPoint"),
    ...Array(2).fill("roadBuilding"),
    ...Array(2).fill("yearOfPlenty"),
    ...Array(2).fill("monopoly")
  ];
}

export function buyDevCard(
  state: GameState,
  playerId: string
): { ok: true } | { ok: false; error: string } {
  if (!state.ruleset.devCardsEnabled) {
    return { ok: false, error: "dev-cards-disabled" };
  }
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, error: "unknown-player" };
  }
  if (state.devDeck.length === 0) {
    return { ok: false, error: "deck-empty" };
  }
  if (!canAfford(state.ruleset.buildCosts.devCard, player.resources)) {
    return { ok: false, error: "insufficient-resources" };
  }

  const spent = spendResources(
    state.ruleset.buildCosts.devCard,
    player.resources,
    state.bank.resources,
    state.ruleset.bank.finite
  );
  if (!spent.ok) {
    return { ok: false, error: spent.error };
  }

  const card = state.devDeck.shift() as DevCardType;
  player.devCards.push(card);
  player.devCardsBoughtThisTurn.push(card);
  return { ok: true };
}

export function canPlayDevCard(
  state: GameState,
  playerId: string,
  card: DevCardType
): boolean {
  const player = state.playerStateById[playerId];
  if (!player) {
    return false;
  }
  if (!player.devCards.includes(card)) {
    return false;
  }
  if (card !== "victoryPoint" && player.devCardsPlayedThisTurn >= 1) {
    return false;
  }
  if (player.devCardsBoughtThisTurn.includes(card)) {
    return false;
  }
  return true;
}

export function applyYearOfPlenty(
  state: GameState,
  playerId: string,
  resources: [Resource, Resource]
): { ok: true } | { ok: false; error: string } {
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, error: "unknown-player" };
  }
  if (state.ruleset.bank.finite) {
    for (const resource of resources) {
      const available = state.bank.resources.filter((r) => r === resource).length;
      if (available <= 0) {
        return { ok: false, error: "bank-empty" };
      }
    }
  }

  for (const resource of resources) {
    player.resources.push(resource);
    if (state.ruleset.bank.finite) {
      const index = state.bank.resources.indexOf(resource);
      if (index >= 0) {
        state.bank.resources.splice(index, 1);
      }
    }
  }
  return { ok: true };
}

export function applyMonopoly(
  state: GameState,
  playerId: string,
  resource: Resource
): { ok: true } | { ok: false; error: string } {
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, error: "unknown-player" };
  }

  for (const [otherId, other] of Object.entries(state.playerStateById)) {
    if (otherId === playerId) {
      continue;
    }
    const taken = other.resources.filter((r) => r === resource);
    if (taken.length > 0) {
      player.resources.push(...taken);
      other.resources = other.resources.filter((r) => r !== resource);
    }
  }
  return { ok: true };
}

export function applyKnight(
  state: GameState,
  playerId: string
): { ok: true } | { ok: false; error: string } {
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, error: "unknown-player" };
  }
  player.knightsPlayed += 1;
  return { ok: true };
}

export function applyRoadBuilding(
  _state: GameState,
  _playerId: string,
  _edgeIds: [string, string]
): { ok: true } | { ok: false; error: string } {
  return { ok: false, error: "not-implemented" };
}

export function playDevCard(
  state: GameState,
  playerId: string,
  card: DevCardType
): { ok: true } | { ok: false; error: string } {
  if (!canPlayDevCard(state, playerId, card)) {
    return { ok: false, error: "illegal-devcard" };
  }
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, error: "unknown-player" };
  }
  const index = player.devCards.indexOf(card);
  if (index >= 0) {
    player.devCards.splice(index, 1);
  }
  if (card !== "victoryPoint") {
    player.devCardsPlayedThisTurn += 1;
  }
  return { ok: true };
}
