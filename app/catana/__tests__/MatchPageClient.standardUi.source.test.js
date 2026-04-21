import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("MatchPageClient standard UI migration", () => {
  it("uses the shared Settlex UI components for the join-seat surface", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/[matchID]/MatchPageClient.js"),
      "utf8"
    );

    expect(source).toContain('from "../../../ui/Panel"');
    expect(source).toContain('from "../../../ui/Input"');
    expect(source).toContain('from "../../../ui/Select"');
    expect(source).toContain('from "../../../ui/Button"');
    expect(source).not.toContain("function GlassPanel");
    expect(source).not.toContain("function GlassInput");
    expect(source).not.toContain("function GlassSelect");
    expect(source).not.toContain("function PrimaryButton");
  });
});
