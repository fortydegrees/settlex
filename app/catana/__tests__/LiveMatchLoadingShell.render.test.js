import fs from "node:fs";
import path from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const modulePath = path.join(
  repoRoot,
  "app",
  "catana",
  "lobby",
  "[matchID]",
  "LiveMatchLoadingShell.js"
);

const loadModule = async () => {
  expect(fs.existsSync(modulePath)).toBe(true);
  const href = pathToFileURL(modulePath).href
    .replaceAll("%5B", "[")
    .replaceAll("%5D", "]");
  return import(`${href}?t=${Date.now()}`);
};

describe("LiveMatchLoadingShell", () => {
  it("renders the board underlay eagerly for direct game-route boots", async () => {
    const { LiveMatchLoadingShell } = await loadModule();
    const html = renderToStaticMarkup(h(LiveMatchLoadingShell));

    expect(html).toContain("board_underlay_standard.svg");
    expect(html).toContain('fetchpriority="high"');
    expect(html).toContain("Connecting to live match");
  });
});
