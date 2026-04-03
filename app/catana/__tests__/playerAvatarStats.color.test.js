import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const playerAvatarStatsPath = path.resolve(
  __dirname,
  "..",
  "components",
  "PlayerAvatarStats.js"
);

describe("PlayerAvatarStats color source", () => {
  it("uses only the resolved player color for the avatar gradient", () => {
    const contents = fs.readFileSync(playerAvatarStatsPath, "utf8");

    expect(contents).not.toContain("chosenColor");
    expect(contents).toContain("getPlayerColorOption(player.color).gradient");
    expect(contents).toContain("\"from-slate-500 to-slate-800\"");
  });
});
