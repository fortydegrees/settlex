import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const componentPath = path.resolve(__dirname, "..", "components", "CardStack.js");

describe("CardStack empty state styling", () => {
  it("keeps the faded placeholder card but drops the white outline box", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain('const outlineClass = layout.isEmpty');
    expect(contents).toContain('"opacity-30');
    expect(contents).not.toContain("ring-blue-100");
    expect(contents).not.toContain("ring-inset");
  });
});
