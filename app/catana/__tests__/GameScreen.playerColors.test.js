import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gameScreenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen player color wiring", () => {
  it("uses the conflict-aware effective player color resolver", () => {
    const contents = fs.readFileSync(gameScreenPath, "utf8");

    expect(contents).toContain("resolveEffectivePlayerColors");
    expect(contents).toContain("const effectiveColorByPlayerId = useMemo(");
    expect(contents).toContain("buildPlayerViewMap(core, effectiveColorByPlayerId)");
    expect(contents).toContain("getPlayerColor: (playerId) => effectiveColorByPlayerId[playerId] ?? \"red\"");
    expect(contents).toContain("playerColorMap={effectiveColorByPlayerId}");
    expect(contents).not.toContain("const boardColorMap = useMemo(() => {");
  });
});
