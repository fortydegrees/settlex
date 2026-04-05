import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gameScreenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen dev card reveal wiring", () => {
  it("starts the reveal from the authoritative buyDevCardReveal effect for the local player only", () => {
    const source = fs.readFileSync(gameScreenPath, "utf8");

    expect(source).toContain("devCardReveal: () =>");
    expect(source).toContain("const payload = event?.payload");
    expect(source).toContain("String(payload.playerId) !== String(playerID)");
    expect(source).toContain("cardType: payload.cardType");
    expect(source).not.toContain("findBoughtDevCardType");
  });

  it("freezes the local hand and vp badge until the reveal completes", () => {
    const source = fs.readFileSync(gameScreenPath, "utf8");

    expect(source).toContain("getVisibleDevCardsDuringReveal");
    expect(source).toContain("const frozenVpSnapshot =");
    expect(source).toContain(
      "activeDevCardReveal?.vpSnapshot ?? pendingDevCardReveal?.vpSnapshot"
    );
    expect(source).toContain("vpDisplayOverride={frozenVpSnapshot}");
  });
});
