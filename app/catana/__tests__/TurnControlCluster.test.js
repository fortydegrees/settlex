import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  TurnControlCluster,
  TurnStatusStrip,
} from "../components/TurnControlCluster";

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

function renderStatus(props) {
  return renderToStaticMarkup(
    React.createElement(TurnStatusStrip, {
      mode: "roll",
      statusText: "Roll dice",
      timerText: "0:38",
      showTimer: true,
      ...props,
    })
  );
}

describe("TurnControlCluster", () => {
  it("renders compact bottom status and dice controls in roll mode", () => {
    const html = renderCluster();

    expect(html).toContain("Roll dice");
    expect(html).toContain("0:38");
    expect(html).toContain("data-roll");
    expect(html).toContain("turn-control-cluster__dice");
    expect(html).toContain("turn-control-cluster__dice-content");
    expect(html).toContain("turn-control-cluster__control-row");
    expect(html).toContain("turn-control-cluster__button-rail");
    expect(html).toContain("turn-control-strip");
    expect(html).toContain("turn-control-strip__status");
    expect(html).toContain("turn-control-strip__timer");
    expect(html).toContain("turn-control-cluster__button-core--standby");
    expect(html).toContain("flex-col items-end gap-4");
    expect(html).toContain("rgba(255,255,255,0.96)");
    expect(html).toContain("rgba(219,234,254,0.32)");
    expect(html).toContain("tabular-nums");
    expect(html).toContain("gap-5");
    expect(html).toContain("gap-6");
    expect(html).toContain("turn-control-cluster__dice--rollable");
    expect(html).toContain('aria-label="Roll dice"');
    expect(html).toContain('aria-label="End turn unavailable"');
    expect(html).not.toContain("turn-control-cluster__dice-content--disabled");
    expect(html).not.toContain("turn-control-chip");
  });

  it("renders the passive status/timer strip separately", () => {
    const html = renderStatus();

    expect(html).toContain("Roll dice");
    expect(html).toContain("0:38");
    expect(html).toContain("turn-control-strip");
    expect(html).toContain("turn-control-strip__status");
    expect(html).toContain("turn-control-strip__timer");
    expect(html).toContain("rgba(255,255,255,0.96)");
    expect(html).toContain("tabular-nums");
    expect(html).toContain('data-turn-status-mode="roll"');
    expect(html).not.toContain("turn-control-strip__timer--low");
  });

  it("removes the timer segment from the status strip when the timer is hidden", () => {
    const html = renderStatus({
      showTimer: false,
      timerText: null,
      statusText: "Move robber",
    });

    expect(html).toContain("Move robber");
    expect(html).toContain("turn-control-strip--no-timer");
    expect(html).not.toContain("turn-control-strip__timer");
    expect(html).not.toContain("0:38");
  });

  it("highlights the timer segment when time is nearly gone", () => {
    const html = renderStatus({
      timerText: "0:05",
      isTimerLow: true,
    });

    expect(html).toContain("turn-control-strip__timer--low");
    expect(html).toContain("rgba(244,63,94,0.46)");
    expect(html).toContain("rgba(255,241,242,0.98)");
    expect(html).toContain("turn-control-timer-low-pulse");
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
    expect(html).toContain("h-9 w-9 stroke-[1.45]");
    expect(html).not.toContain("rgba(157,230,36,0.98)");
    expect(html).toContain("turn-control-cluster__dice");
    expect(html).toContain('aria-label="Dice result"');
    expect(html).toContain("turn-control-cluster__dice-content--disabled");
    expect(html).not.toContain("turn-control-cluster__dice--rollable");
  });

  it("keeps the button footprint disabled in inactive mode", () => {
    const clusterHtml = renderCluster({
      mode: "inactive",
    });
    const statusHtml = renderStatus({
      mode: "inactive",
      statusText: "Place road",
    });

    expect(clusterHtml).toContain('data-turn-control-mode="inactive"');
    expect(clusterHtml).toContain("disabled");
    expect(clusterHtml).toContain("turn-control-cluster__button-core--standby");
    expect(clusterHtml).toContain("turn-control-cluster__dice");
    expect(clusterHtml).toContain('aria-label="Dice result"');
    expect(clusterHtml).toContain("turn-control-cluster__dice-content--disabled");
    expect(clusterHtml).toContain("rgba(219,234,254,0.32)");
    expect(clusterHtml).toContain("disabled:opacity-100");
    expect(statusHtml).toContain("Place road");
    expect(statusHtml).toContain("turn-control-strip--inactive");
    expect(statusHtml).toContain("rgba(255,255,255,0.72)");
  });
});
