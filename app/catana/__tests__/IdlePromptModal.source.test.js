import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentPath = path.resolve(
  __dirname,
  "..",
  "components",
  "IdlePromptModal.js"
);

describe("IdlePromptModal", () => {
  it("renders the approved idle prompt copy and acknowledgement action", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain("Are you still there?");
    expect(contents).toContain("I’m still here");
    expect(contents).toContain("You’ll forfeit in");
    expect(contents).toContain("tabular-nums");
  });

  it("uses Catana danger-modal styling hooks", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain("fixed inset-0");
    expect(contents).toContain("bg-blue-900/40");
    expect(contents).toContain("bg-blue-200/95");
    expect(contents).toContain("bg-lime-500");
  });
});
