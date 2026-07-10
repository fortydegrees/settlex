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
    expect(source).toContain('import { spawn } from "node:child_process"');
    expect(source).toContain('import { availableParallelism } from "node:os"');
    expect(source).toContain("resolveConcurrency");
    expect(source).toContain("runBounded");
    expect(source).toContain("killProcessTree");
    expect(source).toContain('detached: process.platform !== "win32"');
    expect(source).toContain("SETTLEX_APP_TEST_CONCURRENCY");
    expect(source).not.toContain("spawnSync");
  });
});
