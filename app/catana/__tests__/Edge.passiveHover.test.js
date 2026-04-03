import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const edgePath = path.resolve(__dirname, "..", "Edge.js");

describe("Edge passive hover mode", () => {
  it("hides passive road action circles until the edge is hovered", () => {
    const source = fs.readFileSync(edgePath, "utf8");
    expect(source).toContain("showIdleCircle={false}");
  });
});
