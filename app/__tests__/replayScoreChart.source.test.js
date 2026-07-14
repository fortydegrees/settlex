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
    expect(source).toContain('role="slider"');
    expect(source).toContain("tabIndex={0}");
    expect(source).toContain('aria-valuemin="0"');
    expect(source).toContain("aria-valuemax");
    expect(source).toContain("aria-valuenow");
    expect(source).toContain("onKeyDown");
    expect(source).toContain("event.preventDefault()");
    expect(source).not.toContain("Tooltip");
  });

  it("renders only visible scores within the full replay seek domain", () => {
    expect(source).toContain("data={visibleScoreSeries}");
    expect(source).toContain(
      "ticks={visibleTurnStarts.map((item) => item.eventIndex)}"
    );
    expect(source).toContain("domain={[0, Math.max(eventCount - 1, 0)]}");
    expect(source).toContain("allowDataOverflow");
    expect(source).toContain("eventCount = scoreSeries.length");
  });
});
