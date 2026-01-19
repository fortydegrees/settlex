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

  it("skips forced roll/endTurn markers", () => {
    expect(formatLogEntry({ type: "forced:roll" })).toEqual([]);
    expect(formatLogEntry({ type: "forced:endTurn" })).toEqual([]);
  });

  it("does not append auto tag for rolls", () => {
    const tokens = formatLogEntry({
      type: "roll",
      actorId: "0",
      forced: true,
      data: { dice: [1, 2], total: 3 }
    });
    expect(tokens.some((token) => token.kind === "text" && token.text === " (auto)")).toBe(
      false
    );
  });

  it("does not append auto tag for resource gains", () => {
    const tokens = formatLogEntry({
      type: "resource:gain",
      actorId: "0",
      forced: true,
      data: { resources: { Wheat: 1 } }
    });
    expect(tokens.some((token) => token.kind === "text" && token.text === " (auto)")).toBe(
      false
    );
  });

  it("renders a strong divider for main phase start", () => {
    const tokens = formatLogEntry({ type: "phase:main" });
    expect(tokens).toEqual([{ kind: "divider", variant: "strong" }]);
  });
});

describe("STATUS_TEXT", () => {
  it("contains Roll Dice copy", () => {
    expect(STATUS_TEXT.ROLLING).toBe("Roll Dice");
  });
});
