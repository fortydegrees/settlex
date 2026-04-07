import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const readRepoFile = (...segments) =>
  fs.readFileSync(path.join(repoRoot, ...segments), "utf8");

describe("production build inputs", () => {
  it("does not ship a root-level resources symlink", () => {
    const resourcesPath = path.join(repoRoot, "resources");

    let stats = null;
    try {
      stats = fs.lstatSync(resourcesPath);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        expect(fs.existsSync(resourcesPath)).toBe(false);
        return;
      }
      throw error;
    }

    expect(stats.isSymbolicLink()).toBe(false);
  });

  it("uses explicit cleanup guards in the vendored zoom-pan-pinch hooks", () => {
    const effectHook = readRepoFile(
      "react-zoom-pan-pinch",
      "hooks",
      "use-transform-effect.tsx"
    );
    const initHook = readRepoFile(
      "react-zoom-pan-pinch",
      "hooks",
      "use-transform-init.tsx"
    );

    expect(effectHook).toContain('typeof unmountCallback === "function"');
    expect(initHook).toContain('typeof unmount === "function"');
    expect(initHook).toContain('typeof unmountCallback === "function"');
  });

  it("excludes vendored zoom-pan-pinch story files from app typechecking", () => {
    const tsconfig = readRepoFile("tsconfig.json");

    expect(tsconfig).toContain('"react-zoom-pan-pinch/stories"');
  });

  it("uses relative model imports inside vendored zoom-pan-pinch build files", () => {
    const stylesUtils = readRepoFile(
      "react-zoom-pan-pinch",
      "utils",
      "styles.utils.ts"
    );

    expect(stylesUtils).toContain('from "../models"');
    expect(stylesUtils).not.toContain('from "models"');
  });
});
