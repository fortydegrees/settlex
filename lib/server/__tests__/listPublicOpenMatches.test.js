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

describe("listPublicOpenMatches", () => {
  it("filters out private friend challenges and full matches", async () => {
    const { listPublicOpenMatches } = await loadModule("listPublicOpenMatches.js");
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        matches: [
          {
            matchID: "public_1",
            players: {
              0: { id: 0, name: "Ada" },
              1: { id: 1, name: "" },
            },
          },
          {
            matchID: "public_empty",
            players: {
              0: { id: 0, name: "" },
              1: { id: 1, name: "" },
            },
          },
          {
            matchID: "friend_1",
            players: {
              0: { id: 0, name: "Ada" },
              1: { id: 1, name: "" },
            },
            metadata: {
              setupData: {
                matchKind: "friend_challenge",
              },
            },
          },
          {
            matchID: "full_1",
            players: {
              0: { id: 0, name: "Ada" },
              1: { id: 1, name: "Bert" },
            },
          },
        ],
      })
    );

    const publicMatches = await listPublicOpenMatches({
      fetchImpl,
      baseUrl: "http://game:8080",
    });

    expect(publicMatches).toEqual([
      expect.objectContaining({ matchID: "public_1" }),
      expect.objectContaining({ matchID: "public_empty" }),
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://game:8080/games/catan",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("can filter public open matches by mode id", async () => {
    const { listPublicOpenMatches } = await loadModule("listPublicOpenMatches.js");
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        matches: [
          {
            matchID: "duel_1",
            metadata: { setupData: { modeId: "duel" } },
            players: {
              0: { id: 0, name: "Ada" },
              1: { id: 1, name: "" },
            },
          },
          {
            matchID: "standard_4p_1",
            metadata: { setupData: { modeId: "standard-4p" } },
            players: {
              0: { id: 0, name: "Ada" },
              1: { id: 1, name: "" },
              2: { id: 2, name: "" },
              3: { id: 3, name: "" },
            },
          },
        ],
      })
    );

    const publicMatches = await listPublicOpenMatches({
      fetchImpl,
      baseUrl: "http://game:8080",
      modeId: "duel",
    });

    expect(publicMatches).toEqual([
      expect.objectContaining({ matchID: "duel_1" }),
    ]);
  });
});
