import { describe, expect, it } from "vitest";
import { applyReadOnlyDockState } from "../components/useLocalPlayerDockModel";

describe("useLocalPlayerDockModel helpers", () => {
  it("forces every dock capability off in replay", () => {
    expect(
      applyReadOnlyDockState({
        readOnly: true,
        dynamicActions: [{ name: "road", enabled: true }],
        rollEnabled: true,
        endTurnEnabled: true,
      })
    ).toEqual({
      dynamicActions: [{ name: "road", enabled: false }],
      rollEnabled: false,
      endTurnEnabled: false,
    });
  });
});
