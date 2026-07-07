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
  it("includes koa-body for the production game server", () => {
    const packageJson = readRepoFile("package.json");

    expect(packageJson).toContain('"koa-body"');
  });

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

  it("uses a pnpm patch instead of vendored zoom-pan-pinch source", () => {
    const packageJson = JSON.parse(readRepoFile("package.json"));

    expect(packageJson.dependencies["react-zoom-pan-pinch"]).toBe("3.7.0");
    expect(
      packageJson.pnpm?.patchedDependencies?.["react-zoom-pan-pinch@3.7.0"]
    ).toBe("patches/react-zoom-pan-pinch@3.7.0.patch");
    expect(
      fs.existsSync(
        path.join(repoRoot, "patches", "react-zoom-pan-pinch@3.7.0.patch")
      )
    ).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, "react-zoom-pan-pinch"))).toBe(
      false
    );
  });

  it("excludes misc experiments from app typechecking", () => {
    const tsconfig = readRepoFile("tsconfig.json");

    expect(tsconfig).toContain('"misc"');
  });

  it("disables optional ws native addons in the Next webpack config", () => {
    const nextConfig = readRepoFile("next.config.js");

    expect(nextConfig).toContain('bufferutil: false');
    expect(nextConfig).toContain('"utf-8-validate": false');
  });
});
