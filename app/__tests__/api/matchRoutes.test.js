import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const routePath = (...segments) =>
  path.join(repoRoot, "app", "api", "matches", ...segments);

const loadRoute = async (...segments) => {
  const targetPath = routePath(...segments);
  expect(fs.existsSync(targetPath)).toBe(true);
  const href = pathToFileURL(targetPath).href
    .replaceAll("%5B", "[")
    .replaceAll("%5D", "]");
  return import(`${href}?t=${Date.now()}`);
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

describe("match API routes", () => {
  it("requires a current session for create and returns seat credentials from the wrapper layer", async () => {
    const { createMatchCreateRoute } = await loadRoute("create", "route.js");
    const getSessionAccount = vi.fn();
    const createMatchForAccount = vi.fn();
    const POST = createMatchCreateRoute({
      getSessionAccount,
      createMatchForAccount,
    });

    const unauthorized = await POST(
      new Request("http://localhost/api/matches/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numPlayers: 2 }),
      })
    );
    expect(unauthorized.status).toBe(401);
    expect(createMatchForAccount).not.toHaveBeenCalled();

    getSessionAccount.mockResolvedValue({
      account: {
        id: "acct_1",
        currentUsername: "Ada",
        avatarEmoji: "🤠",
        avatarColor: "sky",
      },
    });
    createMatchForAccount.mockResolvedValue({
      matchID: "match_1",
      playerID: "0",
      playerCredentials: "secret_123",
    });

    const authorized = await POST(
      new Request("http://localhost/api/matches/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "settlex_session=a.b" },
        body: JSON.stringify({ numPlayers: 2 }),
      })
    );
    const json = await authorized.json();

    expect(authorized.status).toBe(200);
    expect(createMatchForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        account: expect.objectContaining({ id: "acct_1" }),
        numPlayers: 2,
      })
    );
    expect(json.playerCredentials).toBe("secret_123");
  });

  it("requires a current session for join and leave, and proxies match metadata reads", async () => {
    const { createMatchJoinRoute } = await loadRoute("join", "route.js");
    const { createMatchLeaveRoute } = await loadRoute("leave", "route.js");
    const { createMatchDetailsRoute } = await loadRoute("[matchID]", "route.js");

    const getSessionAccount = vi.fn();
    const joinMatchForAccount = vi.fn();
    const leaveMatchForAccount = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        matchID: "match_1",
        players: [{ id: 0, name: "Ada" }],
      })
    );

    const JOIN = createMatchJoinRoute({
      getSessionAccount,
      joinMatchForAccount,
    });
    const LEAVE = createMatchLeaveRoute({
      getSessionAccount,
      leaveMatchForAccount,
    });
    const GET = createMatchDetailsRoute({
      fetchImpl,
      baseUrl: "http://game:8080",
    });

    const unauthorizedJoin = await JOIN(
      new Request("http://localhost/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchID: "match_1", playerID: "1" }),
      })
    );
    expect(unauthorizedJoin.status).toBe(401);

    getSessionAccount.mockResolvedValue({
      account: {
        id: "acct_1",
        currentUsername: "Ada",
        avatarEmoji: "🤠",
        avatarColor: "sky",
      },
    });
    joinMatchForAccount.mockResolvedValue({
      playerID: "1",
      playerCredentials: "secret_join",
    });
    leaveMatchForAccount.mockResolvedValue({
      matchID: "match_1",
      playerID: "1",
      left: true,
    });

    const joinResponse = await JOIN(
      new Request("http://localhost/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "settlex_session=a.b" },
        body: JSON.stringify({ matchID: "match_1", playerID: "1" }),
      })
    );
    const leaveResponse = await LEAVE(
      new Request("http://localhost/api/matches/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "settlex_session=a.b" },
        body: JSON.stringify({
          matchID: "match_1",
          playerID: "1",
          credentials: "secret_join",
        }),
      })
    );
    const detailsResponse = await GET(
      new Request("http://localhost/api/matches/match_1"),
      { params: { matchID: "match_1" } }
    );

    expect(joinResponse.status).toBe(200);
    expect(leaveResponse.status).toBe(200);
    expect(joinMatchForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        account: expect.objectContaining({ id: "acct_1" }),
        matchID: "match_1",
        playerID: "1",
      })
    );
    expect(leaveMatchForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        account: expect.objectContaining({ id: "acct_1" }),
        credentials: "secret_join",
      })
    );

    const detailsJson = await detailsResponse.json();
    expect(detailsJson.matchID).toBe("match_1");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://game:8080/games/catan/match_1",
      expect.objectContaining({ method: "GET" })
    );
  });
});
