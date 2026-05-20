import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagePath = path.resolve(__dirname, "..", "..", "..", "package.json");

describe("MobileMetaDrawer dependency", () => {
  it("declares Vaul for mobile drawer behavior", () => {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    expect(packageJson.dependencies).toHaveProperty("vaul");
  });
});
