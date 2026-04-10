import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("Dev sandbox client source", () => {
  it("uses a local boardgame.io client with sandbox-specific wiring", () => {
    const source = read("../dev/sandbox/SandboxClient.js");

    expect(source).toContain("Client({");
    expect(source).toContain("createSandboxGame");
    expect(source).toContain("SandboxBoardShell");
    expect(source).toContain("debug: false");
    expect(source).not.toContain("SocketIO");
  });
});
