import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentPath = path.resolve(
  __dirname,
  "..",
  "components",
  "GameLogPanel.js"
);

describe("GameLogPanel", () => {
  it("renders a log container with interaction opt-in", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("Game Log");
    expect(contents).toContain("data-allow-interaction");
    expect(contents).toContain("formatLogEntry");
  });
});
