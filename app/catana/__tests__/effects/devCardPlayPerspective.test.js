import { describe, expect, it } from "vitest";
import {
  DEV_CARD_PLAY_PERSPECTIVES,
  getDevCardPlayMotionPolicy,
  getDevCardPlayPerspective
} from "../../effects/devCardPlayPerspective";

describe("dev card play perspective", () => {
  it("classifies the actor viewer as local", () => {
    expect(
      getDevCardPlayPerspective({ viewerPlayerId: "0", actorPlayerId: "0" })
    ).toBe(DEV_CARD_PLAY_PERSPECTIVES.LOCAL);
  });

  it("classifies another seated viewer as opponent", () => {
    expect(
      getDevCardPlayPerspective({ viewerPlayerId: "1", actorPlayerId: "0" })
    ).toBe(DEV_CARD_PLAY_PERSPECTIVES.OPPONENT);
  });

  it("classifies an unseated viewer as spectator", () => {
    expect(
      getDevCardPlayPerspective({ viewerPlayerId: null, actorPlayerId: "0" })
    ).toBe(DEV_CARD_PLAY_PERSPECTIVES.SPECTATOR);
  });

  it("resolves the animation policy from user and media settings", () => {
    expect(getDevCardPlayMotionPolicy()).toBe("full");
    expect(getDevCardPlayMotionPolicy({ reducedMotion: true })).toBe("reduced");
    expect(getDevCardPlayMotionPolicy({ disabled: true })).toBe("disabled");
  });
});
