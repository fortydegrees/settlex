import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";

describe("build costs - state init", () => {
  it("initializes piece counts from ruleset", () => {
    const state = createEmptyState(["0"]);
    expect(state.playerStateById["0"].roadsRemaining).toBeGreaterThan(0);
    expect(state.playerStateById["0"].settlementsRemaining).toBeGreaterThan(0);
    expect(state.playerStateById["0"].citiesRemaining).toBeGreaterThan(0);
  });
});
