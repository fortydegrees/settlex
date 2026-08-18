import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FeedTokenRow } from "../components/FeedTokenRow";

describe("FeedTokenRow", () => {
  it("renders a dev-card token with the shipped card art and readable label", () => {
    const markup = renderToStaticMarkup(
      React.createElement(FeedTokenRow, {
        token: {
          kind: "devCard",
          cardType: "yearOfPlenty",
          label: "Year of Plenty"
        }
      })
    );

    expect(markup).toContain(
      'src="/svgs/cards/development/year_of_plenty.svg"'
    );
    expect(markup).toContain("Year of Plenty");
    expect(markup).toContain('draggable="false"');
  });

  it("renders a robber tile destination as one resource-and-number token", () => {
    const markup = renderToStaticMarkup(
      React.createElement(FeedTokenRow, {
        token: { kind: "tileDestination", resource: "Wood", number: 11 },
        themeId: "emoji"
      })
    );

    expect(markup).toContain(
      'src="/svgs/palette-themes/emoji/icon_wood.svg"'
    );
    expect(markup).toContain('aria-label="Wood tile, number 11"');
    expect(markup).toContain(">11<");
    expect(markup).toContain("••");
  });
});
