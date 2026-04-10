import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("Dev sandbox board shell source", () => {
  it("renders the real game screen with sandbox-safe live-match props", () => {
    const source = read("../dev/sandbox/SandboxBoardShell.js");

    expect(source).toContain("GameScreenWithEffects");
    expect(source).toContain("buildSandboxActivePlayers");
    expect(source).toContain("setActivePlayers");
    expect(source).toContain('matchID="dev-sandbox"');
    expect(source).toContain("isConnected={true}");
    expect(source).toContain("isMultiplayer={false}");
    expect(source).toContain("timerSnapshot={null}");
    expect(source).toContain("disconnectPresence={null}");
    expect(source).toContain("idlePresence={null}");
    expect(source).toContain("matchData={matchMetadata}");
    expect(source).toContain("matchMetadata={matchMetadata}");
  });
});
