import { describe, expect, it } from "vitest";
import { DEFAULT_THEME } from "../../effects/soundThemes";

describe("soundThemes", () => {
  it("uses heavy shake lead-ins with baseline throw clips for dice rolls", () => {
    expect(DEFAULT_THEME["dice:roll"]).toMatchObject({
      leadIn: {
        variants: [
          "/sounds/dice-heavy/dice-shake-1.mp3",
          "/sounds/dice-heavy/dice-shake-2.mp3",
          "/sounds/dice-heavy/dice-shake-3.mp3",
          "/sounds/dice-heavy/dice-shake-4.mp3",
          "/sounds/dice-heavy/dice-shake-5.mp3"
        ]
      },
      variants: [
        "/sounds/die-throw-1.mp3",
        "/sounds/die-throw-2.mp3",
        "/sounds/die-throw-3.mp3",
        "/sounds/die-throw-4.mp3"
      ]
    });
  });

  it("maps Knight dev-card play cues to conservative existing clips", () => {
    expect(DEFAULT_THEME["devcard:knight:play"]).toMatchObject({
      src: "/sounds/card_woosh.mp3"
    });
    expect(DEFAULT_THEME["devcard:knight:flip"]).toMatchObject({
      src: "/sounds/card_woosh.mp3"
    });
    expect(DEFAULT_THEME["devcard:knight:resolve"]).toMatchObject({
      src: "/sounds/card_woosh.mp3"
    });
  });
});
