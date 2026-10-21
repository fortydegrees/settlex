import { describe, expect, it } from "vitest";
import {
  colorsConflict,
  resolveEffectivePlayerColors
} from "../utils/playerColorsInGame";

describe("playerColorsInGame", () => {
  it("treats exact duplicate colors as conflicts", () => {
    expect(
      resolveEffectivePlayerColors({
        playerIds: ["0", "1"],
        preferredColorByPlayerId: { "0": "red", "1": "red" }
      })
    ).toEqual({ "0": "red", "1": "sky" });
  });

  it("treats approved near-clash groups as conflicts", () => {
    expect(colorsConflict("lavender", "violet")).toBe(true);
    expect(colorsConflict("lavender", "magenta")).toBe(true);
    expect(colorsConflict("purple", "violet")).toBe(true);
    expect(colorsConflict("purple", "magenta")).toBe(true);
    expect(colorsConflict("red", "coral")).toBe(true);
  });

  it("allows violet and magenta together", () => {
    expect(colorsConflict("violet", "magenta")).toBe(false);
    expect(
      resolveEffectivePlayerColors({
        playerIds: ["0", "1"],
        preferredColorByPlayerId: { "0": "violet", "1": "magenta" }
      })
    ).toEqual({ "0": "violet", "1": "magenta" });
  });

  it("reassigns later seats when approved conflict groups collide", () => {
    expect(
      resolveEffectivePlayerColors({
        playerIds: ["0", "1"],
        preferredColorByPlayerId: { "0": "lavender", "1": "purple" }
      })
    ).toEqual({ "0": "lavender", "1": "red" });
  });

  it("never returns olive after olive is retired", () => {
    expect(
      resolveEffectivePlayerColors({
        playerIds: ["0", "1"],
        preferredColorByPlayerId: { "0": "olive", "1": "lime" }
      })
    ).toEqual({ "0": "lime", "1": "red" });
  });
});
