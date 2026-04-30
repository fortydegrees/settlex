import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("Dev sandbox panel source", () => {
  it("renders the approved sandbox controls", () => {
    const source = read("../dev/sandbox/SandboxPanel.js");

    expect(source).toContain("Dev Sandbox");
    expect(source).toContain("Preset");
    expect(source).toContain("Viewer seat");
    expect(source).toContain("Reset");
    expect(source).toContain("Quick resources");
    expect(source).toContain("Quick dev cards");
    expect(source).toContain("Dev-card effects");
    expect(source).toContain('id: "knight"');
    expect(source).toContain('label: "Knight"');
    expect(source).toContain("Opponent Plays ${card.label}");
    expect(source).toContain("Resolve ${card.label}");
    expect(source).toContain("Reset Dev Visual");
    expect(source).toContain("Collapse");
  });

  it("wires the shell overlay to the real debug moves", () => {
    const source = read("../dev/sandbox/SandboxBoardShell.js");

    expect(source).toContain("SandboxPanel");
    expect(source).toContain("moves.DEBUG_takeCardsFromBank");
    expect(source).toContain("moves.DEBUG_takeDevCards");
    expect(source).toContain("catana:dev-sandbox:devcard-play");
    expect(source).toContain("handleOpponentDevCardPlayStart");
    expect(source).toContain("handleOpponentDevCardPlayResolve");
    expect(source).toContain("handleDevCardPlayReset");
  });
});
