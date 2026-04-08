import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const modulePath = path.join(
  repoRoot,
  "lib",
  "server",
  "matches",
  "getMatchPageData.js"
);

const loadGetMatchPageData = async () => {
  expect(fs.existsSync(modulePath)).toBe(true);
  const href = pathToFileURL(modulePath).href;
  const importedModule = await import(`${href}?t=${Date.now()}`);
  return importedModule.getMatchPageData;
};

const okJson = (payload) => ({
  ok: true,
  async json() {
    return payload;
  },
});

describe("getMatchPageData", () => {
  it("resolves live matches from the game server without consulting the archive", async () => {
    const getMatchPageData = await loadGetMatchPageData();
    const fetchImpl = vi.fn().mockResolvedValue(
      okJson({
        matchID: "m1",
        players: [{ id: 0, name: "Ada" }],
      })
    );
    const getArchivedMatchByMatchId = vi.fn();

    const result = await getMatchPageData("m1", {
      fetchImpl,
      baseUrl: "http://game:8000",
      getArchivedMatchByMatchId,
    });

    expect(result).toEqual({
      kind: "live",
      matchID: "m1",
      liveMatch: {
        matchID: "m1",
        players: [{ id: 0, name: "Ada" }],
      },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://game:8000/games/catan/m1",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
    expect(getArchivedMatchByMatchId).not.toHaveBeenCalled();
  });

  it("falls back to archived match data when the live match no longer exists", async () => {
    const getMatchPageData = await loadGetMatchPageData();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    const getArchivedMatchByMatchId = vi.fn().mockResolvedValue({
      match: {
        archivedMatchId: "arch_1",
        bgioMatchId: "m1",
        replayId: "r1",
      },
      participants: [],
      initialState: { G: {}, ctx: { gameover: null } },
      finalState: { G: {}, ctx: { gameover: { winner: "0" } } },
      log: [],
      chatMessages: [],
    });

    const result = await getMatchPageData("m1", {
      fetchImpl,
      baseUrl: "http://game:8000",
      getArchivedMatchByMatchId,
    });

    expect(result).toEqual({
      kind: "archived",
      matchID: "m1",
      archivedMatch: expect.objectContaining({
        match: expect.objectContaining({
          archivedMatchId: "arch_1",
        }),
      }),
    });
    expect(getArchivedMatchByMatchId).toHaveBeenCalledWith("m1");
  });

  it("returns missing when neither live nor archived data exists", async () => {
    const getMatchPageData = await loadGetMatchPageData();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    const getArchivedMatchByMatchId = vi.fn().mockResolvedValue(null);

    const result = await getMatchPageData("m1", {
      fetchImpl,
      baseUrl: "http://game:8000",
      getArchivedMatchByMatchId,
    });

    expect(result).toEqual({
      kind: "missing",
      matchID: "m1",
    });
  });
});
