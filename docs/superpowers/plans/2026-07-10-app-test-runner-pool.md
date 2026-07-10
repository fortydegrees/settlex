# App Test Runner Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve per-file app-test isolation and timeouts while running a safely bounded number of files concurrently.

**Architecture:** Extract a small dependency-free worker-pool helper that is unit-testable, then replace `spawnSync` with asynchronous `spawn`. Capture each file's output separately, summarize successes, print full attributable output on failure, and stop scheduling new work after the first failure.

**Tech Stack:** Node.js ESM, built-in `child_process`, `os`, Vitest, pnpm.

## Global Constraints

- Preserve one Vitest subprocess per app test file.
- Preserve the 120-second per-file timeout.
- Continue excluding `.worktrees/**`.
- Default concurrency is `min(4, availableParallelism)` and is never below one.
- `SETTLEX_APP_TEST_CONCURRENCY` may override concurrency only with an integer from 1 through 8.
- Concurrency one remains a supported serial mode.
- Add no dependencies.

---

### Task 1: Add a tested bounded worker-pool helper

**Files:**
- Create: `scripts/lib/bounded-worker-pool.mjs`
- Create: `scripts/release/__tests__/bounded-worker-pool.test.mjs`

**Interfaces:**
- Produces: `resolveConcurrency(rawValue, availableCpuCount)` and `runBounded(items, concurrency, worker)`.

- [ ] **Step 1: Write failing helper tests**

Create the test file with:

```js
import { describe, expect, it } from "vitest";
import {
  resolveConcurrency,
  runBounded
} from "../../lib/bounded-worker-pool.mjs";

describe("resolveConcurrency", () => {
  it("defaults to the smaller of four and the available CPU count", () => {
    expect(resolveConcurrency(undefined, 12)).toBe(4);
    expect(resolveConcurrency(undefined, 2)).toBe(2);
    expect(resolveConcurrency(undefined, 0)).toBe(1);
  });

  it("accepts explicit values in the supported range", () => {
    expect(resolveConcurrency("1", 12)).toBe(1);
    expect(resolveConcurrency("8", 2)).toBe(8);
  });

  it.each(["0", "9", "2.5", "nope"])("rejects invalid value %s", (value) => {
    expect(() => resolveConcurrency(value, 4)).toThrow(
      "SETTLEX_APP_TEST_CONCURRENCY must be an integer from 1 to 8"
    );
  });
});

describe("runBounded", () => {
  it("preserves result order while respecting the concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;
    const results = await runBounded([30, 5, 15, 1], 2, async (delay) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, delay));
      active -= 1;
      return delay * 2;
    });

    expect(maxActive).toBe(2);
    expect(results).toEqual([60, 10, 30, 2]);
  });

  it("does not schedule new items after a worker rejects", async () => {
    const started = [];
    await expect(
      runBounded([0, 1, 2, 3], 1, async (item) => {
        started.push(item);
        if (item === 1) throw new Error("boom");
        return item;
      })
    ).rejects.toThrow("boom");
    expect(started).toEqual([0, 1]);
  });
});
```

- [ ] **Step 2: Run tests and confirm the module is missing**

Run: `pnpm exec vitest run scripts/release/__tests__/bounded-worker-pool.test.mjs --reporter=dot`

Expected: FAIL because `scripts/lib/bounded-worker-pool.mjs` does not exist.

- [ ] **Step 3: Implement the pure helper**

Implement these signatures:

```js
export function resolveConcurrency(rawValue, availableCpuCount) {
  const fallback = Math.max(1, Math.min(4, availableCpuCount));
  if (rawValue == null || rawValue === "") return fallback;
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    throw new Error("SETTLEX_APP_TEST_CONCURRENCY must be an integer from 1 to 8");
  }
  return parsed;
}

export async function runBounded(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let firstError = null;

  async function runWorker() {
    while (!firstError && nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        firstError ??= error;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runWorker)
  );
  if (firstError) throw firstError;
  return results;
}
```

- [ ] **Step 4: Run helper tests**

Run: `pnpm exec vitest run scripts/release/__tests__/bounded-worker-pool.test.mjs --reporter=dot`

Expected: PASS.

