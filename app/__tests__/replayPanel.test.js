import { describe, expect, it } from "vitest";
import { getReplayMobileDockClassName } from "../replays/components/replayPanelLayout";

describe("replay mobile dock placement", () => {
  it("stays at the bottom for Board perspective", () => {
    const className = getReplayMobileDockClassName(null);
    expect(className).toContain("bottom-3");
    expect(className).not.toContain("12.75rem");
  });

  it("clears the seated player cockpit and command row", () => {
    const className = getReplayMobileDockClassName("1");
    expect(className).toContain("12.75rem");
    expect(className).toContain("12.15rem");
    expect(className).not.toContain("bottom-3");
  });
});
