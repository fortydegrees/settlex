#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";
import {
  resolveConcurrency,
  runBounded
} from "./lib/bounded-worker-pool.mjs";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const appDir = path.join(rootDir, "app");
const perFileTimeoutMs = 120_000;

function collectTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
    } else if (/\.(test|source\.test)\.[cm]?[jt]sx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = collectTestFiles(appDir)
  .map((file) => path.relative(rootDir, file))
  .sort();

function runTestFile(file) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout;
    const output = [];
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

    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => output.push(chunk));

    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      error.output ??= Buffer.concat(output).toString("utf8");
      reject(error);
    };

    timeout = setTimeout(() => {
      child.kill();
      const error = new Error(
        `[vitest:app] ${file} exceeded ${perFileTimeoutMs / 1000}s timeout`
      );
      error.exitCode = 124;
      fail(error);
    }, perFileTimeoutMs);

    child.on("error", fail);
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      if (code === 0) {
        const durationMs = Date.now() - startedAt;
        console.log(`[vitest:app] PASS ${file} (${durationMs}ms)`);
        resolve({ file, durationMs });
        return;
      }

      const error = new Error(
        `[vitest:app] ${file} failed with exit code ${code}`
      );
      error.exitCode = code ?? 1;
      error.output = Buffer.concat(output).toString("utf8");
      reject(error);
    });
  });
}

try {
  const concurrency = resolveConcurrency(
    process.env.SETTLEX_APP_TEST_CONCURRENCY,
    availableParallelism()
  );
  console.log(
    `[vitest:app] Running ${files.length} files with concurrency ${concurrency}`
  );
  await runBounded(files, concurrency, runTestFile);
} catch (error) {
  if (error.output) {
    console.error(error.output);
  }
  console.error(error.message ?? error);
  process.exitCode = error.exitCode ?? 1;
}
