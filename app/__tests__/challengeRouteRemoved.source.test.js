import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("challenge route removal", () => {
  it("does not ship a separate /challenge route", () => {
    expect(fs.existsSync(path.resolve(repoRoot, "app/challenge"))).toBe(false);
  });
});
