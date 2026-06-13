import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readRepoFile = (filePath) =>
  readFileSync(resolve(process.cwd(), filePath), "utf8");

describe("verification lanes", () => {
  it("keeps root Vitest discovery out of linked worktrees and generated game-core output", () => {
    const source = readRepoFile("vitest.config.ts");

    expect(source).toContain("exclude:");
    expect(source).toContain("**/.worktrees/**");
    expect(source).toContain("**/game-core/dist/**");
  });

  it("exposes focused verification scripts for game logic, server/runtime, and Catana app work", () => {
    const packageJson = JSON.parse(readRepoFile("package.json"));
    const scripts = packageJson.scripts ?? {};

    expect(scripts["test:logic"]).toBe("pnpm -C game-core build && pnpm -C game-core test");
    expect(scripts["test:server"]).toBe(
      "pnpm exec vitest run server lib ai react-zoom-pan-pinch --reporter=dot"
    );
    expect(scripts["test:catana"]).toBe(
      "pnpm exec vitest run app/catana --reporter=dot"
    );
    expect(scripts.verify).toContain("pnpm run test:logic");
    expect(scripts.verify).toContain("pnpm run test:server");
    expect(scripts.verify).toContain("pnpm run test:app");
  });
});
