import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  fs.readFileSync(
    path.resolve(process.cwd(), `app/replays/components/${name}`),
    "utf8"
  );

describe("ReplayConsole", () => {
  it("ships desktop, collapsed, and mobile replay controls", () => {
    const consoleSource = read("ReplayConsole.jsx");
    const transportSource = read("ReplayTransportControls.jsx");
    expect(consoleSource).toContain('import { Drawer } from "vaul"');
    expect(consoleSource).toContain("ReplayScoreChart");
    expect(consoleSource).toContain("data-replay-console");
    expect(consoleSource).toContain("data-replay-mobile-dock");
    expect(transportSource).toContain("Previous event");
    expect(transportSource).toContain("Next event");
    expect(transportSource).toContain("Previous turn");
    expect(transportSource).toContain("Next turn");
    expect(transportSource).toContain("turnStarts");
    expect(transportSource).toContain("data-replay-turn-marker");
    expect(transportSource).not.toContain("REPLAY_SPEEDS");
    expect(transportSource).not.toContain("Play replay");
    expect(transportSource).not.toContain("Pause replay");
    expect(transportSource).not.toContain("Replay speed");
  });
});
