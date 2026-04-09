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

afterEach(() => {
  vi.resetModules();
});

describe("friend challenge helpers", () => {
  it("builds friend challenge setup data with inviter metadata", async () => {
    const { buildFriendChallengeSetupData } = await loadModule("friendChallenge.js");

    expect(
      buildFriendChallengeSetupData({
        inviterAccountId: "acct_1",
        inviterSeatId: "1",
        nowIso: "2026-04-09T08:00:00.000Z",
        expiresAtIso: "2026-04-09T08:05:00.000Z",
      })
    ).toMatchObject({
      matchKind: "friend_challenge",
      friendChallenge: {
        inviterAccountId: "acct_1",
        inviterSeatId: "1",
        createdAt: "2026-04-09T08:00:00.000Z",
        expiresAt: "2026-04-09T08:05:00.000Z",
      },
    });
  });
});
