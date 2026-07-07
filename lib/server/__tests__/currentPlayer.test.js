import { describe, expect, it, vi } from "vitest";

describe("current Better Auth player resolution", () => {
  it("returns null when Better Auth has no current session", async () => {
    const { getCurrentPlayer } = await import("../players/getCurrentPlayer.js");
    const auth = {
      api: {
        getSession: vi.fn(async () => null),
      },
    };

    const result = await getCurrentPlayer({
      auth,
      headers: new Headers(),
      pool: {
        query: vi.fn(),
      },
    });

    expect(result).toBeNull();
  });

  it("maps a Better Auth user and profile row to the legacy account shape used by match routes", async () => {
    const { getCurrentPlayer } = await import("../players/getCurrentPlayer.js");
    const auth = {
      api: {
        getSession: vi.fn(async () => ({
          user: {
            id: "user_123",
            email: "guest@settlehex.local",
            isAnonymous: true,
          },
          session: {
            id: "session_123",
            token: "token_123",
          },
        })),
      },
    };
    const pool = {
      query: vi.fn(async () => ({
        rows: [
          {
            id: "user_123",
            status: "guest",
            currentUsername: "QuietOre9B",
            avatarEmoji: "😇",
            avatarColor: "green",
          },
        ],
      })),
    };

    const result = await getCurrentPlayer({
      auth,
      headers: new Headers({ cookie: "better-auth.session_token=token_123" }),
      pool,
    });

    expect(auth.api.getSession).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("FROM accounts"), [
      "user_123",
    ]);
    expect(result).toEqual({
      user: expect.objectContaining({ id: "user_123", isAnonymous: true }),
      session: expect.objectContaining({ token: "token_123" }),
      account: {
        id: "user_123",
        status: "guest",
        currentUsername: "QuietOre9B",
        avatarEmoji: "😇",
        avatarColor: "green",
      },
    });
  });
});
