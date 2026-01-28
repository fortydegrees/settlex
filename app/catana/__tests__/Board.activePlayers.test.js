import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const boardPath = path.resolve(__dirname, "..", "Board.js");

describe("Board activePlayers guards", () => {
  it("guards activePlayers before Object.entries", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    expect(contents).toMatch(/Object\.entries\(ctx\.activePlayers \?\? \{\}\)/);
  });
});
