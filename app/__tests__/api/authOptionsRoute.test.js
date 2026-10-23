import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const routePath = path.join(
  repoRoot,
  "app",
  "api",
  "auth",
  "options",
  "handler.js"
);

const loadRoute = async () => {
  expect(fs.existsSync(routePath)).toBe(true);
  return import(`${pathToFileURL(routePath).href}?t=${Date.now()}`);
};

afterEach(() => {
  vi.resetModules();
});

describe("auth options route", () => {
  it("reports email/password support and only configured social providers", async () => {
    const { createAuthOptionsRoute } = await loadRoute();
    const GET = createAuthOptionsRoute({
      getSocialProviders: () => ({
        discord: { clientId: "discord-id", clientSecret: "discord-secret" },
        google: { clientId: "google-id", clientSecret: "google-secret" },
      }),
    });

    const response = await GET(new Request("http://localhost/api/auth/options"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      emailPassword: true,
      socialProviders: ["discord", "google"],
    });
  });

  it("does not advertise unconfigured social providers", async () => {
    const { createAuthOptionsRoute } = await loadRoute();
    const GET = createAuthOptionsRoute({
      getSocialProviders: () => ({}),
    });

    const response = await GET(new Request("http://localhost/api/auth/options"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.socialProviders).toEqual([]);
  });
});
