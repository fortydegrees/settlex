import { describe, expect, it } from "vitest";
import { findHumanSeatForAccount } from "../matches/humanSeatOwnership.js";

describe("findHumanSeatForAccount", () => {
  it("returns the occupied human seat owned by the account", () => {
    const seat = findHumanSeatForAccount({
      match: {
        players: {
          0: {
            id: 0,
            name: "Ada",
            data: {
              participantType: "human",
              accountId: "acct_1",
            },
          },
          1: { id: 1, name: "" },
        },
      },
      accountId: "acct_1",
    });

    expect(seat).toMatchObject({ id: 0, name: "Ada" });
  });

  it("ignores empty seats and bot participants", () => {
    const match = {
      players: [
        {
          id: 0,
          name: "",
          data: {
            participantType: "human",
            accountId: "acct_1",
            usernameSnapshot: "Ada",
          },
        },
        {
          id: 1,
          name: "Puffer",
          data: {
            participantType: "bot",
            accountId: "acct_1",
          },
        },
      ],
    };

    expect(
      findHumanSeatForAccount({ match, accountId: "acct_1" })
    ).toBeNull();
  });

  it("uses account identity rather than display name", () => {
    const match = {
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: {
            participantType: "human",
            accountId: "acct_1",
          },
        },
        1: { id: 1, name: "" },
      },
    };

    expect(
      findHumanSeatForAccount({ match, accountId: "acct_2" })
    ).toBeNull();
  });

  it("has no ownership state outside the supplied match", () => {
    const occupiedMatch = {
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: {
            participantType: "human",
            accountId: "acct_1",
          },
        },
      },
    };
    const differentMatch = {
      players: {
        0: {
          id: 0,
          name: "Bert",
          data: {
            participantType: "human",
            accountId: "acct_2",
          },
        },
      },
    };

    expect(
      findHumanSeatForAccount({
        match: occupiedMatch,
        accountId: "acct_1",
      })
    ).toMatchObject({ id: 0 });
    expect(
      findHumanSeatForAccount({
        match: differentMatch,
        accountId: "acct_1",
      })
    ).toBeNull();
  });
});
