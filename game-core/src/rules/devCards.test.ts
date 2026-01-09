import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";
import { ResourceType } from "../types";
import { createStandardDevDeck, buyDevCard } from "./devCards";

describe("dev cards - deck", () => {
  it("creates a 25-card deck with standard counts", () => {
    const deck = createStandardDevDeck();
    expect(deck).toHaveLength(25);
    expect(deck.filter((c) => c === "knight")).toHaveLength(14);
    expect(deck.filter((c) => c === "victoryPoint")).toHaveLength(5);
    expect(deck.filter((c) => c === "roadBuilding")).toHaveLength(2);
    expect(deck.filter((c) => c === "yearOfPlenty")).toHaveLength(2);
    expect(deck.filter((c) => c === "monopoly")).toHaveLength(2);
  });
});

describe("dev cards - purchase", () => {
  it("buys a card when resources are sufficient", () => {
    const state = createEmptyState(["0"]);
    state.devDeck = ["knight"];
    state.playerStateById["0"].resources = [
      ResourceType.SHEEP,
      ResourceType.WHEAT,
      ResourceType.ORE
    ];

    const result = buyDevCard(state, "0");

    expect(result.ok).toBe(true);
    expect(state.devDeck).toHaveLength(0);
    expect(state.playerStateById["0"].devCards).toEqual(["knight"]);
  });
});
