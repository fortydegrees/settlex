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
  "PostgameOverlay.js"
);

describe("PostgameOverlay", () => {
  it("resolves canonical player color ids before using them for scoreboard swatches", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain("getPlayerNameHex");
  });

  it("shows the completed summary and replay action without disabled tabs", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain("Watch replay");
    expect(contents).not.toContain("TABS");
    expect(contents).not.toContain("More stats coming soon");
  });

  it("uses the supplied callback for Replay instead of generating a URL", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain("onClick={onWatchReplay}");
    expect(contents).not.toContain("href=");
  });
});
