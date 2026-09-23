import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TurnControlCluster,
  TurnStatusStrip,
} from "../components/TurnControlCluster";

const timerSnapshot = {
  kind: "turn",
  remainingMs: 38_000,
  receivedAtMs: 1_000,
  serverDelayMs: 0,
};

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(1_000);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderCluster(props) {
  return renderToStaticMarkup(
    React.createElement(TurnControlCluster, {
      mode: "roll",
      statusText: "Roll dice",
      timerSnapshot,
      showTimer: true,
      timerStatusType: "playing",
      timerStatusKind: "your_turn",
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
      timerSnapshot,
      showTimer: true,
      timerStatusType: "playing",
      timerStatusKind: "your_turn",
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
    expect(html).toContain('aria-label="Roll dice"');
    expect(html).toContain('aria-label="End turn unavailable"');
    expect(html).toContain('data-turn-control-mode="roll"');
  });

  it("renders the passive status/timer strip separately", () => {
    const html = renderStatus();

    expect(html).toContain("Roll dice");
    expect(html).toContain("0:38");
    expect(html).toContain('data-turn-status-mode="roll"');
  });

  it("removes the timer segment from the status strip when the timer is hidden", () => {
    const html = renderStatus({
      showTimer: false,
      timerSnapshot: null,
      statusText: "Move robber",
    });

    expect(html).toContain("Move robber");
    expect(html).not.toContain("0:38");
  });

  it("highlights the timer segment when time is nearly gone", () => {
    const html = renderStatus({
      timerSnapshot: {
        ...timerSnapshot,
        remainingMs: 5_000,
      },
    });

    expect(html).toContain("0:05");
    expect(html).toContain('data-low-timer="true"');
  });

  it("renders the end-turn button shell in end-turn mode", () => {
    const html = renderCluster({
      mode: "endTurn",
      statusText: "Your turn",
    });

    expect(html).toContain('data-turn-control-mode="endTurn"');
    expect(html).toContain('aria-label="End turn"');
    expect(html).toContain('aria-label="Dice result"');
    expect(html).toContain('data-turn-status-mode="endTurn"');
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
    expect(clusterHtml).toContain('aria-label="Dice result"');
    expect(clusterHtml).toContain('aria-label="End turn unavailable"');
    expect(statusHtml).toContain("Place road");
    expect(statusHtml).toContain('data-turn-status-mode="inactive"');
  });
});
