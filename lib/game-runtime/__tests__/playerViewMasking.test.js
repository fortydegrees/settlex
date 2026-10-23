import { describe, expect, it } from "vitest";
import { maskPlayerView } from "../setup/playerView";

const makeG = () => ({
  core: {
    devDeck: ["knight", "victoryPoint"],
    playerStateById: {
      "0": {
        resources: ["Wood"],
        devCards: ["knight"],
        devCardsBoughtThisTurn: ["roadBuilding"]
      },
      "1": {
        resources: ["Sheep", "Wheat"],
        devCards: ["monopoly"],
        devCardsBoughtThisTurn: []
      }
    }
  },
  diceState: {
    mode: "balanced",
    cardsLeft: 35
  }
});

describe("player-view masking helper", () => {
  it("preserves own hand data while masking opponents and private decks", () => {
    const G = makeG();
    const result = maskPlayerView({
      G,
      ctx: { gameover: undefined },
      playerID: "0"
    });

    expect(result.core.playerStateById["0"].resources).toEqual(["Wood"]);
    expect(result.core.playerStateById["1"].resources).toEqual([
      "hidden",
      "hidden"
    ]);
    expect(result.core.playerStateById["1"].devCards).toEqual(["hidden"]);
    expect(result.core.devDeck).toEqual(["hidden", "hidden"]);
    expect(result.diceState).toEqual({ mode: "balanced" });
    expect(G.core.playerStateById["1"].resources).toEqual(["Sheep", "Wheat"]);
  });

  it("reuses large public board data while cloning private player state", () => {
    const G = {
      ...makeG(),
      tiles: [{ id: 1, resource: "Wood" }],
      coreTopology: {
        nodeIds: [1, 2, 3],
        edgeIds: ["1-2", "2-3"]
      },
      valids: { nodes: [1], edges: [], tiles: [] }
    };

    const result = maskPlayerView({
      G,
      ctx: { gameover: undefined },
      playerID: "0"
    });

    expect(result).not.toBe(G);
    expect(result.tiles).toBe(G.tiles);
    expect(result.coreTopology).toBe(G.coreTopology);
    expect(result.valids).toBe(G.valids);
    expect(result.core).not.toBe(G.core);
    expect(result.core.playerStateById).not.toBe(G.core.playerStateById);
    expect(result.core.playerStateById["0"]).not.toBe(
      G.core.playerStateById["0"]
    );
    expect(result.core.playerStateById["0"].resources).not.toBe(
      G.core.playerStateById["0"].resources
    );
    expect(result.core.playerStateById["1"].resources).toEqual([
      "hidden",
      "hidden"
    ]);
    expect(G.core.playerStateById["1"].resources).toEqual(["Sheep", "Wheat"]);
  });

  it("returns authoritative state after game over", () => {
    const G = makeG();

    expect(
      maskPlayerView({
        G,
        ctx: { gameover: { winner: "0" } },
        playerID: "1"
      })
    ).toBe(G);
  });
});


describe("stolen-resource log privacy", () => {
  it.each([
    ["0", "Ore"], ["1", "Ore"], ["2", undefined],
    [null, undefined], [undefined, undefined]
  ])("shows only involved players the resource (viewer %s)", (playerID, resource) => {
    const G = {
      ...makeG(),
      gameLog: [{ id: 1, type: "robber:steal", actorId: "1",
        data: { victimId: "0", resource: "Ore" } }]
    };
    const view = maskPlayerView({ G, ctx: {}, playerID });
    expect(view.gameLog[0].data.resource).toBe(resource);
    expect(view.gameLog[0].data.victimId).toBe("0");
    expect(G.gameLog[0].data.resource).toBe("Ore");
  });

  it("keeps the spectator feed generic after game over", () => {
    const G = { ...makeG(), gameLog: [{ id: 1, type: "robber:steal",
      actorId: "1", data: { victimId: "0", resource: "Ore" } }] };
    const view = maskPlayerView({ G, ctx: { gameover: { winner: "1" } }, playerID: null });
    expect(view.gameLog[0].data).toEqual({ victimId: "0" });
    expect(G.gameLog[0].data.resource).toBe("Ore");
  });
});
