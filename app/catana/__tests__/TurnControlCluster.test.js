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
  it("renders the timer chip, status chip, and roll content in roll mode", () => {
    const html = renderCluster();

    expect(html).toContain("Roll dice");
    expect(html).toContain("0:38");
    expect(html).toContain("data-roll");
    expect(html).toContain("turn-control-chip--timer");
    expect(html).toContain("tabular-nums");
    expect(html).toContain('aria-label="Roll dice"');
  });

  it("moves the status chip into the top position when the timer is hidden", () => {
    const html = renderCluster({
      showTimer: false,
      timerText: null,
      statusText: "Move robber",
    });

    expect(html).toContain("Move robber");
    expect(html).toContain("turn-control-chip--status-top");
    expect(html).not.toContain("turn-control-chip--timer");
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
  });

  it("keeps the button footprint disabled in inactive mode", () => {
    const html = renderCluster({
      mode: "inactive",
      statusText: "Place road",
    });

    expect(html).toContain('data-turn-control-mode="inactive"');
    expect(html).toContain("disabled");
    expect(html).toContain("Place road");
  });
});
