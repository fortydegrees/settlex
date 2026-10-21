import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildDocsIndex, writeDocsIndex } from "../write-docs-index.mjs";

const tempRoots = [];

async function makeDocsRoot() {
  const root = mkdtempSync(join(tmpdir(), "settlex-docs-index-"));
  const docsRoot = join(root, "docs");
  await mkdir(join(docsRoot, "agent"), { recursive: true });
  await mkdir(join(docsRoot, "plans"), { recursive: true });
  tempRoots.push(root);
  return docsRoot;
}

describe("write-docs-index", () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      rmSync(tempRoots.pop(), { force: true, recursive: true });
    }
  });

  it("builds a stable map from markdown paths to first H1 headings", async () => {
    const docsRoot = await makeDocsRoot();
    writeFileSync(join(docsRoot, "agent", "HANDOFF.md"), "# Agent Handoff\n");
    writeFileSync(join(docsRoot, "plans", "Roadmap.md"), "## No H1\n");
    writeFileSync(join(docsRoot, "INDEX.md"), "# Old generated map\n");

    const index = await buildDocsIndex(docsRoot);

    expect(index).toContain("# Settlex Docs Index");
    expect(index).toContain("agent/HANDOFF.md - Agent Handoff");
    expect(index).toContain("plans/Roadmap.md - No top-level heading");
    expect(index).not.toContain("INDEX.md");
  });

  it("writes the generated map to docs/INDEX.md", async () => {
    const docsRoot = await makeDocsRoot();
    writeFileSync(join(docsRoot, "NOTES.md"), "# Notes\n");

    const outPath = await writeDocsIndex(docsRoot);

    expect(outPath).toBe(join(docsRoot, "INDEX.md"));
    expect(readFileSync(outPath, "utf8")).toContain("NOTES.md - Notes");
  });
});
