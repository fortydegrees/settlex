import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { FeedTokenRow } from "../feed/FeedTokenRow";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = (relativePath) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("SettleHex UI images", () => {
  it("marks NextImage as non-draggable by default", () => {
    const contents = readFile("app/ui/NextImage.js");
    expect(contents).toMatch(/draggable\s*=\s*false/);
  });

  it("disables dragging on resource bar icons", () => {
    const contents = readFile("app/_features/game/cards/CardIcon.js");
    expect(contents).toMatch(/getResourceIconPath[\s\S]*draggable=\{false\}/);
  });

  it("disables dragging on action dock icons", () => {
    const contents = readFile("app/_features/game/hud/ActionsDock/DockCard.js");
    expect(contents).toMatch(/<img[\s\S]*draggable=\{false\}/);
  });

  it("disables dragging on shared feed token resource icons", () => {
    const markup = renderToStaticMarkup(
      React.createElement(FeedTokenRow, {
        token: { kind: "resource", resource: "Wood" },
        themeId: "emoji",
      })
    );

    expect(markup).toContain('draggable="false"');
    expect(markup).toContain('title="Wood"');
  });

  it("disables dragging on trade/discard modal icons", () => {
    const contents = readFile("app/_features/game/dialogs/TradeDiscardModal.js");
    expect(contents).toMatch(/<img[\s\S]*draggable=\{false\}/);
  });
});
