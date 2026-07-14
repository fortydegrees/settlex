import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "app/replays/components/ReplayScoreChart.jsx"),
  "utf8"
);

describe("ReplayScoreChart", () => {
  it("uses Recharts as a Catana-owned stepped VP chart", () => {
    expect(source).toContain('from "recharts"');
    expect(source).toContain("ResponsiveContainer");
    expect(source).toContain("ReferenceLine");
    expect(source).toContain('type="stepAfter"');
    expect(source).toContain("accessibilityLayer");
    expect(source).toContain("onSeek");
    expect(source).not.toContain("Tooltip");
  });
});
