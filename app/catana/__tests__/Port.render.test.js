import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Port } from "../Port";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const portCss = fs.readFileSync(path.resolve(__dirname, "..", "Port.css"), "utf8");

describe("Port rendering", () => {
  it("renders a specific-resource port marker with a 2:1 badge and two connectors", () => {
    const markup = renderToStaticMarkup(
      React.createElement(Port, {
        coordinate: [0, 0, 0],
        size: 100,
        boardCenter: [500, 400],
        tile: { id: 19, direction: "EAST", resource: "Ore", nodes: [48, 49] },
        themeId: "emoji",
      })
    );

    expect(markup.match(/data-testid="port-layer"/g) ?? []).toHaveLength(1);
    expect(markup.match(/data-testid="port-marker"/g) ?? []).toHaveLength(1);
    expect(markup.match(/data-testid="port-badge"/g) ?? []).toHaveLength(1);
    expect(markup).toContain('src="/svgs/palette-themes/emoji/port_icon_ore.svg"');
    expect(markup).toContain(">2:1<");
    expect(markup.match(/data-testid="port-connector"/g) ?? []).toHaveLength(0);
  });

  it("renders a generic port with a 3:1 badge", () => {
    const markup = renderToStaticMarkup(
      React.createElement(Port, {
        coordinate: [0, 0, 0],
        size: 100,
        boardCenter: [500, 400],
        tile: { id: 20, direction: "WEST", resource: "Any", nodes: [24, 10] },
        themeId: "emoji",
      })
    );

    expect(markup.match(/data-testid="port-marker"/g) ?? []).toHaveLength(1);
    expect(markup.match(/data-testid="port-badge"/g) ?? []).toHaveLength(1);
    expect(markup.match(/data-testid="port-connector"/g) ?? []).toHaveLength(0);
    expect(markup).toContain('src="/svgs/palette-themes/emoji/port_icon_any.svg"');
    expect(markup).not.toContain("portMarkerGenericGlyph");
    expect(markup).toContain(">3:1<");
  });

  it("scales the exchange-rate label font size from the board tile size", () => {
    const largeMarkup = renderToStaticMarkup(
      React.createElement(Port, {
        coordinate: [0, 0, 0],
        size: 100,
        boardCenter: [500, 400],
        tile: { id: 21, direction: "EAST", resource: "Ore", nodes: [48, 49] },
        themeId: "emoji",
      })
    );
    const smallMarkup = renderToStaticMarkup(
      React.createElement(Port, {
        coordinate: [0, 0, 0],
        size: 50,
        boardCenter: [500, 400],
        tile: { id: 22, direction: "WEST", resource: "Any", nodes: [24, 10] },
        themeId: "emoji",
      })
    );

    expect(largeMarkup).toContain('font-size:14px');
    expect(smallMarkup).toContain('font-size:7px');
    expect(largeMarkup).not.toContain('font-size:0.85rem');
    expect(smallMarkup).not.toContain('font-size:0.85rem');
  });

  it("layers the marker below the badge and leaves board pieces above the whole port layer", () => {
    expect(portCss).toMatch(/\.portLayer\s*\{[\s\S]*z-index:\s*0;/);
    expect(portCss).toMatch(/\.portMarker\s*\{[\s\S]*z-index:\s*1;/);
    expect(portCss).toMatch(/\.portBadge\s*\{[\s\S]*z-index:\s*3;/);
  });

  it("keeps the port icon footprint slightly smaller within the marker", () => {
    expect(portCss).toMatch(/\.portMarkerIcon\s*\{[\s\S]*width:\s*46%;[\s\S]*height:\s*46%;/);
    expect(portCss).toMatch(/\.portMarkerGenericGlyph\s*\{[\s\S]*width:\s*40%;[\s\S]*height:\s*20%;/);
  });
});
