import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const actionContainerPath = path.resolve(
  __dirname,
  "..",
  "components",
  "PlayerActionContainer.js"
);
const devCardDisplayPath = path.resolve(
  __dirname,
  "..",
  "components",
  "DevCardDisplay.js"
);

describe("PlayerActionContainer", () => {
  it("gates player hand badges behind a flag", () => {
    const contents = fs.readFileSync(actionContainerPath, "utf8");
    expect(contents).toMatch(/SHOW_PLAYER_HAND_BADGES/);
    expect(contents).toMatch(/showCountBadge/);
  });
});

describe("DevCardDisplay", () => {
  it("defaults count badges to disabled", () => {
    const contents = fs.readFileSync(devCardDisplayPath, "utf8");
    expect(contents).toMatch(/showCountBadge\s*=\s*false/);
  });
});
