#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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

for (const file of files) {
  console.log(`\n[vitest:app] ${file}`);
  const result = spawnSync(
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
      stdio: "inherit",
      timeout: perFileTimeoutMs,
      shell: process.platform === "win32"
    }
  );

  if (result.error?.code === "ETIMEDOUT") {
    console.error(
      `[vitest:app] ${file} exceeded ${perFileTimeoutMs / 1000}s timeout`
    );
    process.exit(124);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
