import { describe, expect, it } from "vitest";

import {
  buildCancelPublicMatchmakingRequest,
  buildStartPublicMatchmakingRequest,
} from "../publicMatchmakingClient.js";

const identity = {
  modeId: "duel",
  requestId: "r".repeat(48),
  requestedCredentials: "c".repeat(48),
};

describe("public matchmaking client contract", () => {
  it("uses one server-authoritative endpoint for both start and cancel", () => {
    expect(buildStartPublicMatchmakingRequest(identity)).toEqual({
      route: "/api/matches/matchmake",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(identity),
      },
    });
    expect(buildCancelPublicMatchmakingRequest(identity)).toEqual({
      route: "/api/matches/matchmake",
      init: {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(identity),
      },
    });
  });
});
