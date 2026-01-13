import { describe, it, expect } from "vitest";
import { getVpDisplay } from "../components/PlayerAvatarStatsUtils";

describe("getVpDisplay", () => {
  it("shows public points only for opponents", () => {
    expect(getVpDisplay({ publicPoints: 3, totalPoints: 5, isMe: false }))
      .toBe("3");
  });

  it("shows hidden points for local player", () => {
    expect(getVpDisplay({ publicPoints: 3, totalPoints: 5, isMe: true }))
      .toBe("3 (+2)");
  });
});
