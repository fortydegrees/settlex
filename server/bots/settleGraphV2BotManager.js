import { resolveStageKey } from "../stagePolicy.js";

const ALLOWED_WEBSITE_MOVES = new Set([
  "buyDevCard",
  "confirmDevCardPlay",
  "discardResources",
  "endTurn",
  "maritimeTrade",
  "moveRobber",
  "placeCity",
  "placeRoad",
  "placeRoadFromDevCard",
  "placeSettlement",
  "playDevCardStart",
  "rollDice"
]);

function validatePlannedMoves(plannedMoves) {
  if (!Array.isArray(plannedMoves) || plannedMoves.length === 0) {
    throw new Error("SettleGraph V2 returned an empty website move plan.");
  }
  return plannedMoves.map((planned) => {
    if (!ALLOWED_WEBSITE_MOVES.has(planned?.move)) {
      throw new Error(
        `SettleGraph V2 returned unsupported website move ${JSON.stringify(planned?.move)}.`
      );
    }
    if (!Array.isArray(planned.args)) {
      throw new Error(`SettleGraph V2 move ${planned.move} has invalid args.`);
    }
    return { move: planned.move, args: planned.args };
  });
}

export class SettleGraphV2BotManager {
  constructor({ client }) {
    if (!client) throw new Error("SettleGraphV2BotManager requires a worker client.");
    this.client = client;
  }

  async chooseMoves(state, playerID) {
    const playerId = String(playerID);
    const stageKey = resolveStageKey(state);
    if (stageKey === "preGame:waiting") {
      return [{ move: "readyUp", args: [] }];
    }

    if (stageKey === "main:devCardChoice") {
      return [{ move: "autoResolveDevCard", args: [] }];
    }

    if (stageKey === "main:robberDiscard") {
      const firstPending = state?.G?.core?.turn?.pendingDiscards?.[0];
      if (String(firstPending) !== playerId) return [];
    } else if (String(state?.ctx?.currentPlayer) !== playerId) {
      return [];
    }

    const decision = await this.client.decide({ playerId, state });
    return validatePlannedMoves(decision.plannedMoves);
  }

  close() {
    this.client.close();
  }
}
