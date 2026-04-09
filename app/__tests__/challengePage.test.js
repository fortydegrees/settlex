import fs from "node:fs";
import path from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const modulePath = path.join(
  repoRoot,
  "app",
  "challenge",
  "[matchID]",
  "page-content.js"
);

const loadPageModule = async () => {
  expect(fs.existsSync(modulePath)).toBe(true);
  const href = pathToFileURL(modulePath).href
    .replaceAll("%5B", "[")
    .replaceAll("%5D", "]");
  return import(`${href}?t=${Date.now()}`);
};

describe("/challenge page", () => {
  it("renders the challenge page client with the route match id", async () => {
    const { createChallengePage } = await loadPageModule();
    const ChallengePageClient = ({ matchID }) =>
      h("div", null, `ChallengePageClient ${matchID}`);

    const Page = createChallengePage({
      ChallengePageClient,
    });

    const element = await Page({
      params: { matchID: "match_1" },
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("ChallengePageClient match_1");
  });
});
