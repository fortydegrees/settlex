import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const matchesRoot = path.join(repoRoot, "lib", "server", "matches");

const modulePath = (filename) => path.join(matchesRoot, filename);

const loadModule = async (filename) => {
  const targetPath = modulePath(filename);
  expect(fs.existsSync(targetPath)).toBe(true);
  return import(`${pathToFileURL(targetPath).href}?t=${Date.now()}`);
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

afterEach(() => {
  vi.resetModules();
});

describe("match bootstrap wrappers", () => {
  it("creates a bgio match and joins seat 0 using the current account snapshot", async () => {
    const { createMatchForAccount } = await loadModule("createMatchForAccount.js");
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ matchID: "match_1" }))
      .mockResolvedValueOnce(
        jsonResponse({
          playerID: "0",
          playerCredentials: "secret_123",
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          matchID: "match_1",
          players: [
            {
              id: 0,
              name: "Ada",
              data: {
                participantType: "human",
                accountId: "acct_1",
                usernameSnapshot: "Ada",
                avatarSnapshot: {
                  emoji: "🤠",
                  color: "sky",
                },
              },
            },
          ],
        })
      );

    const result = await createMatchForAccount({
      fetchImpl,
      baseUrl: "http://game:8080",
      account: {
        id: "acct_1",
        currentUsername: "Ada",
        avatarEmoji: "🤠",
        avatarColor: "sky",
      },
      numPlayers: 2,
    });

    expect(result.matchID).toBe("match_1");
    expect(result.playerID).toBe("0");
    expect(result.playerCredentials).toBe("secret_123");
    expect(result.match.players[0].data).toMatchObject({
      participantType: "human",
      accountId: "acct_1",
      usernameSnapshot: "Ada",
    });

    const joinRequest = fetchImpl.mock.calls[1];
    expect(joinRequest[0]).toBe("http://game:8080/games/catan/match_1/join");
    expect(JSON.parse(joinRequest[1].body)).toMatchObject({
      playerID: "0",
      playerName: "Ada",
      data: {
        participantType: "human",
        accountId: "acct_1",
        usernameSnapshot: "Ada",
        avatarSnapshot: {
          emoji: "🤠",
          color: "sky",
        },
      },
    });
  });

  it("creates a bgio match and joins the requested creator seat", async () => {
    const { createMatchForAccount } = await loadModule("createMatchForAccount.js");
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ matchID: "match_friend_1" }))
      .mockResolvedValueOnce(
        jsonResponse({
          playerID: "1",
          playerCredentials: "secret_friend_1",
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          matchID: "match_friend_1",
          players: [
            null,
            {
              id: 1,
              name: "Ada",
              data: {
                participantType: "human",
                accountId: "acct_1",
                usernameSnapshot: "Ada",
                avatarSnapshot: {
                  emoji: "🤠",
                  color: "sky",
                },
              },
            },
          ],
        })
      );

    const result = await createMatchForAccount({
      fetchImpl,
      baseUrl: "http://game:8080",
      account: {
        id: "acct_1",
        currentUsername: "Ada",
        avatarEmoji: "🤠",
        avatarColor: "sky",
      },
      numPlayers: 2,
      creatorSeatId: "1",
      setupData: {
        matchKind: "friend_challenge",
      },
    });

    expect(result.matchID).toBe("match_friend_1");
    expect(result.playerID).toBe("1");
    expect(result.playerCredentials).toBe("secret_friend_1");

    const createRequest = fetchImpl.mock.calls[0];
    expect(JSON.parse(createRequest[1].body)).toMatchObject({
      numPlayers: 2,
      setupData: {
        matchKind: "friend_challenge",
      },
    });

    const joinRequest = fetchImpl.mock.calls[1];
    expect(joinRequest[0]).toBe("http://game:8080/games/catan/match_friend_1/join");
    expect(JSON.parse(joinRequest[1].body)).toMatchObject({
      playerID: "1",
      playerName: "Ada",
    });
  });

  it("joins a bot seat with a bot participant snapshot", async () => {
    const { joinMatchForAccount } = await loadModule("joinMatchForAccount.js");
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        playerID: "1",
        playerCredentials: "bot_secret",
      })
    );

    const result = await joinMatchForAccount({
      fetchImpl,
      baseUrl: "http://game:8080",
      matchID: "match_1",
      playerID: "1",
      participant: {
        participantType: "bot",
        botKey: "puffer",
        usernameSnapshot: "[BOT] 2",
        avatarSnapshot: {
          emoji: "🤖",
          color: "sky",
        },
      },
    });

    expect(result.playerCredentials).toBe("bot_secret");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({
      playerID: "1",
      playerName: "[BOT] 2",
      data: {
        participantType: "bot",
        botKey: "puffer",
        usernameSnapshot: "[BOT] 2",
        isBot: true,
        bot: "puffer",
      },
    });
  });
});
