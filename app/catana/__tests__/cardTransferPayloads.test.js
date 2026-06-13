import { describe, expect, it } from "vitest";
import {
  buildDevCardBuyTransfer,
  buildDiscardTransfers,
  buildMaritimeTradeTransfers,
  buildRobberStealTransfers
} from "../utils/cardTransferPayloads";

describe("cardTransferPayloads", () => {
  it("builds public dev-card purchase transfer payloads", () => {
    expect(buildDevCardBuyTransfer({ playerId: "1" })).toEqual([
      {
        kind: "dev",
        fromKind: "bank",
        toKind: "player",
        toPlayerId: "1",
        cueName: "devcard:buy:public",
        startScale: 0.72,
        endScale: 0.86
      }
    ]);
  });

  it("builds maritime trade give and receive transfers", () => {
    expect(
      buildMaritimeTradeTransfers({
        playerId: "0",
        give: ["Ore", "Ore"],
        receive: ["Brick"]
      })
    ).toEqual([
      {
        kind: "resource",
        resource: "Ore",
        fromKind: "player",
        toKind: "bank",
        fromPlayerId: "0",
        hidden: false
      },
      {
        kind: "resource",
        resource: "Ore",
        fromKind: "player",
        toKind: "bank",
        fromPlayerId: "0",
        hidden: false
      },
      {
        kind: "resource",
        resource: "Brick",
        fromKind: "bank",
        toKind: "player",
        toPlayerId: "0",
        hidden: false
      }
    ]);
  });

  it("builds discard transfers with smaller destination scale", () => {
    expect(
      buildDiscardTransfers({
        playerId: "2",
        resources: ["Wood", "Sheep"]
      })
    ).toEqual([
      {
        kind: "resource",
        resource: "Wood",
        fromKind: "player",
        toKind: "discard",
        fromPlayerId: "2",
        hidden: false,
        endScale: 0.72
      },
      {
        kind: "resource",
        resource: "Sheep",
        fromKind: "player",
        toKind: "discard",
        fromPlayerId: "2",
        hidden: false,
        endScale: 0.72
      }
    ]);
  });

  it("marks robber steal transfers hidden until the stolen resource is visible", () => {
    expect(
      buildRobberStealTransfers({
        payload: { victimId: "1", thiefId: "0" },
        visibleResource: null
      })
    ).toEqual([
      {
        kind: "resource",
        resource: "hidden",
        fromKind: "player",
        toKind: "player",
        fromPlayerId: "1",
        toPlayerId: "0",
        hidden: true,
        cueName: "resource:travel:start"
      }
    ]);

    expect(
      buildRobberStealTransfers({
        payload: { victimId: "1", thiefId: "0" },
        visibleResource: "Ore"
      })[0]
    ).toMatchObject({
      resource: "Ore",
      hidden: false
    });
  });
});
