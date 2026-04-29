import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const readGameScreen = () =>
  fs.readFileSync(
    fileURLToPath(new URL("../GameScreen.js", import.meta.url)),
    "utf8"
  );

describe("GameScreen dev card play animation wiring", () => {
  it("creates the Knight dev-card play runner with perspective and display callbacks", () => {
    const source = readGameScreen();

    expect(source).toContain("createDevCardPlayRunner");
    expect(source).toContain("getDevCardPlayPerspective");
    expect(source).toContain("freezeKnightDisplayFromPayload");
    expect(source).toContain("releaseKnightDisplayFromPayload");
    expect(source).toContain("devCardPlay");
  });

  it("supports dev-sandbox synthetic Knight start, resolve, and reset events", () => {
    const source = readGameScreen();

    expect(source).toContain("catana:dev-sandbox:devcard-play");
    expect(source).toContain("devcard:play:start");
    expect(source).toContain("devcard:play:resolve");
    expect(source).toContain("clearDevCardPlayActors");
  });
});
