import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(process.cwd(), "app/_features/game/GameScreen.js");

describe("GameScreen idle grace", () => {
  // Snapshot, seed-route and acknowledgement contracts now have executable
  // coverage in matchStatus/MatchStatus.stories.jsx (real React DOM).
  it("keeps disconnect precedence over idle seat state", () => {
    const contents = fs.readFileSync(screenPath, "utf8");

    expect(contents).toContain("disconnectStateByPlayerId");
    expect(contents).toContain("idleStateByPlayerId");
    expect(contents).toContain("?? idleStateByPlayerId");
  });
});
