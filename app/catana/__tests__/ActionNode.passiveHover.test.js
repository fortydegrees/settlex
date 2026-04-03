import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const actionNodePath = path.resolve(__dirname, "..", "ActionNode.js");

describe("ActionNode passive hover mode", () => {
  it("supports hiding the idle action circle until hover", () => {
    const source = fs.readFileSync(actionNodePath, "utf8");
    expect(source).toContain("showIdleCircle");
    expect(source).toContain("showIdleCircle = true");
  });
});
