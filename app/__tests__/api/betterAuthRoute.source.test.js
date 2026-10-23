import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const readRepoFile = (...segments) =>
  fs.readFileSync(path.join(repoRoot, ...segments), "utf8");

describe("Better Auth route wiring", () => {
  it("exposes Better Auth through the Next app-router catch-all route", () => {
    const route = readRepoFile("app", "api", "auth", "[...all]", "route.js");

    expect(route).toContain('from "better-auth/next-js"');
    expect(route).toContain("toNextJsHandler(auth)");
    expect(route).toContain("export const { POST, GET }");
  });

  it("configures Better Auth as the auth owner with anonymous users and social providers", () => {
    const source = readRepoFile("lib", "server", "auth", "betterAuth.js");

    expect(source).toContain('from "better-auth"');
    expect(source).toContain('from "better-auth/plugins/anonymous"');
    expect(source).toContain("emailAndPassword");
    expect(source).toContain("enabled: true");
    expect(source).toContain('modelName: "auth_users"');
    expect(source).toContain('modelName: "auth_sessions"');
    expect(source).toContain("socialProviders");
    expect(source).toContain("google");
    expect(source).toContain("discord");
    expect(source).not.toContain("facebook");
  });
});