- [ ] **Step 5: Commit the pool helper**

```bash
git add scripts/lib/bounded-worker-pool.mjs scripts/release/__tests__/bounded-worker-pool.test.mjs
git commit -m "test: add bounded app-test worker pool"
```

### Task 2: Convert the app runner to asynchronous subprocesses

**Files:**
- Modify: `scripts/run-vitest-app-tests.mjs`
- Modify: `scripts/release/__tests__/run-vitest-app-tests.test.mjs`

**Interfaces:**
- Consumes: `resolveConcurrency` and `runBounded` from Task 1.
- Produces: `runTestFile(file)` resolving with duration/status or rejecting with file-specific diagnostics.

- [ ] **Step 1: Extend the runner source contract test**

Keep the `.worktrees/**` assertions and add:

```js
expect(source).toContain('import { spawn } from "node:child_process"');
expect(source).toContain('import { availableParallelism } from "node:os"');
expect(source).toContain("resolveConcurrency");
expect(source).toContain("runBounded");
expect(source).toContain("SETTLEX_APP_TEST_CONCURRENCY");
expect(source).not.toContain("spawnSync");
```

- [ ] **Step 2: Run the source test and verify failure**

Run: `pnpm exec vitest run scripts/release/__tests__/run-vitest-app-tests.test.mjs --reporter=dot`

Expected: FAIL because the runner is still synchronous.

- [ ] **Step 3: Implement asynchronous per-file execution**

Replace the synchronous loop with:

```js
function runTestFile(file) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        file,
        "--reporter=dot",
        "--exclude",
        ".worktrees/**"
      ],
      {
        cwd: rootDir,
        shell: process.platform === "win32",
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    const output = [];
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => output.push(chunk));
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      error.output ??= Buffer.concat(output).toString("utf8");
      reject(error);
    };
    const timeout = setTimeout(() => {
      child.kill();
      const error = new Error(
        `[vitest:app] ${file} exceeded ${perFileTimeoutMs / 1000}s timeout`
      );
      error.exitCode = 124;
      fail(error);
    }, perFileTimeoutMs);

    child.on("error", (error) => {
      fail(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ file, durationMs: Date.now() - startedAt });
        return;
      }
      const error = new Error(`[vitest:app] ${file} failed with exit code ${code}`);
      error.exitCode = code ?? 1;
      error.output = Buffer.concat(output).toString("utf8");
      reject(error);
    });
  });
}
```

Compute concurrency with:

```js
const concurrency = resolveConcurrency(
  process.env.SETTLEX_APP_TEST_CONCURRENCY,
  availableParallelism()
);
```

Run files with `runBounded(files, concurrency, runTestFile)`. Print one success line per completed file and full captured output for the first failure before setting `process.exitCode`.

- [ ] **Step 4: Run runner unit tests and syntax check**

Run: `pnpm exec vitest run scripts/release/__tests__/bounded-worker-pool.test.mjs scripts/release/__tests__/run-vitest-app-tests.test.mjs --reporter=dot`

Expected: PASS.

Run: `node --check scripts/run-vitest-app-tests.mjs`

Expected: exit 0.

- [ ] **Step 5: Commit the asynchronous runner**

```bash
git add scripts/run-vitest-app-tests.mjs scripts/release/__tests__/run-vitest-app-tests.test.mjs
git commit -m "perf: parallelize isolated app tests"
```

### Task 3: Prove serial parity and measure the default pool

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: runner from Task 2 and the same discovered app file list.
- Produces: measured serial/default timings and durable concurrency guidance.

- [ ] **Step 1: Run and time serial mode**

Run: `time SETTLEX_APP_TEST_CONCURRENCY=1 pnpm run test:app`

Expected: all 228 currently discovered app test files PASS; record elapsed time.

- [ ] **Step 2: Run and time default mode**

Run: `time pnpm run test:app`

Expected: the same files PASS and elapsed time is materially lower than serial mode.

- [ ] **Step 3: Record behavior and measurements**

Document the actual file count, both elapsed times, default concurrency on the machine, override range, timeout preservation and failure behavior. Do not promise a universal speedup factor from one machine.

- [ ] **Step 4: Commit the runner documentation**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record parallel app-test runner"
```
