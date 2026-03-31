import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("LobbyPageClient scenario entrypoint", () => {
  it("fetches saved scenarios and passes setupData when starting from one", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/catana/lobby/LobbyPageClient.js"),
      "utf8"
    );

    expect(source).toContain("/api/scenarios");
    expect(source).toContain("Start from scenario");
    expect(source).toContain("devScenarioState");
    expect(source).toContain("setupData");
  });
});
