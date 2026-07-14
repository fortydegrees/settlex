import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ReplayStatusPage", () => {
  it("bounds archive polling and provides active/invalid copy", () => {
    const source = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "app/replays/components/ReplayStatusPage.jsx"
      ),
      "utf8"
    );
    expect(source).toContain("attempt < 10");
    expect(source).toContain("}, 1000)");
    expect(source).toContain("router.refresh()");
    expect(source).toContain("Preparing replay…");
    expect(source).toContain("Replay available after the match");
    expect(source).toContain("Replay unavailable");
    expect(source).toContain("Return to lobby");
    expect(source).toContain('router.push("/")');
  });
});
