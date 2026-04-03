import { describe, expect, it } from "vitest";
import {
  PLAYER_COLOR_OPTIONS,
  getPlayerColorOption,
  getPlayerNameHex,
  normalizePlayerColorId
} from "../theme/playerColors";

describe("playerColors", () => {
  it("exposes all supported lobby color ids", () => {
    expect(PLAYER_COLOR_OPTIONS.map((entry) => entry.id)).toEqual([
      "red",
      "sky",
      "green",
      "teal",
      "orange",
      "magenta",
      "purple",
      "maroon",
      "brown",
      "royal",
      "violet",
      "lime",
      "coral",
      "lavender",
      "tan",
      "black",
      "white",
      "silver",
      "gold"
    ]);
  });

  it("returns fallback option for unknown ids", () => {
    expect(getPlayerColorOption("unknown").id).toBe("red");
  });

  it("maps legacy lobby ids onto the new canonical palette", () => {
    expect(getPlayerColorOption("blue").id).toBe("sky");
    expect(getPlayerColorOption("cyan").id).toBe("teal");
    expect(getPlayerColorOption("pink").id).toBe("coral");
    expect(getPlayerColorOption("amber").id).toBe("gold");
    expect(getPlayerColorOption("olive").id).toBe("lime");
    expect(normalizePlayerColorId("olive")).toBe("lime");
  });

  it("retires olive from the live lobby palette", () => {
    expect(PLAYER_COLOR_OPTIONS.map((entry) => entry.id)).not.toContain("olive");
  });

  it("returns text hex colors for supported ids", () => {
    expect(getPlayerNameHex("orange")).toBeTruthy();
    expect(getPlayerNameHex("purple")).toBeTruthy();
    expect(getPlayerNameHex("silver")).toBeTruthy();
    expect(getPlayerNameHex("gold")).toBeTruthy();
  });
});
