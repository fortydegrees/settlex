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
  "DevCardDisplay.js"
);
const cssPath = path.resolve(
  __dirname,
  "..",
  "components",
  "DevCardDisplay.css"
);

describe("DevCardDisplay layout source", () => {
  it("renders grouped dev cards as a dock strip with relative card items", () => {
    const componentSource = fs.readFileSync(componentPath, "utf8");
    const cssSource = fs.readFileSync(cssPath, "utf8");
    const cardRuleMatch = cssSource.match(/\.devcard-card\s*\{([\s\S]*?)\}/);
    const cardRuleBody = cardRuleMatch?.[1] ?? "";

    expect(componentSource).toContain("devcard-dock-track");
    expect(componentSource).toContain("getDockItemMotion");
    expect(cardRuleBody).toContain("position: relative;");
    expect(componentSource).not.toContain('"absolute top-0 devcard-card"');
  });

  it("exposes player-scoped dev card anchor ids for play animations", () => {
    const componentSource = fs.readFileSync(componentPath, "utf8");

    expect(componentSource).toContain("playerId");
    expect(componentSource).toContain("`p${playerId}-devcards`");
    expect(componentSource).toContain("`p${playerId}-devcard-${item.type}`");
  });
});
