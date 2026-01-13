import { describe, it, expect } from "vitest";
import { getCardStackLayout } from "../components/CardStackLayout";

describe("getCardStackLayout", () => {
  it("uses a placeholder card when count is 0", () => {
    const layout = getCardStackLayout({
      count: 0,
      cardWidth: 52,
      stackOffset: 16,
      maxVisible: 3,
    });

    expect(layout.visibleCount).toBe(1);
    expect(layout.width).toBe(52);
    expect(layout.isEmpty).toBe(true);
    expect(layout.showBadge).toBe(false);
  });

  it("clamps visible cards to maxVisible", () => {
    const layout = getCardStackLayout({
      count: 5,
      cardWidth: 52,
      stackOffset: 16,
      maxVisible: 3,
    });

    expect(layout.visibleCount).toBe(3);
    expect(layout.width).toBe(52 + 2 * 16);
    expect(layout.showBadge).toBe(true);
  });

  it("shows the full stack when maxVisible is omitted", () => {
    const layout = getCardStackLayout({
      count: 2,
      cardWidth: 52,
      stackOffset: 16,
    });

    expect(layout.visibleCount).toBe(2);
    expect(layout.width).toBe(52 + 16);
    expect(layout.showBadge).toBe(false);
  });

  it("keeps width based on count when maxVisible is larger", () => {
    const layout = getCardStackLayout({
      count: 2,
      cardWidth: 52,
      stackOffset: 16,
      maxVisible: 3,
    });

    expect(layout.visibleCount).toBe(2);
    expect(layout.width).toBe(52 + 16);
  });

  it("caps width and tightens offset when ideal width exceeds the cap", () => {
    const layout = getCardStackLayout({
      count: 4,
      cardWidth: 52,
      stackOffset: 16,
      maxStackWidth: 90,
    });

    expect(layout.width).toBe(90);
    expect(layout.offset).toBeCloseTo((90 - 52) / 3, 4);
  });

  it("never shrinks below a single card width", () => {
    const layout = getCardStackLayout({
      count: 3,
      cardWidth: 52,
      stackOffset: 16,
      maxStackWidth: 40,
    });

    expect(layout.width).toBe(52);
    expect(layout.offset).toBe(0);
  });
});
