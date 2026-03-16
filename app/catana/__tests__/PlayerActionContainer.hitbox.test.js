import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const actionContainerPath = path.resolve(
  __dirname,
  "..",
  "components",
  "PlayerActionContainer.js"
);

describe("PlayerActionContainer hitbox", () => {
  it("keeps the bottom overlay transparent outside the actual controls", () => {
    const contents = fs.readFileSync(actionContainerPath, "utf8");
    expect(contents).toMatch(
      /fixed bottom-4 left-0 right-0 pointer-events-none px-4/
    );
    expect(contents).toMatch(
      /pointer-events-none flex-1 flex items-end justify-end self-end pr-6/
    );
    expect(contents).toMatch(
      /pointer-events-auto flex w-36 flex-col items-center/
    );
  });
});
