import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const modulePath = path.join(repoRoot, "app", "u", "[username]", "page-content.js");

const loadPageModule = async () => {
  expect(fs.existsSync(modulePath)).toBe(true);
  const href = pathToFileURL(modulePath).href
    .replaceAll("%5B", "[")
    .replaceAll("%5D", "]");
  return import(`${href}?t=${Date.now()}`);
};

describe("public profile page", () => {
  it("loads profile data through getPublicProfile and renders replay links", async () => {
    const { createProfilePage } = await loadPageModule();
    const getPublicProfile = vi.fn().mockResolvedValue({
      account: {
        id: "acct_ada",
        currentUsername: "Ada",
        avatarEmoji: "🤠",
        avatarColor: "sky",
        createdAt: "2026-04-01T12:00:00.000Z",
      },
      summary: {
        totalGames: 3,
        wins: 2,
        losses: 1,
      },
      recentMatches: [
        {
          archivedMatchId: "arch_3",
          replayId: "rpl_3",
          finishedAt: "2026-04-07T18:00:00.000Z",
          gameName: "catan",
          playerCount: 4,
          result: "win",
        },
      ],
    });

    const Page = createProfilePage({
      getPublicProfile,
      notFoundImpl: () => {
        throw new Error("not found");
      },
    });

    const element = await Page({
      params: { username: "Ada" },
    });
    const html = renderToStaticMarkup(element);

    expect(getPublicProfile).toHaveBeenCalledWith("Ada");
    expect(html).toContain("Ada");
    expect(html).toContain("🤠");
    expect(html).toContain("Joined");
    expect(html).toContain("Total games");
    expect(html).toContain("/replays/rpl_3");
  });
});
