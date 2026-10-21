import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildTopology, createEmptyState, ResourceType } from "@settlex/game-core";
import { describe, expect, it, vi } from "vitest";
import { applyReadOnlyDockState, useLocalPlayerDockModel } from "../components/useLocalPlayerDockModel";

function renderTradeModel(overrides = {}) {
  const core = createEmptyState(["0", "1"]);
  core.phase = "normal";
  core.playerStateById["0"].resources = Array(4).fill(ResourceType.WOOD);
  let model;
  function Probe() {
    model = useLocalPlayerDockModel({
      G: { core, coreTopology: buildTopology([]) },
      ctx: { currentPlayer: "0", activePlayers: { "0": "postRoll" } },
      player: { ...core.playerStateById["0"], id: "0" },
      clientPlayerID: "0",
      themeId: "classic",
      ...overrides,
    });
    return null;
  }
  renderToStaticMarkup(React.createElement(Probe));
  return model;
}

describe("useLocalPlayerDockModel helpers", () => {
  it("opens ordinary trade without treating dock animation data as a resource preset", () => {
    const onTradeClick = vi.fn();
    const model = renderTradeModel({ onTradeClick });
    const action = model.dynamicActions.find((entry) => entry?.name === "trade");
    expect(action.enabled).toBe(true);
    action.action({ triggerRect: { x: 10, y: 20, width: 48, height: 48 }, preLaunchDelayMs: 0 });
    expect(onTradeClick.mock.calls).toEqual([[]]);
  });

  it("keeps the resource preset for an eligible quick trade", () => {
    const onTradeClick = vi.fn();
    const model = renderTradeModel({ onTradeClick });
    model.handleResourceClick(ResourceType.WOOD);
    model.handleResourceClick(ResourceType.ORE);
    expect(onTradeClick.mock.calls).toEqual([[ResourceType.WOOD]]);
  });

  it("does not quick-trade from a read-only view", () => {
    const onTradeClick = vi.fn();
    const model = renderTradeModel({ onTradeClick, readOnly: true });
    model.handleResourceClick(ResourceType.WOOD);
    expect(model.canQuickTradeResource(ResourceType.WOOD)).toBe(false);
    expect(onTradeClick).not.toHaveBeenCalled();
  });

  it("forces every dock capability off in replay", () => {
    expect(
      applyReadOnlyDockState({
        readOnly: true,
        dynamicActions: [{ name: "road", enabled: true }],
        rollEnabled: true,
        endTurnEnabled: true,
      })
    ).toEqual({
      dynamicActions: [{ name: "road", enabled: false }],
      rollEnabled: false,
      endTurnEnabled: false,
    });
  });
});
