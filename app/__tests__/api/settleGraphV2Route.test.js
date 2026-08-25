import { describe, expect, it, vi } from "vitest";
import { createMatchCreateRoute } from "../../api/matches/create/handler.js";

const accountSession = {
  account: { id: "acct_1", currentUsername: "Ada" }
};

const botRequest = () => new Request("http://localhost/api/matches/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    modeId: "duel",
    opponentType: "bot",
    botKey: "settlegraph-v2"
  })
});

describe("SettleGraph V2 create route", () => {
  it("threads an enabled V2 bot key into isolated bot-match creation", async () => {
    const createBotMatchForAccount = vi.fn().mockResolvedValue({
      matchID: "v2_match",
      playerID: "0",
      playerCredentials: "secret"
    });
    const POST = createMatchCreateRoute({
      getSessionAccount: vi.fn().mockResolvedValue(accountSession),
      createBotMatchForAccount,
      createMatchForAccount: vi.fn(),
      isBotEnabled: vi.fn().mockReturnValue(true)
    });

    const response = await POST(botRequest());

    expect(response.status).toBe(200);
    expect(createBotMatchForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        botKey: "settlegraph-v2",
        numPlayers: 2,
        setupData: expect.objectContaining({ modeId: "duel", rulesetId: "duel" })
      })
    );
  });

  it("fails closed when V2 is not enabled on the server", async () => {
    const createBotMatchForAccount = vi.fn();
    const POST = createMatchCreateRoute({
      getSessionAccount: vi.fn().mockResolvedValue(accountSession),
      createBotMatchForAccount,
      isBotEnabled: vi.fn().mockReturnValue(false)
    });

    const response = await POST(botRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "SettleGraph V2 is not enabled on this server."
    });
    expect(createBotMatchForAccount).not.toHaveBeenCalled();
  });
});
