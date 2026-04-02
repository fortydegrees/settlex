import { describe, expect, it, vi } from "vitest";
import { createEmptyState } from "@settlex/game-core";
import { endTurn } from "../Moves";

describe("Moves.endTurn", () => {
  it("advances the core turn and syncs boardgame.io", () => {
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";
    state.turn.phase = "postRoll";
    state.turn.hasRolled = true;

    const events = { endTurn: vi.fn() };
    const context = {
      G: { core: state },
      ctx: { phase: "main", currentPlayer: "0" },
      events,
      log: { setMetadata: vi.fn() }
    };

    endTurn.move(context);

    expect(state.turn.currentPlayerId).toBe("1");
    expect(events.endTurn).toHaveBeenCalledWith({ next: "1" });
  });

  it("clears unresolved turn-scoped dev-card state", () => {
    const state = createEmptyState(["0", "1"]);
    state.phase = "normal";
    state.turn.phase = "postRoll";
    state.turn.hasRolled = true;

    const events = { endTurn: vi.fn() };
    const context = {
      G: {
        core: state,
        devCardPlay: { type: "yearOfPlenty", playerId: "0" },
        robberReturnToStage: "postRoll"
      },
      ctx: { phase: "main", currentPlayer: "0" },
      events,
      log: { setMetadata: vi.fn() }
    };

    endTurn.move(context);

    expect(context.G.devCardPlay).toBe(null);
    expect(context.G.robberReturnToStage).toBe(null);
  });
});
