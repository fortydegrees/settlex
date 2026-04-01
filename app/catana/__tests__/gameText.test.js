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
      tokens.filter(
        (token) => token.kind === "resource" && token.resource === "Ore"
      )
    ).toHaveLength(2);
    expect(
      tokens.filter(
        (token) => token.kind === "resource" && token.resource === "Wheat"
      )
    ).toHaveLength(1);
    expect(
      tokens.some((token) => token.kind === "text" && token.text === ", ")
    ).toBe(false);
  });

  it("supports emoji + color metadata for player tokens", () => {
    const tokens = formatLogEntry(
      {
        type: "roll",
        actorId: "1",
        data: { dice: [3, 4] }
      },
      {
        "1": { name: "dp", emoji: "🦊", color: "blue" }
      }
    );
    expect(tokens[0]).toMatchObject({
      kind: "player",
      id: "1",
      name: "dp",
      emoji: "🦊",
      color: "blue"
    });
  });

  it("expands trade resources into icon-per-card tokens", () => {
    const tokens = formatLogEntry({
      type: "trade:maritime",
      actorId: "0",
      data: {
        give: { Wood: 2, Brick: 1 },
        receive: { Ore: 1 }
      }
    });
    expect(
      tokens.filter(
        (token) => token.kind === "resource" && token.resource === "Wood"
      )
    ).toHaveLength(2);
    expect(
      tokens.filter(
        (token) => token.kind === "resource" && token.resource === "Brick"
      )
    ).toHaveLength(1);
    expect(
      tokens.filter(
        (token) => token.kind === "resource" && token.resource === "Ore"
      )
    ).toHaveLength(1);
    expect(
      tokens.some((token) => token.kind === "text" && token.text === ", ")
    ).toBe(false);
  });

  it("skips forced marker entries", () => {
    expect(formatLogEntry({ type: "forced:roll" })).toEqual([]);
    expect(formatLogEntry({ type: "forced:endTurn" })).toEqual([]);
    expect(formatLogEntry({ type: "forced:placeSettlement" })).toEqual([]);
    expect(formatLogEntry({ type: "forced:placeRoad" })).toEqual([]);
    expect(formatLogEntry({ type: "forced:moveRobber" })).toEqual([]);
    expect(formatLogEntry({ type: "forced:discardSelection" })).toEqual([]);
    expect(formatLogEntry({ type: "forced:devCardResolution" })).toEqual([]);
  });

  it("does not append timeout tag for rolls", () => {
    const tokens = formatLogEntry({
      type: "roll",
      actorId: "0",
      forced: true,
      data: { dice: [1, 2], total: 3 }
    });
    expect(tokens.some((token) => token.kind === "text" && token.text === " (timeout)")).toBe(
      false
    );
  });

  it("does not append timeout tag for resource gains", () => {
    const tokens = formatLogEntry({
      type: "resource:gain",
      actorId: "0",
      forced: true,
      data: { resources: { Wheat: 1 } }
    });
    expect(tokens.some((token) => token.kind === "text" && token.text === " (timeout)")).toBe(
      false
    );
  });

  it("appends timeout tag for forced player actions", () => {
    const tokens = formatLogEntry({
      type: "build:settlement",
      actorId: "0",
      forced: true
    });
    expect(tokens.some((token) => token.kind === "text" && token.text === " (timeout)")).toBe(
      true
    );
  });

  it("renders a strong divider for main phase start", () => {
    const tokens = formatLogEntry({ type: "phase:main" });
    expect(tokens).toEqual([{ kind: "divider", variant: "strong" }]);
  });

  it("renders a strong divider for placement phase start", () => {
    const tokens = formatLogEntry({ type: "phase:placement" });
    expect(tokens).toEqual([{ kind: "divider", variant: "strong" }]);
  });

  it("formats game over entries", () => {
    const tokens = formatLogEntry(
      {
        type: "game:over",
        actorId: "1",
        data: { winnerId: "1" }
      },
      { "1": "Ada" }
    );
    expect(tokens.map((t) => t.kind)).toContain("player");
    expect(
      tokens.some((t) => t.kind === "text" && t.text.includes("won"))
    ).toBe(true);
  });

  it("formats server disconnect entries with a server label", () => {
    const tokens = formatLogEntry(
      {
        type: "server:disconnect",
        data: { playerId: "1" }
      },
      { "1": "Bren" }
    );
    expect(tokens[0]).toMatchObject({
      kind: "label",
      text: "server",
      variant: "server"
    });
    expect(tokens[1]).toMatchObject({
      kind: "player",
      id: "1",
      name: "Bren"
    });
    expect(
      tokens.some(
        (token) =>
          token.kind === "text" &&
          token.text.includes("Reconnect window started")
      )
    ).toBe(true);
  });

  it("formats server resign entries with loser and winner names", () => {
    const tokens = formatLogEntry(
      {
        type: "server:resign",
        data: { playerId: "1", winnerId: "0" }
      },
      { "0": "Ada", "1": "Bren" }
    );
    expect(tokens[0]).toMatchObject({
      kind: "label",
      text: "server",
      variant: "server"
    });
    expect(tokens.some((token) => token.kind === "player" && token.id === "1")).toBe(
      true
    );
    expect(tokens.some((token) => token.kind === "player" && token.id === "0")).toBe(
      true
    );
    expect(
      tokens.some(
        (token) => token.kind === "text" && token.text.includes("resigned")
      )
    ).toBe(true);
  });

  it("formats longest road award entries", () => {
    const tokens = formatLogEntry(
      {
        type: "award:longestRoad",
        actorId: "1",
        data: { previousOwnerId: "0" }
      },
      { "0": "Ada", "1": "Bren" }
    );
    expect(
      tokens.some(
        (t) => t.kind === "text" && t.text.includes("Longest Road")
      )
    ).toBe(true);
    expect(
      tokens.some((t) => t.kind === "player" && t.id === "0")
    ).toBe(true);
  });

  it("formats largest army award entries", () => {
    const tokens = formatLogEntry(
      {
        type: "award:largestArmy",
        actorId: "1",
        data: { previousOwnerId: "0" }
      },
      { "0": "Ada", "1": "Bren" }
    );
    expect(
      tokens.some(
        (t) => t.kind === "text" && t.text.includes("Largest Army")
      )
    ).toBe(true);
    expect(
      tokens.some((t) => t.kind === "player" && t.id === "0")
    ).toBe(true);
  });

  it("formats robber skip entries", () => {
    const tokens = formatLogEntry(
      {
        type: "robber:skip",
        actorId: "1"
      },
      { "1": "Bren" }
    );
    expect(tokens[0]).toMatchObject({ kind: "player", id: "1", name: "Bren" });
    expect(
      tokens.some(
        (t) => t.kind === "text" && t.text.includes("no valid tile")
      )
    ).toBe(true);
  });
});

describe("STATUS_TEXT", () => {
  it("contains Roll Dice copy", () => {
    expect(STATUS_TEXT.ROLLING).toBe("Roll Dice");
  });
});
