import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const containerPath = path.resolve(
  __dirname,
  "..",
  "components",
  "PlayerActionContainer.js"
);

describe("PlayerActionContainer dev card reveal source", () => {
  it("captures the pre-buy hand and vp snapshot before triggering the move", () => {
    const source = fs.readFileSync(containerPath, "utf8");

    expect(source).toContain("getVictoryPoints");
    expect(source).toContain("getPublicVictoryPoints");
    expect(source).toContain(
      "beforeCards: Array.isArray(player.devCards) ? [...player.devCards] : []"
    );
    expect(source).toContain("vpSnapshot: {");
    expect(source).toContain("moves.buyDevCard()");
  });

  it("passes an optional vp override into PlayerAvatarStats", () => {
    const source = fs.readFileSync(containerPath, "utf8");

    expect(source).toContain("vpDisplayOverride");
    expect(source).toContain("<PlayerAvatarStats");
  });
});
