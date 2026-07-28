import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readRepoFile = (filePath) =>
  readFileSync(resolve(process.cwd(), filePath), "utf8");

describe("homepage release info", () => {
  it("uses the public release label in the home release panel", () => {
    const homeSource = readRepoFile("app/catana/home/HomeTableClient.js");

    expect(homeSource).toContain(
      "{releaseInfo.releaseLabel} · {releaseInfo.title}"
    );
    expect(homeSource).not.toContain("Release {releaseInfo.version}");
  });
});
