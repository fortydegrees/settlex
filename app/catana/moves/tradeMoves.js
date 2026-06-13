import { applyMaritimeTradeBatch } from "@settlex/game-core";
import { appendGameLog } from "../utils/gameLog.js";
import { countResources } from "./resourceCounts.js";

export const maritimeTrade = {
  move: (context, trade) => {
    const { G, playerID, ctx, effects } = context;

    const receive = Array.isArray(trade?.receive)
      ? trade.receive
      : trade?.receive
        ? [trade.receive]
        : [];

    if (!trade || !Array.isArray(trade.give) || receive.length === 0) {
      console.log("Invalid trade format");
      return;
    }

    const result = applyMaritimeTradeBatch(G.core, G.coreTopology, playerID, {
      give: trade.give,
      receive
    });

    if (!result.ok) {
      console.log(`Invalid maritime trade: ${result.error}`);
      return;
    }
    appendGameLog(G, context.ctx, {
      type: "trade:maritime",
      actorId: playerID,
      data: {
        give: countResources(trade.give),
        receive: countResources(receive)
      }
    });
    effects?.maritimeTrade?.({
      effectId: `trade:maritime:${playerID}:turn-${ctx?.turn ?? "unknown"}`,
      playerId: playerID,
      give: [...trade.give],
      receive: [...receive]
    });
  }
};
