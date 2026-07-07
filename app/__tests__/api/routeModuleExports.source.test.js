import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const routePaths = [
  ["app", "api", "account", "claim", "consume", "route.js"],
  ["app", "api", "account", "claim", "request", "route.js"],
  ["app", "api", "account", "guest", "route.js"],
  ["app", "api", "account", "me", "route.js"],
  ["app", "api", "auth", "[...all]", "route.js"],
  ["app", "api", "auth", "options", "route.js"],
  ["app", "api", "challenges", "[matchID]", "accept", "route.js"],
  ["app", "api", "challenges", "[matchID]", "cancel", "route.js"],
  ["app", "api", "challenges", "[matchID]", "route.js"],
  ["app", "api", "challenges", "create", "route.js"],
  ["app", "api", "matches", "[matchID]", "route.js"],
  ["app", "api", "matches", "create", "route.js"],
  ["app", "api", "matches", "join", "route.js"],
  ["app", "api", "matches", "leave", "route.js"],
  ["app", "api", "matches", "open", "route.js"],
  ["app", "api", "scenarios", "route.js"],
];

const pagePaths = [
  ["app", "challenge", "[matchID]", "page.js"],
  ["app", "replays", "[replayId]", "page.js"],
  ["app", "u", "[username]", "page.js"],
];

const readRouteFile = (segments) =>
  fs.readFileSync(path.join(repoRoot, ...segments), "utf8");

describe("next route modules", () => {
  it("do not export custom route factories from route.js files", () => {
    routePaths.forEach((segments) => {
      const source = readRouteFile(segments);
      expect(source).not.toMatch(/export const create[A-Za-z0-9]+Route\s*=/);
    });
  });

  it("marks api route modules as force-dynamic", () => {
    routePaths.forEach((segments) => {
      const source = readRouteFile(segments);
      expect(source).toContain('export const dynamic = "force-dynamic"');
    });
  });

  it("do not export custom page factories from page.js files", () => {
    pagePaths.forEach((segments) => {
      const source = readRouteFile(segments);
      expect(source).not.toMatch(/export const create[A-Za-z0-9]+Page\s*=/);
    });
  });
});
