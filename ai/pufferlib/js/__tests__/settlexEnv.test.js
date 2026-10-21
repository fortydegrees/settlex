import { describe, it, expect } from "vitest";
import envModule from "../settlexEnv.cjs";

const { SettlexSelfPlayEnv } = envModule;

function firstLegal(mask) {
  const idx = mask.findIndex((value) => value === 1);
  if (idx === -1) {
    throw new Error("No legal actions in mask");
  }
  return idx;
}

describe("SettlexSelfPlayEnv", () => {
  it("defaults to duel rules for 2-player games", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 2, maxSteps: 800 });
    env.reset(5);

    expect(env.state.ruleset.victoryPointsToWin).toBe(15);
    expect(env.state.ruleset.discardLimit).toBe(9);

    env.close();
  });

  it("allows explicit standard rules override for 2-player games", () => {
    const env = new SettlexSelfPlayEnv({
      numPlayers: 2,
      maxSteps: 800,
      rulesetId: "standard",
    });
    env.reset(6);

    expect(env.state.ruleset.victoryPointsToWin).toBe(10);
    expect(env.state.ruleset.discardLimit).toBe(7);

    env.close();
  });

  it("reset starts in placement settlement mode with legal actions", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 4, maxSteps: 800 });
    const out = env.reset(7);

    expect(out.mode).toBe("placement_settlement");
    expect(out.done).toBe(false);
    expect(out.truncated).toBe(false);
    expect(out.actionMask.some((v) => v === 1)).toBe(true);
    expect(Array.isArray(out.observation)).toBe(true);
    expect(out.observation.length).toBeGreaterThan(0);

    env.close();
  });

  it("advances to placement road after a legal settlement", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 4, maxSteps: 800 });
    const reset = env.reset(11);
    const action = firstLegal(reset.actionMask);

    const next = env.step(action);
    expect(next.mode).toBe("placement_road");
    expect(next.actorId).toBe(reset.actorId);
    expect(next.done).toBe(false);

    env.close();
  });

  it("plays a full random legal episode without crashing", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 4, maxSteps: 1200 });
    let out = env.reset(101);
    let guard = 0;

    while (!out.done && !out.truncated && guard < 1500) {
      const legal = firstLegal(out.actionMask);
      out = env.step(legal);
      guard += 1;
    }

    expect(guard).toBeGreaterThan(0);
    expect(out.done || out.truncated).toBe(true);

    env.close();
  });

  it("marks illegal actions and substitutes a legal move", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 4, maxSteps: 800 });
    const out = env.reset(99);
    const illegal = out.actionMask.findIndex((v) => v === 0);
    expect(illegal).toBeGreaterThanOrEqual(0);

    const next = env.step(illegal);
    expect(next.info.illegalAction).toBe(true);
    expect(next.done).toBe(false);

    env.close();
  });

  it("publishes observation schema metadata for board-layout features", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 2, maxSteps: 800 });
    env.reset(13);

    const spec = env.getSpec();
    expect(spec.observationSchemaVersion).toBe("v2");
    expect(spec.observationLayout).toBeTruthy();

    const { global, tiles, nodes, edges } = spec.observationLayout;
    expect(global.size).toBeGreaterThan(0);
    expect(tiles.count).toBe(env.landTileIds.length);
    expect(nodes.count).toBe(env.nodeIds.length);
    expect(edges.count).toBe(env.edgeIds.length);
    expect(spec.baseObservationSize).toBe(
      global.size + tiles.count * tiles.featureSize + nodes.count * nodes.featureSize + edges.count * edges.featureSize
    );

    env.close();
  });

  it("encodes land tile resource/number and node port/pip features", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 2, maxSteps: 800 });
    const out = env.reset(23);
    const spec = env.getSpec();
    const base = env._buildBaseObservation(out.actorId);
    const layout = spec.observationLayout;

    const tileById = new Map(
      env.topology.tiles
        .filter((tile) => String(tile.type).toLowerCase() === "land")
        .map((tile) => [tile.tile.id, tile])
    );

    const nonDesertTileId = env.landTileIds.find((tileId) => {
      const tile = tileById.get(tileId);
      return tile?.tile?.resource && String(tile.tile.resource) !== "Desert";
    });
    expect(nonDesertTileId).toBeDefined();

    const tileIndex = env.landTileIds.indexOf(nonDesertTileId);
    expect(tileIndex).toBeGreaterThanOrEqual(0);
    const tileStart = layout.tiles.offset + tileIndex * layout.tiles.featureSize;

    const resourceVec = base.slice(
      tileStart + layout.tiles.resourceOffset,
      tileStart + layout.tiles.resourceOffset + layout.tiles.resourceSize
    );
    const numberVec = base.slice(
      tileStart + layout.tiles.numberOffset,
      tileStart + layout.tiles.numberOffset + layout.tiles.numberSize
    );

    expect(resourceVec.reduce((sum, value) => sum + value, 0)).toBe(1);
    expect(numberVec.reduce((sum, value) => sum + value, 0)).toBe(1);

    const portNodeId = Number(Object.keys(env.topology.portsByNodeId)[0]);
    expect(Number.isInteger(portNodeId)).toBe(true);
    const portNodeIndex = env.nodeIds.indexOf(portNodeId);
    expect(portNodeIndex).toBeGreaterThanOrEqual(0);

    const nodeStart = layout.nodes.offset + portNodeIndex * layout.nodes.featureSize;
    const portVec = base.slice(
      nodeStart + layout.nodes.portOffset,
      nodeStart + layout.nodes.portOffset + layout.nodes.portSize
    );
    const totalPips = base[nodeStart + layout.nodes.totalPipsOffset];

    expect(portVec.reduce((sum, value) => sum + value, 0)).toBe(1);
    expect(totalPips).toBeGreaterThanOrEqual(0);

    env.close();
  });
});
