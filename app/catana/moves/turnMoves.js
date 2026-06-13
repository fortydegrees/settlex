import {
  applyDiscard,
  applyEndTurn,
  applyRollDice,
  createBalancedDiceState,
  drawBalancedDice
} from "@settlex/game-core";
import { appendGameLog } from "../utils/gameLog.js";
import { beginRobberMoveStage } from "./robberMoves.js";
import { countResources } from "./resourceCounts.js";
import {
  logResourceDistributions,
  logResourceShortages
} from "./resourceLogging.js";

const drawDiceForRoll = ({ G, ctx, random }) => {
  if (G.core?.ruleset?.diceMode !== "balanced") {
    return random.D6(2);
  }

  const playerIds = G.core?.players ?? ctx?.playOrder ?? [];
  if (!G.diceState || G.diceState.mode !== "balanced") {
    G.diceState = createBalancedDiceState(playerIds);
  }

  return drawBalancedDice(G.diceState, {
    playerId: String(ctx?.currentPlayer ?? G.core?.turn?.currentPlayerId ?? "0"),
    playerIds: playerIds.map(String),
    rng: () => random.Number()
  });
};

export const rollDice = {
  canDo: () => console.log("hi roll dive"),
  move: (context, options) => {
    const { G, random, effects, events } = context;
    const roll = drawDiceForRoll(context);
    G.diceRoll = roll;
    effects?.roll?.([roll[0], roll[1]]);

    const diceScore = roll[0] + roll[1];
    const result = applyRollDice(G.core, G.coreTopology, diceScore);
    if (!result.ok) {
      console.log("Invalid dice roll");
      return;
    }
    appendGameLog(G, context.ctx, {
      type: "roll",
      actorId: context.ctx?.currentPlayer,
      data: { dice: roll, total: diceScore },
      forced: options?.forced
    });
    logResourceDistributions(G, context.ctx, result.distributions, options);
    logResourceShortages(G, context.ctx, result.shortages, options);

    const hasDistributions = result.distributions?.length > 0;
    const hasBlocked = result.blockedTiles?.length > 0;

    if (hasDistributions || hasBlocked) {
      const cardAnims = (result.distributions || []).map((d) => {
        const tile = G.tiles.find((t) => t.tile.id === d.tileId);
        return {
          tileId: d.tileId,
          coordinate: tile?.coordinate ? [...tile.coordinate] : null,
          playerID: d.playerId,
          resource: d.resource
        };
      });

      effects?.distributeCardsFromTile?.({
        cards: cardAnims,
        blockedTileIds: result.blockedTiles || []
      });
    }

    if (G.core.turn.phase.startsWith("robber")) {
      if (G.core.turn.phase === "robberDiscard") {
        const pendingPlayers = G.core.turn.pendingDiscards;
        const activePlayersConfig = {};

        pendingPlayers.forEach((pid) => {
          activePlayersConfig[pid] = "robberDiscard";
        });

        events.setActivePlayers({
          others: null,
          value: activePlayersConfig
        });
      } else {
        beginRobberMoveStage(context, options);
      }
      return;
    }

    events.setStage("postRoll");
  }
};

export const endTurn = {
  move: (context, options) => {
    const { G, ctx, events } = context;
    if (G.core) {
      G.core.phase = ctx.phase === "placement" ? "placement" : "normal";
    }
    const result = applyEndTurn(G.core);
    if (!result.ok) {
      console.log(`Invalid end turn: ${result.error}`);
      return;
    }

    if (G.devCardPlay?.playerId === ctx.currentPlayer) {
      G.devCardPlay = null;
    }
    G.robberReturnToStage = null;

    appendGameLog(G, ctx, {
      type: "turn:end",
      actorId: ctx.currentPlayer,
      data: {},
      forced: options?.forced
    });

    const nextPlayerId = G.core.turn.currentPlayerId;
    events.endTurn({ next: nextPlayerId });
  }
};

export const discardResources = {
  move: (context, resources, options) => {
    const { G, playerID, events, ctx, effects } = context;
    const result = applyDiscard(G.core, playerID, resources);
    if (!result.ok) {
      console.log(`Invalid discard: ${result.error}`);
      return;
    }
    appendGameLog(G, context.ctx, {
      type: "discard",
      actorId: playerID,
      data: { resources: countResources(resources) },
      forced: options?.forced
    });
    effects?.discardResources?.({
      effectId: `discard:${playerID}:turn-${ctx?.turn ?? "unknown"}`,
      playerId: playerID,
      resources: [...resources]
    });

    if (G.core.turn.phase === "robberMove") {
      beginRobberMoveStage(context, options);
      return;
    }

    events.endStage();
  }
};

export const autoDiscard = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const playerID = context.playerID ?? ctx.currentPlayer;
    const player = G.core?.playerStateById?.[playerID];
    if (!player) {
      return;
    }
    const requiredCount = Math.floor(player.resources.length / 2);
    if (requiredCount <= 0) {
      return;
    }
    const shuffled = random?.Shuffle
      ? random.Shuffle([...player.resources])
      : [...player.resources];
    const toDiscard = shuffled.slice(0, requiredCount);
    appendGameLog(G, ctx, {
      type: "forced:discardSelection",
      actorId: "system",
      data: { playerId: playerID }
    });
    log.setMetadata({ message: `auto-discarding ${requiredCount} cards` });
    discardResources.move(context, toDiscard, { forced: true });
  }
};

export const autoRoll = {
  move: (context) => {
    rollDice.move(context, { forced: true });
  }
};

export const autoEndTurn = {
  move: (context) => {
    endTurn.move(context, { forced: true });
  }
};
