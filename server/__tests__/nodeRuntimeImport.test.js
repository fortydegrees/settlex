import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

describe("production Node game module", () => {
  test("loads the server game definition", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        "await import('./server/serverGame.js')"
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 10_000
      }
    );

    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
