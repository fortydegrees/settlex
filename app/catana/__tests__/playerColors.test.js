import { describe, expect, it } from "vitest";
import {
  PLAYER_COLOR_PICKER_OPTIONS,
  PLAYER_COLOR_OPTIONS,
  getPlayerColorOption,
  getPlayerNameHex
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
      "olive",
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

  it("orders lobby picker swatches with the classic colors first", () => {
    expect(PLAYER_COLOR_PICKER_OPTIONS.map((entry) => entry.id)).toEqual([
      "red",
      "sky",
      "white",
      "orange",
      "green",
      "teal",
      "magenta",
      "purple",
      "maroon",
      "olive",
      "brown",
      "royal",
      "violet",
      "lime",
      "coral",
      "lavender",
      "tan",
      "black",
      "silver",
      "gold"
    ]);
  });

  it("maps legacy lobby ids onto the new canonical palette", () => {
    expect(getPlayerColorOption("blue").id).toBe("sky");
    expect(getPlayerColorOption("cyan").id).toBe("teal");
    expect(getPlayerColorOption("pink").id).toBe("coral");
    expect(getPlayerColorOption("amber").id).toBe("gold");
  });

  it("returns text hex colors for supported ids", () => {
    expect(getPlayerNameHex("orange")).toBeTruthy();
    expect(getPlayerNameHex("purple")).toBeTruthy();
    expect(getPlayerNameHex("silver")).toBeTruthy();
    expect(getPlayerNameHex("gold")).toBeTruthy();
  });

  it("keeps the polished UI swatches aligned with the refined piece palette families", () => {
    expect(getPlayerColorOption("black")).toMatchObject({
      swatch: "bg-[#2f3742] border border-black/20",
      gradient: "from-[#6f7885] to-[#27303a]",
      nameHex: "#2f3742"
    });
    expect(getPlayerColorOption("silver")).toMatchObject({
      swatch: "bg-[#b8bec7] border border-slate-500",
      gradient: "from-[#e8edf2] to-[#8b94a0]",
      nameHex: "#b8bec7"
    });
    expect(getPlayerColorOption("white")).toMatchObject({
      swatch: "bg-[#efece3] border border-slate-400",
      gradient: "from-[#fbfaf5] to-[#d5cec3]",
      nameHex: "#efece3"
    });
    expect(getPlayerColorOption("olive")).toMatchObject({
      swatch: "bg-[#9fb342]",
      gradient: "from-[#d7e28b] to-[#728628]",
      nameHex: "#9fb342"
    });
    expect(getPlayerColorOption("tan")).toMatchObject({
      swatch: "bg-[#c1a07a]",
      gradient: "from-[#e2c8aa] to-[#8e6849]",
      nameHex: "#c1a07a"
    });
    expect(getPlayerColorOption("magenta")).toMatchObject({
      swatch: "bg-[#cf58b0]",
      gradient: "from-[#e89bd3] to-[#973c79]",
      nameHex: "#cf58b0"
    });
  });
});
