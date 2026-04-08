import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeAccountsPool } from "../../../lib/server/__tests__/helpers/fakeAccountsPool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const guestRoutePath = path.join(repoRoot, "app", "api", "account", "guest", "handler.js");
const meRoutePath = path.join(repoRoot, "app", "api", "account", "me", "handler.js");

const loadRoute = async (routePath) => {
  expect(fs.existsSync(routePath)).toBe(true);
  return import(`${pathToFileURL(routePath).href}?t=${Date.now()}`);
};

const extractCookiePair = (setCookieHeader) => setCookieHeader.split(";")[0];

afterEach(() => {
  vi.resetModules();
});

describe("account guest API route", () => {
  it("creates a guest account and sets a session cookie", async () => {
    const { createAccountGuestRoute } = await loadRoute(guestRoutePath);
    const { pool } = createFakeAccountsPool();
    const POST = createAccountGuestRoute({ pool });

    const request = new Request("http://localhost/api/account/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Ada",
        avatarEmoji: "🤠",
        avatarColor: "sky",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.account.currentUsername).toBe("Ada");
    expect(response.headers.get("set-cookie")).toContain("settlex_session=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("updates the current guest account when the session cookie is present", async () => {
    const { createAccountGuestRoute } = await loadRoute(guestRoutePath);
    const { createAccountMeRoute } = await loadRoute(meRoutePath);
    const { pool, state } = createFakeAccountsPool();
    const POST = createAccountGuestRoute({ pool });
    const GET = createAccountMeRoute({ pool });

    const createResponse = await POST(
      new Request("http://localhost/api/account/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Ada",
          avatarEmoji: "🤠",
          avatarColor: "sky",
        }),
      })
    );

    const created = await createResponse.json();
    const cookieHeader = extractCookiePair(createResponse.headers.get("set-cookie"));

    const updateResponse = await POST(
      new Request("http://localhost/api/account/guest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieHeader,
        },
        body: JSON.stringify({
          username: "Ada Lovelace",
          avatarEmoji: "🧠",
          avatarColor: "violet",
        }),
      })
    );

    const updated = await updateResponse.json();
    const meResponse = await GET(
      new Request("http://localhost/api/account/me", {
        headers: {
          cookie: cookieHeader,
        },
      })
    );
    const meJson = await meResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updated.account.id).toBe(created.account.id);
    expect(updated.account.currentUsername).toBe("Ada Lovelace");
    expect(state.accounts).toHaveLength(1);
    expect(state.usernameHistory).toHaveLength(2);
    expect(meJson.account.currentUsername).toBe("Ada Lovelace");
  });
});
