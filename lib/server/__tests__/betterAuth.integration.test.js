import { afterAll, describe, expect, it, vi } from "vitest";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { auth as productionAuth } from "../auth/betterAuth.js";
import { resetPoolForTests } from "../db/getPool.js";
import { transferAccountProfile } from "../accounts/transferAccountProfile.js";

// Isolate app-owned profile persistence while exercising the real production
// auth options, anonymous linking hook, cookie signing and session endpoints.
vi.mock("../accounts/transferAccountProfile.js", () => ({
  transferAccountProfile: vi.fn().mockResolvedValue(undefined),
}));

afterAll(resetPoolForTests);
const origin = "http://localhost:3000";
const cookieHeader = (response) => response.headers.getSetCookie()
  .map((cookie) => cookie.split(";")[0]).join("; ");
const createIsolatedAuth = () => {
  const database = { auth_users: [], auth_sessions: [], auth_accounts: [], auth_verifications: [] };
  const auth = betterAuth({ ...productionAuth.options, database: memoryAdapter(database) });
  const request = (path, { body, cookie = "" } = {}) => auth.handler(new Request(`${origin}/api/auth/${path}`, {
    method: body ? "POST" : "GET",
    headers: { origin, "Content-Type": "application/json", cookie },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  return { database, request };
};

describe("production Better Auth configuration with isolated persistence", () => {
  it("creates anonymous sessions in the configured models and resolves their signed cookies", async () => {
    const { database, request } = createIsolatedAuth();
    const guest = await request("sign-in/anonymous", { body: {} });
    expect(guest.status).toBe(200);
    const created = await guest.json();
    expect(created.user.isAnonymous).toBe(true);
    expect(created.user.email).toMatch(/@settlehex\.local$/);
    const cookie = cookieHeader(guest);
    expect(cookie).toContain("better-auth.session_token=");
    const session = await (await request("get-session", { cookie })).json();
    expect(session.user.id).toBe(created.user.id);
    expect(database.auth_users).toHaveLength(1);
    expect(database.auth_sessions).toHaveLength(1);
    expect(await (await request("get-session")).json()).toBeNull();
  });

  it("links a guest profile to email signup, rejects wrong passwords, and revokes sessions on logout", async () => {
    const { request } = createIsolatedAuth();
    const guest = await request("sign-in/anonymous", { body: {} });
    const anonymousId = (await guest.json()).user.id;
    const signup = await request("sign-up/email", {
      cookie: cookieHeader(guest),
      body: { name: "Upgrade Fixture", email: "upgrade-fixture@example.invalid", password: "synthetic-upgrade-password-2026" },
    });
    expect(signup.status).toBe(200);
    const user = (await signup.json()).user;
    expect(user.id).not.toBe(anonymousId);
    expect(user.isAnonymous).toBe(false);
    expect(transferAccountProfile).toHaveBeenCalledWith({ fromAccountId: anonymousId, toAccountId: user.id });
    const wrong = await request("sign-in/email", { body: { email: user.email, password: "incorrect-synthetic-password" } });
    expect(wrong.status).toBe(401);
    const login = await request("sign-in/email", { body: { email: user.email, password: "synthetic-upgrade-password-2026" } });
    expect(login.status).toBe(200);
    const cookie = cookieHeader(login);
    expect((await (await request("get-session", { cookie })).json()).user.id).toBe(user.id);
    expect((await request("sign-out", { cookie, body: {} })).status).toBe(200);
    expect(await (await request("get-session", { cookie })).json()).toBeNull();
  });
});
