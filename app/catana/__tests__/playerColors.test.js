import { describe, expect, it } from "vitest";
import {
  PLAYER_COLOR_OPTIONS,
  getPlayerColorOption,
  getPlayerNameHex
} from "../theme/playerColors";

describe("playerColors", () => {
  it("exposes all supported lobby color ids", () => {
    expect(PLAYER_COLOR_OPTIONS.map((entry) => entry.id)).toEqual([
      "red",
      "blue",
      "green",
      "orange",
      "purple",
      "pink",
      "cyan",
      "amber"
    ]);
  });

  it("returns fallback option for unknown ids", () => {
    expect(getPlayerColorOption("unknown").id).toBe("red");
  });

  it("returns text hex colors for supported ids", () => {
    expect(getPlayerNameHex("orange")).toBeTruthy();
    expect(getPlayerNameHex("purple")).toBeTruthy();
  });
});
