import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeAccountsPool } from "./helpers/fakeAccountsPool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const accountsRoot = path.join(repoRoot, "lib", "server", "accounts");

const modulePath = (filename) => path.join(accountsRoot, filename);

const loadModule = async (filename) => {
  const targetPath = modulePath(filename);
  expect(fs.existsSync(targetPath)).toBe(true);
  return import(`${pathToFileURL(targetPath).href}?t=${Date.now()}`);
};

afterEach(() => {
  vi.resetModules();
});

describe("guest account services", () => {
  it("creates a guest account, username history row, and guest session together", async () => {
    const { createGuestAccount } = await loadModule("createGuestAccount.js");
    const { pool, client, state } = createFakeAccountsPool();

    const result = await createGuestAccount({
      pool,
      username: "  Ada   Lovelace  ",
      avatarEmoji: "🤠",
      avatarColor: "sky",
    });

    expect(result.account.status).toBe("guest");
    expect(result.account.currentUsername).toBe("Ada Lovelace");
    expect(result.account.avatarEmoji).toBe("🤠");
    expect(result.account.avatarColor).toBe("sky");
    expect(result.session.selector).toBeTypeOf("string");
    expect(result.session.token).toBeTypeOf("string");
    expect(result.session.cookieValue).toContain(".");

    expect(state.accounts).toHaveLength(1);
    expect(state.usernameHistory).toHaveLength(1);
    expect(state.guestSessions).toHaveLength(1);
    expect(client.query).toHaveBeenCalledWith("BEGIN");
    expect(client.query).toHaveBeenCalledWith("COMMIT");
  });

  it("rejects duplicate usernames", async () => {
    const { createGuestAccount } = await loadModule("createGuestAccount.js");
    const { pool, state } = createFakeAccountsPool();

    await createGuestAccount({
      pool,
      username: "Ada",
      avatarEmoji: "😀",
      avatarColor: "sky",
    });

    await expect(
      createGuestAccount({
        pool,
        username: " ada ",
        avatarEmoji: "😎",
        avatarColor: "amber",
      })
    ).rejects.toThrow(/username/i);

    expect(state.accounts).toHaveLength(1);
    expect(state.usernameHistory).toHaveLength(1);
    expect(state.guestSessions).toHaveLength(1);
  });

  it("resolves the current account from a valid guest session cookie", async () => {
    const { createGuestAccount } = await loadModule("createGuestAccount.js");
    const { getSessionAccount } = await loadModule("getSessionAccount.js");
    const { pool } = createFakeAccountsPool();

    const created = await createGuestAccount({
      pool,
      username: "Ada",
      avatarEmoji: "🤠",
      avatarColor: "sky",
    });

    const sessionAccount = await getSessionAccount({
      pool,
      cookieHeader: `settlex_session=${created.session.cookieValue}`,
    });

    expect(sessionAccount).not.toBeNull();
    expect(sessionAccount.account.id).toBe(created.account.id);
    expect(sessionAccount.account.currentUsername).toBe("Ada");
  });

  it("updates a guest account username and rolls username history forward", async () => {
    const { createGuestAccount } = await loadModule("createGuestAccount.js");
    const { updateGuestIdentity } = await loadModule("updateGuestIdentity.js");
    const { pool, state } = createFakeAccountsPool();

    const created = await createGuestAccount({
      pool,
      username: "Ada",
      avatarEmoji: "🤠",
      avatarColor: "sky",
    });

    const updated = await updateGuestIdentity({
      pool,
      accountId: created.account.id,
      username: "Ada Lovelace",
      avatarEmoji: "🧠",
      avatarColor: "violet",
    });

    expect(updated.account.id).toBe(created.account.id);
    expect(updated.account.currentUsername).toBe("Ada Lovelace");
    expect(updated.account.avatarEmoji).toBe("🧠");
    expect(updated.account.avatarColor).toBe("violet");
    expect(state.usernameHistory).toHaveLength(2);
    expect(state.usernameHistory[0].endedAt).not.toBeNull();
    expect(state.usernameHistory[1].username).toBe("Ada Lovelace");
  });
});
