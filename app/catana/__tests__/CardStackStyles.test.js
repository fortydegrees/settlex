import { describe, it, expect } from "vitest";
import { getBadgeClasses } from "../components/CardStackStyles";

describe("getBadgeClasses", () => {
  it("returns danger styles when tone is danger", () => {
    expect(getBadgeClasses("danger")).toContain("bg-rose-500");
  });

  it("returns default styles when tone is default", () => {
    expect(getBadgeClasses("default")).toContain("bg-blue-50");
  });
});
