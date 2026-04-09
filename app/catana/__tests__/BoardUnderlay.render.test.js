import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BoardUnderlay } from "../BoardUnderlay";

describe("BoardUnderlay", () => {
  it("marks the underlay image as high priority for initial board paint", () => {
    const html = renderToStaticMarkup(
      h(BoardUnderlay, {
        center: [0, 0],
        size: 100,
        themeId: "emoji",
      })
    );

    expect(html).toContain('fetchpriority="high"');
  });
});
