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

  it("renders as a small responsive release disclosure", () => {
    const source = readRepoFile("app/catana/lobby/VersionBadge.js");

    expect(source).toContain('import { MetaDisclosure } from "../../ui/MetaDisclosure";');
    expect(source).toContain("max-w-xl justify-end");
    expect(source).toContain("sm:fixed sm:bottom-5 sm:right-5");
    expect(source).toContain("What changed");
    expect(source).toContain("buildShaShort");
    expect(source).toContain("releaseInfo.releaseLabel");
    expect(source).not.toContain("document.addEventListener");
    expect(source).not.toContain("rounded-full border");
    expect(source).not.toContain("triggerClassName");
  });
});
