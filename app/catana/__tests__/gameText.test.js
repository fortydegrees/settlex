import { describe, expect, it } from "vitest";
import { formatLogEntry, STATUS_TEXT } from "../utils/gameText";

describe("formatLogEntry", () => {
  it("returns player + resource tokens", () => {
    const entry = {
      type: "discard",
      actorId: "1",
      data: { resources: { Ore: 2, Wheat: 1 } }
    };
    const tokens = formatLogEntry(entry, { "1": "Bren" });
    expect(tokens[0]).toMatchObject({
      kind: "player",
      id: "1",
      name: "Bren"
    });
    expect(
      tokens.some(
        (token) =>
          token.kind === "resource" &&
          token.resource === "Ore" &&
          token.count === 2
      )
    ).toBe(true);
  });
});

describe("STATUS_TEXT", () => {
  it("contains Roll Dice copy", () => {
    expect(STATUS_TEXT.ROLLING).toBe("Roll Dice");
  });
});
