import { describe, expect, it } from "vitest";

const loadHelper = async () =>
  import("../interruptedDuel.js").catch(() => ({}));

const waitingDuel = {
  matchID: "interrupted-duel",
  players: [
    { id: 0, name: "" },
    {
      id: 1,
      name: "Joiner",
      data: { participantType: "human", accountId: "joiner-account" },
    },
  ],
};

describe("interrupted credentialed duel", () => {
  it("detects an incomplete two-seat duel owned by the current credentialed seat", async () => {
    const { isInterruptedCredentialedDuel } = await loadHelper();
    expect(isInterruptedCredentialedDuel).toBeTypeOf("function");
    expect(
      isInterruptedCredentialedDuel({
        match: waitingDuel,
        playerID: "1",
        credentials: "joiner-secret",
      })
    ).toBe(true);
  });

  it("does not interrupt a full duel, an open current seat, or a visitor", async () => {
    const { isInterruptedCredentialedDuel } = await loadHelper();
    const fullDuel = {
      ...waitingDuel,
      players: [
        { id: 0, name: "Seeker" },
        waitingDuel.players[1],
      ],
    };

    expect(
      isInterruptedCredentialedDuel({
        match: fullDuel,
        playerID: "1",
        credentials: "joiner-secret",
      })
    ).toBe(false);
    expect(
      isInterruptedCredentialedDuel({
        match: waitingDuel,
        playerID: "0",
        credentials: "stale-secret",
      })
    ).toBe(false);
    expect(
      isInterruptedCredentialedDuel({
        match: waitingDuel,
        playerID: "1",
        credentials: null,
      })
    ).toBe(false);
  });

  it("leaves friend challenges and bot matches to their own lifecycle", async () => {
    const { isInterruptedCredentialedDuel } = await loadHelper();

    for (const matchKind of ["friend_challenge", "bot_game"]) {
      expect(
        isInterruptedCredentialedDuel({
          match: {
            ...waitingDuel,
            metadata: { setupData: { matchKind } },
          },
          playerID: "1",
          credentials: "joiner-secret",
        })
      ).toBe(false);
    }
  });
});
