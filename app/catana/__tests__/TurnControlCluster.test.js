import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TurnControlCluster } from "../components/TurnControlCluster";

function renderCluster(props) {
  return renderToStaticMarkup(
    React.createElement(TurnControlCluster, {
      mode: "roll",
      statusText: "Roll dice",
      timerText: "0:38",
      showTimer: true,
      rollContent: React.createElement("span", { "data-roll": true }, "dice"),
      ...props,
    })
  );
}

describe("TurnControlCluster", () => {
  it("renders an integrated strip with standalone dice in roll mode", () => {
    const html = renderCluster();

    expect(html).toContain("Roll dice");
    expect(html).toContain("0:38");
    expect(html).toContain("data-roll");
    expect(html).toContain("turn-control-cluster__dice");
    expect(html).toContain("turn-control-cluster__button-rail");
    expect(html).toContain("turn-control-strip");
    expect(html).toContain("turn-control-strip__status");
    expect(html).toContain("turn-control-strip__timer");
    expect(html).toContain("turn-control-cluster__button-core--standby");
    expect(html).toContain("translate-y-2.5");
    expect(html).toContain("rgba(255,255,255,0.96)");
    expect(html).toContain("rgba(219,234,254,0.32)");
    expect(html).toContain("tabular-nums");
    expect(html).toContain('aria-label="Roll dice"');
    expect(html).toContain('aria-label="End turn unavailable"');
    expect(html).not.toContain("turn-control-chip");
  });

  it("removes the timer segment when the timer is hidden", () => {
    const html = renderCluster({
      showTimer: false,
      timerText: null,
      statusText: "Move robber",
    });

    expect(html).toContain("Move robber");
    expect(html).toContain("turn-control-strip--no-timer");
    expect(html).not.toContain("turn-control-strip__timer");
    expect(html).not.toContain("0:38");
  });

  it("renders the end-turn button shell in end-turn mode", () => {
    const html = renderCluster({
      mode: "endTurn",
      statusText: "Your turn",
    });

    expect(html).toContain('data-turn-control-mode="endTurn"');
    expect(html).toContain('aria-label="End turn"');
    expect(html).toContain("turn-control-cluster__button-icon");
    expect(html).toContain("turn-control-cluster__button-core--end-turn");
    expect(html).toContain("rgba(185,235,54,0.92)");
    expect(html).toContain("rgba(255,255,255,0.9)");
    expect(html).toContain("h-10 w-10 stroke-[1.45]");
    expect(html).not.toContain("rgba(157,230,36,0.98)");
    expect(html).not.toContain("turn-control-cluster__dice");
  });

  it("keeps the button footprint disabled in inactive mode", () => {
    const html = renderCluster({
      mode: "inactive",
      statusText: "Place road",
    });

    expect(html).toContain('data-turn-control-mode="inactive"');
    expect(html).toContain("disabled");
    expect(html).toContain("Place road");
    expect(html).toContain("turn-control-strip--inactive");
    expect(html).toContain("turn-control-cluster__button-core--standby");
    expect(html).toContain("rgba(255,255,255,0.72)");
    expect(html).toContain("rgba(219,234,254,0.32)");
    expect(html).toContain("disabled:opacity-100");
  });
});
