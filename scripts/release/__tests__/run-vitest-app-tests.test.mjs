import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("run-vitest-app-tests", () => {
  it("excludes nested worktrees from per-file vitest runs", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/run-vitest-app-tests.mjs"),
      "utf8"
    );

    expect(source).toContain("--exclude");
    expect(source).toContain(".worktrees/**");
  });
});
