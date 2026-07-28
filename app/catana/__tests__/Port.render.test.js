import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Port } from "../Port";

describe("Port rendering", () => {
  it("renders a specific-resource port marker with a 2:1 badge", () => {
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
    expect(markup).toContain(">3:1<");
  });
});
