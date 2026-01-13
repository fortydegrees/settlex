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
  "PlayerAvatarStats.js"
);

describe("PlayerAvatarStats", () => {
  it("no longer renders hand count icons", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).not.toMatch(/handCounts/);
    expect(contents).not.toMatch(/resCardBackIcon/);
    expect(contents).not.toMatch(/devCardBackIcon/);
  });
});
