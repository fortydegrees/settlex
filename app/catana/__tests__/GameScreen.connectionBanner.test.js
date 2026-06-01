import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen transport connection banner", () => {
  it("tracks the boardgame.io transport connection and debounces the lost-connection banner", () => {
    const contents = fs.readFileSync(screenPath, "utf8");

    expect(contents).toContain("showConnectionBanner");
    expect(contents).toContain("hasSeenTransportConnectionRef");
    expect(contents).toContain("bgioProps.isConnected");
    expect(contents).toContain("setTimeout");
    expect(contents).toContain("1200");
  });

  it("renders lost-connection reconnect copy in a danger banner", () => {
    const contents = fs.readFileSync(screenPath, "utf8");

    expect(contents).toContain("StatusBanner");
    expect(contents).toContain('variant="danger"');
    expect(contents).toContain("Connection lost.");
    expect(contents).toContain("Trying to reconnect");
    expect(contents).toContain("pointer-events-none fixed inset-x-0 top-11 z-30 flex flex-col items-center gap-2 px-14");
    expect(contents).toContain("pointer-events-none fixed inset-x-0 top-10 z-30 flex flex-col items-center gap-3 px-4");
  });
});
