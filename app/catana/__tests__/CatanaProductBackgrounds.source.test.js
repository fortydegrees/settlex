import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PRODUCT_BACKGROUND_FILES = [
  "app/account/AccountPageClient.js",
  "app/board-editor/page.js",
  "app/challenge/[matchID]/ChallengePageClient.js",
  "app/catana/GameScreen.js",
  "app/catana/home/HomeTableClient.js",
  "app/catana/lobby/LobbyPageClient.js",
  "app/catana/lobby/[matchID]/LiveMatchLoadingShell.js",
  "app/catana/lobby/[matchID]/MatchPageClient.js",
  "app/replays/[replayId]/ReplayPageClient.js",
  "app/u/[username]/page-content.js",
];

describe("Catana product background shells", () => {
  it("use the shared light table background instead of stale saturated blue shells", () => {
    const backgroundSource = readFileSync(
      resolve(process.cwd(), "app/catana/theme/backgrounds.js"),
      "utf8"
    );

    expect(backgroundSource).toContain("CATANA_TABLE_BACKGROUND");
    expect(backgroundSource).toContain("#86d0fb");

    for (const filePath of PRODUCT_BACKGROUND_FILES) {
      const source = readFileSync(resolve(process.cwd(), filePath), "utf8");

      expect(source, filePath).toContain("CATANA_TABLE_BACKGROUND");
      expect(source, filePath).not.toContain("from-sky-400 to-blue-600");
      expect(source, filePath).not.toContain("from-sky-400 via-blue-300 to-blue-600");
      expect(source, filePath).not.toContain("#38bdf8,_#2563eb_60%,_#0f172a");
    }
  });
});
