import { describe, expect, it } from "vitest";
import { getSystemAccountMenuItems } from "../home/systemAccountMenuModel";

describe("getSystemAccountMenuItems", () => {
  it("returns only production guest actions", () => {
    expect(
      getSystemAccountMenuItems("guest").map((item) => item.action)
    ).toEqual(["saveProfile", "identity", "signOut"]);
  });

  it("returns only production claimed-account actions", () => {
    expect(
      getSystemAccountMenuItems("claimed").map((item) => item.action)
    ).toEqual(["account", "identity", "signOut"]);
  });
});
