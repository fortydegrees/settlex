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
  it("keeps playable dev card buttons absolutely stacked inside each group", () => {
    const componentSource = fs.readFileSync(componentPath, "utf8");
    const cssSource = fs.readFileSync(cssPath, "utf8");
    const cardRuleMatch = cssSource.match(/\\.devcard-card\\s*\\{([\\s\\S]*?)\\}/);
    const cardRuleBody = cardRuleMatch?.[1] ?? "";

    expect(componentSource).toContain('"absolute top-0 devcard-card"');
    expect(cardRuleBody).not.toContain("position:");
  });

  it("exposes player-scoped dev card anchor ids for play animations", () => {
    const componentSource = fs.readFileSync(componentPath, "utf8");

    expect(componentSource).toContain("playerId");
    expect(componentSource).toContain("`p${playerId}-devcards`");
    expect(componentSource).toContain("`p${playerId}-devcard-${group.type}`");
  });
});
