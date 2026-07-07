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
  it("returns a legacy-gone response for email claim requests", async () => {
    const { createAccountClaimRequestRoute } = await loadRoute("request", "handler.js");
    const POST = createAccountClaimRequestRoute();

    const response = await POST(
      new Request("http://localhost/api/account/claim/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ada@example.com" }),
      })
    );
    const json = await response.json();

    expect(response.status).toBe(410);
    expect(json.error).toMatch(/provider sign in/i);
  });

  it("redirects old magic-link consumes back to account sign in", async () => {
    const { createAccountClaimConsumeRoute } = await loadRoute("consume", "handler.js");
    const GET = createAccountClaimConsumeRoute();

    const response = await GET(
      new Request("http://localhost/api/account/claim/consume?token=abc123")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "http://localhost/account?authError="
    );
    expect(response.headers.get("location")).toContain("provider+sign+in");
  });
});
