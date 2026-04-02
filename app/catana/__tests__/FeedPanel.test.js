import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentPath = path.resolve(
  __dirname,
  "..",
  "components",
  "FeedPanel.js"
);

describe("FeedPanel", () => {
  it("renders a configurable header label and interaction opt-in", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("title");
    expect(contents).toContain("data-allow-interaction=\"true\"");
  });

  it("uses generic feed shell classes", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("feed-panel-scroll");
    expect(contents).toContain("feed-panel-fade");
    expect(contents).toContain("feed-panel-entry");
  });

  it("keeps hover-pause and delayed auto-scroll resume logic", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("AUTO_SCROLL_IDLE_MS");
    expect(contents).toContain("onMouseEnter");
    expect(contents).toContain("onMouseLeave");
    expect(contents).toContain("isHoveringRef");
    expect(contents).toContain("shouldAutoScrollRef");
    expect(contents).toContain("setTimeout");
  });

  it("supports a rows render path or children slot", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("rows");
    expect(contents).toContain("children");
  });
});
