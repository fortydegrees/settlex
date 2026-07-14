import { describe, expect, it } from "vitest";
import { getReplayMobileDockClassName } from "../replays/components/replayPanelLayout";

describe("replay mobile dock placement", () => {
  it("stays at the bottom for Board perspective", () => {
    const className = getReplayMobileDockClassName(null);
    expect(className).toContain("bottom-3");
    expect(className).not.toContain("17.375rem");
  });

  it("clears the maximum expanded seated cockpit and dev-card tray", () => {
    const className = getReplayMobileDockClassName("1");
    expect(className).toContain("17.375rem");
    expect(className).toContain("16.775rem");
    expect(className).not.toContain("bottom-3");
  });
});
