import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("Dev viewport wall source", () => {
  it("keeps the viewport wall route development-only", () => {
    const source = read("../dev/viewports/page.js");

    expect(source).toContain('process.env.NODE_ENV !== "development"');
    expect(source).toContain("notFound()");
    expect(source).toContain("ViewportWallClient");
  });

  it("embeds the Catana sandbox at the expected responsive viewport set", () => {
    const source = read("../dev/viewports/ViewportWallClient.js");

    expect(source).toContain('"/catana/dev/sandbox?viewportWall=1"');
    expect(source).toContain("2560");
    expect(source).toContain("1440");
    expect(source).toContain("1024");
    expect(source).toContain("768");
    expect(source).toContain("844");
    expect(source).toContain("390");
    expect(source).toContain("Reload All");
  });

  it("hides the sandbox control panel inside viewport wall frames", () => {
    const sandboxClientSource = read("../dev/sandbox/SandboxClient.js");
    const sandboxShellSource = read("../dev/sandbox/SandboxBoardShell.js");

    expect(sandboxClientSource).toContain("setIsViewportWall");
    expect(sandboxClientSource).toContain("isViewportWall={isViewportWall}");
    expect(sandboxShellSource).toContain("!isViewportWall");
    expect(sandboxShellSource).toContain("SandboxPanel");
  });
});
