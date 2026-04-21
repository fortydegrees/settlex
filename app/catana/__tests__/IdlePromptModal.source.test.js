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

    expect(contents).toContain('from "../../ui/Dialog"');
    expect(contents).toContain("Are you still there?");
    expect(contents).toContain("I’m still here");
    expect(contents).toContain("You’ll forfeit in");
    expect(contents).toContain("tabular-nums");
  });

  it("routes through the shared dialog shell and primary button", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain("Dialog");
    expect(contents).toContain('variant="primary"');
  });
});
