import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("GameScreen dice effects wiring", () => {
  it("shares the effects bus with GameEffects and PlayerActionContainer", () => {
    const path = fileURLToPath(
      new URL("../GameScreen.js", import.meta.url)
    );
    const source = fs.readFileSync(path, "utf8");
    expect(source).toContain("createEffectBus");
    expect(source).toContain("<GameEffects");
    expect(source).toContain("effectsBus={effectsBus}");
    expect(source).toContain("<PlayerActionContainer");
    expect(source).toContain("effectsBus={effectsBus}");
    expect(source).toContain("<MobilePlayerCockpit");
    const mobileCockpitIndex = source.indexOf("<MobilePlayerCockpit");
    const mobileCockpitEndIndex = source.indexOf("/>", mobileCockpitIndex);
    const mobileCockpitSnippet = source.slice(
      mobileCockpitIndex,
      mobileCockpitEndIndex
    );
    expect(mobileCockpitSnippet).toContain("effectsBus={effectsBus}");
  });
});
