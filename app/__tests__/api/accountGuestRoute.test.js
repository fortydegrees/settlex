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
const logoutRoutePath = path.join(
  repoRoot,
  "app",
  "api",
  "account",
  "logout",
  "handler.js"
);

const loadRoute = async (routePath) => {
  expect(fs.existsSync(routePath)).toBe(true);
  return import(`${pathToFileURL(routePath).href}?t=${Date.now()}`);
};

const createAuth = (sessions) => ({
  api: {
    getSession: vi.fn(async () => {
      const next = Array.isArray(sessions) ? sessions.shift() : sessions;
      return next ?? null;
    }),
    signOut: vi.fn(async () => ({
      headers: new Headers({
        "set-cookie": "better-auth.session_token=; Max-Age=0; Path=/; HttpOnly",
      }),
      response: { success: true },
    })),
  },
});

const createSession = ({ userId = "user_1", isAnonymous = true } = {}) => ({
  user: {
    id: userId,
    isAnonymous,
  },
  session: {
    id: `session_${userId}`,
    token: `token_${userId}`,
  },
});

afterEach(() => {
  vi.resetModules();
});

describe("account guest API route", () => {
  it("requires a Better Auth session before creating a profile", async () => {
    const { createAccountGuestRoute } = await loadRoute(guestRoutePath);
    const { pool } = createFakeAccountsPool();
    const POST = createAccountGuestRoute({ pool, auth: createAuth(null) });

    const response = await POST(
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
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Sign in or start a guest session first.");
  });

  it("creates a guest profile for the current Better Auth user", async () => {
    const { createAccountGuestRoute } = await loadRoute(guestRoutePath);
    const { pool } = createFakeAccountsPool();
    const POST = createAccountGuestRoute({
      pool,
      auth: createAuth(createSession({ userId: "user_ada" })),
    });

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
    expect(json.account.id).toBe("user_ada");
    expect(json.account.status).toBe("guest");
    expect(json.account.currentUsername).toBe("Ada");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("silently rerolls generated username collisions", async () => {
    const { createAccountGuestRoute } = await loadRoute(guestRoutePath);
    const { pool, state } = createFakeAccountsPool();
    const POST = createAccountGuestRoute({
      pool,
      auth: createAuth([
        createSession({ userId: "user_1" }),
        createSession({ userId: "user_2" }),
      ]),
      generateUsername: () => "QuietOre9B",
    });

    await POST(
      new Request("http://localhost/api/account/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "GoldenPort7K",
          avatarEmoji: "😀",
          avatarColor: "sky",
        }),
      })
    );

    const response = await POST(
      new Request("http://localhost/api/account/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "GoldenPort7K",
          usernameSource: "generated",
          avatarEmoji: "😎",
          avatarColor: "amber",
        }),
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.account.id).toBe("user_2");
    expect(json.account.currentUsername).toBe("QuietOre9B");
    expect(state.accounts.map((account) => account.currentUsername)).toEqual([
      "GoldenPort7K",
      "QuietOre9B",
    ]);
  });

  it("updates the current guest account when the session cookie is present", async () => {
    const { createAccountGuestRoute } = await loadRoute(guestRoutePath);
    const { createAccountMeRoute } = await loadRoute(meRoutePath);
    const { pool, state } = createFakeAccountsPool();
    const auth = createAuth([
      createSession({ userId: "user_ada" }),
      createSession({ userId: "user_ada" }),
      createSession({ userId: "user_ada" }),
    ]);
    const POST = createAccountGuestRoute({ pool, auth });
    const GET = createAccountMeRoute({ pool, auth });

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

    const updateResponse = await POST(
      new Request("http://localhost/api/account/guest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      new Request("http://localhost/api/account/me")
    );
    const meJson = await meResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updated.account.id).toBe(created.account.id);
    expect(updated.account.currentUsername).toBe("Ada Lovelace");
    expect(state.accounts).toHaveLength(1);
    expect(state.usernameHistory).toHaveLength(2);
    expect(meJson.account.currentUsername).toBe("Ada Lovelace");
  });

  it("clears the guest session cookie on logout", async () => {
    const { createAccountLogoutRoute } = await loadRoute(logoutRoutePath);
    const auth = createAuth(createSession());
    const POST = createAccountLogoutRoute({ authImpl: auth });

    const response = await POST(
      new Request("http://localhost/api/account/logout", {
        method: "POST",
        headers: {
          cookie: "settlehex_session=selector.token",
        },
      })
    );
    const json = await response.json();
    const setCookie = response.headers.get("set-cookie");

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(auth.api.signOut).toHaveBeenCalledWith({
      headers: expect.any(Headers),
      returnHeaders: true,
    });
    expect(setCookie).toContain("better-auth.session_token=");
    expect(setCookie).toContain("settlehex_session=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("HttpOnly");
  });
});
