import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const boardCssPath = path.resolve(__dirname, "..", "Board.css");

describe("Board pulse animation naming", () => {
  it("keeps board-specific pulse keyframes off the global tailwind pulse name", () => {
    const contents = fs.readFileSync(boardCssPath, "utf8");

    expect(contents).toContain("animation: board-pulse 2s infinite");
    expect(contents).toContain("@keyframes board-pulse");
    expect(contents).not.toContain("@keyframes pulse {");
  });
});
