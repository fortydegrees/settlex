import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen idle grace", () => {
  it("reads pushed idle presence snapshots and derives active idle state", () => {
    const contents = fs.readFileSync(screenPath, "utf8");

    expect(contents).toContain("bgioProps.idlePresence");
    expect(contents).toContain("bgioProps.idleServerTimeMs");
    expect(contents).toContain("readIdlePresenceSnapshot");
    expect(contents).toContain("getActiveIdleStateByPlayerId");
  });

  it("shows the local idle prompt modal only for the affected player and uses credentials for acknowledge", () => {
    const contents = fs.readFileSync(screenPath, "utf8");

    expect(contents).toContain("IdlePromptModal");
    expect(contents).toContain("activeIdlePlayerId");
    expect(contents).toContain("bgioProps.credentials");
    expect(contents).toContain("/idle/");
    expect(contents).toContain("/ack");
  });

  it("keeps disconnect precedence over idle seat state", () => {
    const contents = fs.readFileSync(screenPath, "utf8");

    expect(contents).toContain("disconnectStateByPlayerId");
    expect(contents).toContain("idleStateByPlayerId");
    expect(contents).toContain("?? idleStateByPlayerId");
  });
});
