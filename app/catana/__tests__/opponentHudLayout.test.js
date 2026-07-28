import { describe, expect, it } from "vitest";
import { getOpponentHudLayout } from "../utils/opponentHudLayout";

const players = [
  { id: "0", name: "Bottom" },
  { id: "1", name: "Top" },
  { id: "2", name: "Third" }
];

describe("getOpponentHudLayout", () => {
  it("places the first stable seat at the bottom for a neutral desktop duel", () => {
    expect(
      getOpponentHudLayout({
        opponents: players.slice(0, 2),
        isNeutralViewer: true,
        isPhoneLayout: false
      })
    ).toEqual({
      topOpponents: [players[1]],
      bottomOpponent: players[0]
    });
  });

  it("keeps seated and multiplayer desktop opponent rows unchanged", () => {
    expect(
      getOpponentHudLayout({
        opponents: players.slice(0, 2),
        isNeutralViewer: false,
        isPhoneLayout: false
      })
    ).toEqual({
      topOpponents: players.slice(0, 2),
      bottomOpponent: null
    });

    expect(
      getOpponentHudLayout({
        opponents: players,
        isNeutralViewer: true,
        isPhoneLayout: false
      })
    ).toEqual({ topOpponents: players, bottomOpponent: null });
  });

  it("preserves the existing one-box phone presentation", () => {
    expect(
      getOpponentHudLayout({
        opponents: players.slice(0, 2),
        isNeutralViewer: true,
        isPhoneLayout: true
      })
    ).toEqual({ topOpponents: [players[0]], bottomOpponent: null });
  });
});
