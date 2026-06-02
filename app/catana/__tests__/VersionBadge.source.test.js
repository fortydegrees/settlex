import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readRepoFile = (filePath) =>
  readFileSync(resolve(process.cwd(), filePath), "utf8");

describe("homepage release badge", () => {
  it("wires the release badge into the lobby homepage", () => {
    const source = readRepoFile("app/catana/lobby/LobbyPageClient.js");

    expect(source).toContain('import { VersionBadge } from "./VersionBadge";');
    expect(source).toContain("<VersionBadge />");
  });

  it("renders as a small fixed bottom-right disclosure", () => {
    const source = readRepoFile("app/catana/lobby/VersionBadge.js");

    expect(source).toContain('import { Popover } from "../../ui/Popover";');
    expect(source).toContain("fixed bottom-3 right-3");
    expect(source).toContain("What changed");
    expect(source).toContain("buildShaShort");
    expect(source).toContain("releaseInfo.releaseLabel");
    expect(source).not.toContain("document.addEventListener");
    expect(source).not.toContain("uppercase tracking-[0.08em]");
  });
});
