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

describe("magic link account claiming", () => {
  it("creates a one-time token and upgrades the same account on consume", async () => {
    const { createGuestAccount } = await loadModule("createGuestAccount.js");
    const { requestMagicLink } = await loadModule("requestMagicLink.js");
    const { consumeMagicLink } = await loadModule("consumeMagicLink.js");
    const { pool, state } = createFakeAccountsPool();

    const created = await createGuestAccount({
      pool,
      username: "Ada",
      avatarEmoji: "🤠",
      avatarColor: "sky",
    });

    const sendMagicLink = vi.fn().mockResolvedValue({
      previewUrl: "http://localhost:3000/api/account/claim/consume?token=preview",
    });

    const requested = await requestMagicLink({
      pool,
      accountId: created.account.id,
      email: "ada@example.com",
      publicAppUrl: "http://localhost:3000",
      emailTransport: { sendMagicLink },
    });

    const consumed = await consumeMagicLink({
      pool,
      token: requested.rawToken,
    });

    expect(sendMagicLink).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.com",
      })
    );
    expect(state.magicLinkTokens).toHaveLength(1);
    expect(state.magicLinkTokens[0].consumedAt).not.toBeNull();
    expect(state.accounts[0].status).toBe("claimed");
    expect(state.accountEmails).toHaveLength(1);
    expect(state.accountEmails[0].verifiedAt).not.toBeNull();
    expect(state.authIdentities).toHaveLength(1);
    expect(consumed.account.id).toBe(created.account.id);
  });

  it("rejects expired or consumed tokens", async () => {
    const { createGuestAccount } = await loadModule("createGuestAccount.js");
    const { requestMagicLink } = await loadModule("requestMagicLink.js");
    const { consumeMagicLink } = await loadModule("consumeMagicLink.js");
    const { pool, state } = createFakeAccountsPool();

    const created = await createGuestAccount({
      pool,
      username: "Ada",
      avatarEmoji: "🤠",
      avatarColor: "sky",
    });

    const requested = await requestMagicLink({
      pool,
      accountId: created.account.id,
      email: "ada@example.com",
      publicAppUrl: "http://localhost:3000",
      emailTransport: {
        sendMagicLink: vi.fn().mockResolvedValue({
          previewUrl: "http://localhost:3000/api/account/claim/consume?token=preview",
        }),
      },
    });

    await consumeMagicLink({
      pool,
      token: requested.rawToken,
    });

    await expect(
      consumeMagicLink({
        pool,
        token: requested.rawToken,
      })
    ).rejects.toThrow(/consumed/i);

    state.magicLinkTokens[0].consumedAt = null;
    state.magicLinkTokens[0].expiresAt = new Date(Date.now() - 60_000).toISOString();

    await expect(
      consumeMagicLink({
        pool,
        token: requested.rawToken,
      })
    ).rejects.toThrow(/expired/i);
  });
});
