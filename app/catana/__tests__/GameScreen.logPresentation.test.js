import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen log presentation source", () => {
  it("owns local deferred game-log presentation state", () => {
    const source = fs.readFileSync(screenPath, "utf8");

    expect(source).toContain("gameLogPresentation");
    expect(source).toContain("deferredLogEntries");
    expect(source).toContain("lastSeenGameLogId");
  });

  it("clears deferred entries and watches reconnect state", () => {
    const source = fs.readFileSync(screenPath, "utf8");

    expect(source).toContain("setDeferredLogEntries([])");
    expect(source).toContain("bgioProps.isConnected");
    expect(source).toContain("previousIsConnectedRef");
  });
});
