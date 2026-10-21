import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const connectionString = process.env.MATCH_ALERT_POSTGRES_URL?.trim();
const withPostgres = connectionString ? describe : describe.skip;
const origin = "http://localhost:3000";
const cookieHeader = (response) => response.headers.getSetCookie()
  .map((cookie) => cookie.split(";")[0]).join("; ");

withPostgres("production Better Auth with PostgreSQL persistence", () => {
  let auth, pool, resetPoolForTests, createGuestAccount, getCurrentPlayer;
  const userIds = [];

  beforeAll(async () => {
    // Use the same explicit test database as the existing PostgreSQL suites.
    // Import only after binding the default pool used by the real link hook.
    vi.stubEnv("DATABASE_URL", connectionString);
    vi.stubEnv("BETTER_AUTH_URL", origin);
    vi.stubEnv("BETTER_AUTH_SECRET", "synthetic-postgres-qualification-secret-2026");
    ({ auth } = await import("../auth/betterAuth.js"));
    const database = await import("../db/getPool.js");
    pool = database.getPool();
    resetPoolForTests = database.resetPoolForTests;
    ({ createGuestAccount } = await import("../accounts/createGuestAccount.js"));
    ({ getCurrentPlayer } = await import("../players/getCurrentPlayer.js"));
  });

  afterAll(async () => {
    try {
      if (pool && userIds.length) {
        await pool.query("DELETE FROM auth_users WHERE id = ANY($1::text[])", [userIds]);
      }
    } finally {
      await resetPoolForTests?.();
      vi.unstubAllEnvs();
    }
  });

  const request = (path, { body, cookie = "" } = {}) => auth.handler(new Request(`${origin}/api/auth/${path}`, {
    method: body ? "POST" : "GET",
    headers: { origin, "Content-Type": "application/json", cookie },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));

  const guest = async () => {
    const response = await request("sign-in/anonymous", { body: {} });
    expect(response.status).toBe(200);
    const { user } = await response.json();
    userIds.push(user.id);
    const username = `Qual_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    await createGuestAccount({ pool, accountId: user.id, username, avatarEmoji: "🧪", avatarColor: "sky" });
    return { user, username, cookie: cookieHeader(response) };
  };

  it("persists guest profiles and isolates signed sessions across clients", async () => {
    const first = await guest();
    const second = await guest();
    expect(first.user.id).not.toBe(second.user.id);
    expect(first.user.isAnonymous).toBe(true);
    for (const client of [first, second]) {
      const current = await getCurrentPlayer({ cookieHeader: client.cookie });
      expect(current.user.id).toBe(client.user.id);
      expect(current.account).toMatchObject({ id: client.user.id, status: "guest", currentUsername: client.username });
      const stored = await pool.query('SELECT "userId" FROM auth_sessions WHERE "userId" = $1', [client.user.id]);
      expect(stored.rows).toEqual([{ userId: client.user.id }]);
    }
    expect(await getCurrentPlayer()).toBeNull();
    const tamperedCookie = first.cookie.replace(/(session_token=)[^;]+/, "$1invalid-signed-token");
    expect(await getCurrentPlayer({ cookieHeader: tamperedCookie })).toBeNull();
  });

  it("links a real guest profile and history, authenticates email, and revokes only the logged-out session", async () => {
    const anonymous = await guest();
    const otherClient = await guest();
    const email = `qualification-${randomUUID()}@example.invalid`;
    const password = "synthetic-postgres-qualification-password";
    const signup = await request("sign-up/email", { cookie: anonymous.cookie, body: { name: "Qualification", email, password } });
    expect(signup.status).toBe(200);
    const { user } = await signup.json();
    userIds.push(user.id);
    expect(user.id).not.toBe(anonymous.user.id);
    expect(user.isAnonymous).toBe(false);
    const signupCookie = cookieHeader(signup);
    const linked = await getCurrentPlayer({ cookieHeader: signupCookie });
    expect(linked.account).toMatchObject({ id: user.id, status: "claimed", currentUsername: anonymous.username });
    const history = await pool.query("SELECT account_id FROM username_history WHERE username = $1", [anonymous.username]);
    expect(history.rows).toEqual([{ account_id: user.id }]);
    expect(await getCurrentPlayer({ cookieHeader: anonymous.cookie })).toBeNull();
    expect((await request("sign-in/email", { body: { email, password: "incorrect-synthetic-password" } })).status).toBe(401);
    const login = await request("sign-in/email", { body: { email, password } });
    expect(login.status).toBe(200);
    const cookie = cookieHeader(login);
    expect((await getCurrentPlayer({ cookieHeader: cookie })).account.id).toBe(user.id);
    expect((await request("sign-out", { cookie, body: {} })).status).toBe(200);
    expect(await getCurrentPlayer({ cookieHeader: cookie })).toBeNull();
    expect((await getCurrentPlayer({ cookieHeader: signupCookie })).account.id).toBe(user.id);
    expect((await getCurrentPlayer({ cookieHeader: otherClient.cookie })).account.id).toBe(otherClient.user.id);
  });
});
