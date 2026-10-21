import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("Dev sandbox route source", () => {
  it("keeps the sandbox route development-only and boots the sandbox client", () => {
    const source = read("../dev/sandbox/page.js");

    expect(source).toContain('process.env.NODE_ENV !== "development"');
    expect(source).toContain("notFound()");
    expect(source).toContain("SandboxClient");
  });
});
