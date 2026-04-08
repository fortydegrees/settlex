import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const routePath = (...segments) =>
  path.join(repoRoot, "app", "api", "account", "claim", ...segments);

const loadRoute = async (...segments) => {
  const targetPath = routePath(...segments);
  expect(fs.existsSync(targetPath)).toBe(true);
  const href = pathToFileURL(targetPath).href;
  return import(`${href}?t=${Date.now()}`);
};

afterEach(() => {
  vi.resetModules();
});

describe("account claim routes", () => {
  it("requires a current session for claim requests and returns a preview link in dev", async () => {
    const { createAccountClaimRequestRoute } = await loadRoute("request", "handler.js");
    const getSessionAccount = vi.fn();
    const requestMagicLink = vi.fn();
    const POST = createAccountClaimRequestRoute({
      getSessionAccount,
      requestMagicLink,
    });

    const unauthorized = await POST(
      new Request("http://localhost/api/account/claim/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ada@example.com" }),
      })
    );
    expect(unauthorized.status).toBe(401);

    getSessionAccount.mockResolvedValue({
      account: {
        id: "acct_1",
        currentUsername: "Ada",
      },
    });
    requestMagicLink.mockResolvedValue({
      email: "ada@example.com",
      previewUrl: "http://localhost:3000/api/account/claim/consume?token=preview",
    });

    const authorized = await POST(
      new Request("http://localhost/api/account/claim/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "settlex_session=a.b",
        },
        body: JSON.stringify({ email: "ada@example.com" }),
      })
    );
    const json = await authorized.json();

    expect(authorized.status).toBe(200);
    expect(requestMagicLink).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acct_1",
        email: "ada@example.com",
      })
    );
    expect(json.previewUrl).toContain("/api/account/claim/consume?token=");
  });

  it("consumes the token and redirects back to account state", async () => {
    const { createAccountClaimConsumeRoute } = await loadRoute("consume", "handler.js");
    const consumeMagicLink = vi.fn().mockResolvedValue({
      account: {
        id: "acct_1",
        status: "claimed",
      },
      redirectTo: "/account",
    });
    const GET = createAccountClaimConsumeRoute({
      consumeMagicLink,
    });

    const response = await GET(
      new Request("http://localhost/api/account/claim/consume?token=abc123")
    );

    expect(consumeMagicLink).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "abc123",
      })
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/account?claimed=1"
    );
  });
});
