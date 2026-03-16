import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen zoom and pan config", () => {
  it("disables zoom padding so wheel zoom does not overshoot and snap back", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toMatch(/disablePadding=\{true\}/);
  });
});
