import { describe, expect, it } from "vitest";
import { getTurnControlMode } from "../utils/turnControlMode";

describe("getTurnControlMode", () => {
  it("returns roll when canRoll is true", () => {
    expect(getTurnControlMode({ canRoll: true, canEnd: false })).toBe("roll");
  });

  it("returns endTurn when only canEnd is true", () => {
    expect(getTurnControlMode({ canRoll: false, canEnd: true })).toBe(
      "endTurn"
    );
  });

  it("prefers roll when both canRoll and canEnd are true", () => {
    expect(getTurnControlMode({ canRoll: true, canEnd: true })).toBe("roll");
  });

  it("returns inactive when neither action is available", () => {
    expect(getTurnControlMode({ canRoll: false, canEnd: false })).toBe(
      "inactive"
    );
  });
});
