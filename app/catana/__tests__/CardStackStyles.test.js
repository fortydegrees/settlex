import { describe, it, expect } from "vitest";
import { getBadgeClasses } from "../components/CardStackStyles";

describe("getBadgeClasses", () => {
  it("returns danger styles when tone is danger", () => {
    expect(getBadgeClasses("danger")).toContain("bg-rose-100");
    expect(getBadgeClasses("danger")).toContain("text-rose-600");
  });

  it("returns default styles when tone is default", () => {
    expect(getBadgeClasses("default")).toContain("bg-blue-50");
    expect(getBadgeClasses("default")).toContain("top-0");
    expect(getBadgeClasses("default")).toContain("right-0");
    expect(getBadgeClasses("default")).toContain("translate-x-1/2");
  });

  it("returns inset positioning when requested", () => {
    expect(getBadgeClasses("default", "inset")).toContain("top-1");
    expect(getBadgeClasses("default", "inset")).toContain("right-1");
  });
});
