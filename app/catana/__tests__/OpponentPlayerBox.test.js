import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentPath = path.resolve(
  __dirname,
  "..",
  "components",
  "OpponentPlayerBox.js"
);

describe("OpponentPlayerBox", () => {
  it("does not limit visible stacks with maxVisible", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).not.toMatch(/maxVisible/);
  });

  it("animates card stack width changes", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("transition-[width]");
    expect(contents).toContain("motion-reduce:transition-none");
  });
});
