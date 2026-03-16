import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const boardContents = fs.readFileSync(
  path.resolve(__dirname, "..", "Board.js"),
  "utf8"
);

describe("CatanBoard layering", () => {
  it("renders a testable board-underlay marker", async () => {
    const { BoardUnderlay } = await import("../BoardUnderlay");

    const markup = renderToStaticMarkup(
      React.createElement(BoardUnderlay, {
        center: [500, 400],
        size: 100,
        themeId: "classic",
      })
    );

    expect(markup).toContain('data-testid="board-underlay"');
  });

  it("mounts the board underlay before tiles", () => {
    const underlayIndex = boardContents.indexOf("<BoardUnderlay");
    const channelIndex = boardContents.indexOf("<BoardPortChannels");
    const tilesIndex = boardContents.indexOf("{tiles}");

    expect(underlayIndex).toBeGreaterThan(-1);
    expect(channelIndex).toBeGreaterThan(-1);
    expect(tilesIndex).toBeGreaterThan(-1);
    expect(underlayIndex).toBeLessThan(tilesIndex);
    expect(underlayIndex).toBeLessThan(channelIndex);
    expect(channelIndex).toBeLessThan(tilesIndex);
  });

  it("renders placed buildings after the tile and port layer", () => {
    const tilesIndex = boardContents.indexOf("{tiles}");
    const buildingsIndex = boardContents.indexOf("{buildings}");

    expect(tilesIndex).toBeGreaterThan(-1);
    expect(buildingsIndex).toBeGreaterThan(-1);
    expect(tilesIndex).toBeLessThan(buildingsIndex);
  });
});
