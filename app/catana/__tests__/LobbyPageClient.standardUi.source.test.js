import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("LobbyPageClient standard UI migration", () => {
  it("uses shared panels and buttons in the custom-game section", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain('from "../../ui/Panel"');
    expect(source).toContain('from "../../ui/Button"');
    expect(source).toContain('from "../../ui/Select"');
  });
});
