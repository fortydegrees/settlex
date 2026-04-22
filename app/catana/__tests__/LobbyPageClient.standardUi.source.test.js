import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("LobbyPageClient standard UI migration", () => {
  it("uses the shared semantic button variants across the homepage entrypoints", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain('from "../../ui/Panel"');
    expect(source).toContain('from "../../ui/Button"');
    expect(source).toContain('from "../../ui/Select"');
    expect(source).toContain('variant="secondary"');
    expect(source).toContain('variant="accent"');
    expect(source).toContain('size="xl"');
    expect(source).toContain("sheen");
    expect(source).toContain("max-w-xl");
    expect(source).toContain("Choose how you want to play.");
    expect(source).not.toContain("text-2xl font-semibold text-slate-900");
    expect(source).not.toContain("bg-white/80 px-6 py-3 text-base font-bold");
    expect(source).not.toContain("bg-amber-400 px-6 py-3 text-base font-bold");
    expect(source).not.toContain("bg-slate-600 px-4 py-2 font-semibold text-white");
  });
});
