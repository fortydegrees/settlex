import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DesktopMetaDock } from "../LeftMetaRail";

vi.mock("../../../../ui/Tooltip", () => ({
  Tooltip: ({ children }) => children,
}));
vi.mock("../GameLogPanel", () => ({
  GameLogPanel: () => React.createElement("button", null, "Replay event"),
}));

describe("DesktopMetaDock interaction availability", () => {
  it.each(["log", "chat"])("makes the minimized %s panel inert", (panelId) => {
    const markup = renderToStaticMarkup(
      React.createElement(DesktopMetaDock, { initialOpenPanels: [] })
    );
    const panelTag = markup.match(
      new RegExp(`<div[^>]*id="desktop-meta-panel-${panelId}"[^>]*>`)
    )?.[0];

    expect(panelTag).toBeDefined();
    expect(panelTag).toContain('inert=""');
    expect(panelTag).toContain('aria-hidden="true"');
  });

  it.each(["log", "chat"])("keeps the open %s panel interactive", (panelId) => {
    const markup = renderToStaticMarkup(
      React.createElement(DesktopMetaDock, { initialOpenPanels: [panelId] })
    );
    const panelTag = markup.match(
      new RegExp(`<div[^>]*id="desktop-meta-panel-${panelId}"[^>]*>`)
    )?.[0];

    expect(panelTag).toBeDefined();
    expect(panelTag).not.toContain("inert=");
    expect(panelTag).not.toContain("aria-hidden=");
  });
});
