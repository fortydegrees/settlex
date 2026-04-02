import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FeedPanel } from "../components/FeedPanel";

describe("FeedPanel", () => {
  it("renders the shared shell markup for rows", () => {
    const markup = renderToStaticMarkup(
      React.createElement(FeedPanel, {
        title: "Inbox",
        rows: [{ key: "row-1", label: "Hello" }],
        renderRow: (row) => React.createElement("span", null, row.label),
      })
    );

    expect(markup).toContain("Inbox");
    expect(markup).toContain('data-allow-interaction="true"');
    expect(markup).toContain("feed-panel-scroll");
    expect(markup).toContain("feed-panel-fade");
    expect(markup).toContain("feed-panel-entry");
    expect(markup).toContain("Hello");
  });

  it("renders footer content inside the same panel shell", () => {
    const markup = renderToStaticMarkup(
      React.createElement(FeedPanel, {
        title: "Inbox",
        rows: [{ key: "row-1", label: "Hello" }],
        renderRow: (row) => React.createElement("span", null, row.label),
        footer: React.createElement(
          "form",
          { "data-footer": "true" },
          React.createElement("input", {
            type: "text",
            placeholder: "Message…",
          })
        ),
      })
    );

    expect(markup).toContain("Hello");
    expect(markup).toContain('data-footer="true"');
    expect(markup).toContain('placeholder="Message…"');
  });

  it("ignores unsupported raw children content", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        FeedPanel,
        {
          title: "Inbox",
          rows: [],
        },
        React.createElement("span", null, "should not render")
      )
    );

    expect(markup).toContain("Inbox");
    expect(markup).not.toContain("should not render");
  });
});
