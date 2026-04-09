import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const readRepoFile = (...segments) =>
  fs.readFileSync(path.join(repoRoot, ...segments), "utf8");

describe("account page source", () => {
  it("keeps the route entry server-renderable by avoiding client search param hooks", () => {
    const pageContents = readRepoFile("app", "account", "page.js");
    const clientContents = readRepoFile("app", "account", "AccountPageClient.js");

    expect(pageContents).not.toContain('"use client"');
    expect(pageContents).not.toContain("useSearchParams");
    expect(pageContents).toContain("export default function AccountPage({ searchParams })");
    expect(clientContents).toContain('"use client"');
  });
});
