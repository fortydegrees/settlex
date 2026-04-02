import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modalPath = path.resolve(
  __dirname,
  "..",
  "components",
  "TradeDiscardModal.js"
);

describe("TradeDiscardModal year of plenty bank counts", () => {
  it("gates Year of Plenty bank count badges behind a game setting", () => {
    const contents = fs.readFileSync(modalPath, "utf8");

    expect(contents).toMatch(/showYearOfPlentyBankCounts/);
    expect(contents).toMatch(
      /\{isDevYop && bankFinite && showYearOfPlentyBankCounts && \(/,
    );
  });
});
