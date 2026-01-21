import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("Effects Lab audio override", () => {
  it("exposes custom sound and delay controls in the lab header", () => {
    const source = read("../../dev/effects/EffectsLabClient.js");
    expect(source).toContain("Custom Sound");
    expect(source).toContain("Audio Delay");
  });

  it("defines cues for labs that can override audio", () => {
    const source = read("../../dev/effects/registry.js");
    expect(source).toContain("cues");
    expect(source).toContain("build:settlement");
    expect(source).toContain("build:road");
    expect(source).toContain("build:city");
    expect(source).toContain("resource:pop:start");
    expect(source).toContain("resource:travel:start");
  });
});
