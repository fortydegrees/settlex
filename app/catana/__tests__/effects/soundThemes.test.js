import { describe, expect, it } from "vitest";
import { DEFAULT_THEME } from "../../effects/soundThemes";

describe("soundThemes", () => {
  it("routes board-ready game-start through the shared audio manager", () => {
    expect(DEFAULT_THEME["game:start"]).toEqual({
      src: "/sounds/game-start.mp3",
      volume: 0.7,
      allowWhenHidden: true,
    });
  });

  it("uses selected dice-roll-test lead-ins with baseline throw clips for dice rolls", () => {
    expect(DEFAULT_THEME["dice:roll"]).toMatchObject({
      leadIn: {
        variants: [
          "/sounds/dice-roll-test/dice_roll1.mp3",
          "/sounds/dice-roll-test/dice_roll2.mp3",
          "/sounds/dice-roll-test/dice_roll3.mp3",
          "/sounds/dice-roll-test/dice_roll4.mp3"
        ],
        timelineLeadMs: 120
      },
      variants: [
        "/sounds/die-throw-1.mp3",
        "/sounds/die-throw-2.mp3",
        "/sounds/die-throw-3.mp3",
        "/sounds/die-throw-4.mp3"
      ]
    });
  });

  it("maps the SettleHex family cues to their shipped assets", () => {
    expect(DEFAULT_THEME["turn:start"]).toMatchObject({
      src: "/sounds/your-turn.mp3",
      allowWhenHidden: true
    });
    expect(DEFAULT_THEME["turn:end"]).toMatchObject({
      src: "/sounds/turn-end.mp3"
    });
    expect(DEFAULT_THEME["game:win"]).toMatchObject({
      src: "/sounds/game-win.mp3"
    });
    expect(DEFAULT_THEME["award:claim:road"]).toMatchObject({
      src: "/sounds/award-road.mp3"
    });
    expect(DEFAULT_THEME["award:claim:army"]).toMatchObject({
      src: "/sounds/award-army.mp3"
    });
    expect(DEFAULT_THEME["discard:required"]).toMatchObject({
      src: "/sounds/discard-required.mp3",
      allowWhenHidden: true
    });
    expect(DEFAULT_THEME["game:lose"]).toMatchObject({
      src: "/sounds/game-lose.mp3"
    });
    expect(DEFAULT_THEME["resource:blocked"]).toMatchObject({
      src: "/sounds/resource-blocked.mp3"
    });
    expect(DEFAULT_THEME["timer:low"]).toMatchObject({
      src: "/sounds/timer-low.mp3"
    });
    expect(DEFAULT_THEME["timer:critical"]).toMatchObject({
      src: "/sounds/timer-critical.mp3"
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
