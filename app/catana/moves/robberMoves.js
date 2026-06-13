import {
  applyMoveRobber,
  canPlaceRobber,
  getRobberVictims
} from "@settlex/game-core";
import { TileTypes } from "../types.js";
import { appendGameLog } from "../utils/gameLog.js";
import { emitPendingDevCardPlayResolved } from "./devCardPresentation.js";
import { pickRandom } from "./randomChoice.js";
import { setCurrentPlayerStage } from "./stageControl.js";

const getTileLogData = (G, tileId) => {
  const tile = G?.tiles?.find((entry) => String(entry?.tile?.id) === String(tileId));
  return {
    tileId,
    tileResource: tile?.tile?.resource ?? null,
    tileNumber: tile?.tile?.number ?? null
  };
};

const getRobberCandidateTileIds = (G) => {
  const tiles = G?.tiles ?? [];
  return tiles
    .filter((tile) => tile.type === TileTypes.LAND)
    .map((tile) => tile.tile.id)
    .filter((tileId) => tileId !== G.core?.robberTileId)
    .filter((tileId) => canPlaceRobber(G.core, G.coreTopology, tileId));
};

const getRobberReturnStage = (context) =>
  context.G.robberReturnToStage ||
  context.ctx.activePlayers?.[context.ctx.currentPlayer]?.returnTo ||
  "postRoll";

const finishRobberResolution = (context) => {
  const { G } = context;
  const returnTo = getRobberReturnStage(context);
  if (G.core) {
    G.core.turn.phase = returnTo === "preRoll" ? "preRoll" : "postRoll";
  }
  G.robberReturnToStage = null;
  setCurrentPlayerStage(context, returnTo);
  emitPendingDevCardPlayResolved(context);
  return returnTo;
};

const skipRobberMoveNoValidTile = (context, options) => {
  const { G, ctx } = context;
  appendGameLog(G, ctx, {
    type: "robber:skip",
    actorId: ctx.currentPlayer,
    data: { reason: "no-valid-tile" },
    forced: options?.forced
  });
  return finishRobberResolution(context);
};

export const beginRobberMoveStage = (context, options) => {
  const { G } = context;
  if (getRobberCandidateTileIds(G).length === 0) {
    skipRobberMoveNoValidTile(context, options);
    return false;
  }
  setCurrentPlayerStage(context, "moveRobber");
  return true;
};

export const moveRobber = {
  move: (context, tileID, options) => {
    const { G, ctx, random, effects } = context;
    const fromTileId = G.core?.robberTileId ?? null;
    const stolenCardIndex = random.Number();
    const potentialVictims = getRobberVictims(
      G.core,
      G.coreTopology,
      tileID,
      ctx.currentPlayer
    ).filter((id) => (G.core?.playerStateById?.[id]?.resources?.length ?? 0) > 0);

    const selectedVictimId =
      potentialVictims.length === 1 ? potentialVictims[0] : undefined;
    const result = applyMoveRobber(
      G.core,
      G.coreTopology,
      tileID,
      ctx.currentPlayer,
      stolenCardIndex,
      selectedVictimId
    );
    if (!result.ok) {
      console.log(`Invalid robber placement on tile ${tileID}: ${result.error}`);
      return;
    }
    appendGameLog(G, ctx, {
      type: "robber:move",
      actorId: ctx.currentPlayer,
      data: getTileLogData(G, tileID),
      forced: options?.forced
    });
    effects?.robberMove?.({
      effectId: `robber:move:${ctx.currentPlayer}:${fromTileId}:${tileID}:turn-${ctx.turn ?? "unknown"}`,
      actorId: ctx.currentPlayer,
      fromTileId,
      toTileId: tileID,
      forced: Boolean(options?.forced)
    });
    if (potentialVictims.length === 1) {
      appendGameLog(G, ctx, {
        type: "robber:steal",
        actorId: ctx.currentPlayer,
        data: { victimId: potentialVictims[0] },
        forced: options?.forced
      });
      effects?.robberSteal?.({
        effectId: `robber:steal:${ctx.currentPlayer}:${potentialVictims[0]}:turn-${ctx.turn ?? "unknown"}`,
        thiefId: ctx.currentPlayer,
        victimId: potentialVictims[0]
      });
    }

    finishRobberResolution(context);
  }
};

export const autoMoveRobber = {
  move: (context) => {
    const { G, ctx, random, log, effects } = context;
    const candidates = getRobberCandidateTileIds(G);
    const tileId = pickRandom(candidates, random);
    if (tileId == null) {
      log?.setMetadata?.({ message: "auto-robber: no valid tile, skipping" });
      skipRobberMoveNoValidTile(context, { forced: true });
      return;
    }
    const potentialVictims = getRobberVictims(
      G.core,
      G.coreTopology,
      tileId,
      ctx.currentPlayer
    ).filter((id) => (G.core?.playerStateById?.[id]?.resources?.length ?? 0) > 0);
    appendGameLog(G, ctx, {
      type: "forced:moveRobber",
      actorId: "system",
      data: { playerId: ctx.currentPlayer }
    });
    const stolenCardIndex = random?.Number ? random.Number() : 0;
    let selectedVictimId = potentialVictims.length === 1 ? potentialVictims[0] : undefined;
    const fromTileId = G.core?.robberTileId ?? null;
    let result = applyMoveRobber(
      G.core,
      G.coreTopology,
      tileId,
      ctx.currentPlayer,
      stolenCardIndex
    );
    if (!result.ok && result.error === "ambiguous-victim") {
      const victims = getRobberVictims(
        G.core,
        G.coreTopology,
        tileId,
        ctx.currentPlayer
      );
      const victimId = pickRandom(victims, random);
      if (victimId) {
        selectedVictimId = victimId;
        result = applyMoveRobber(
          G.core,
          G.coreTopology,
          tileId,
          ctx.currentPlayer,
          stolenCardIndex,
          victimId
        );
      }
    }

    if (!result.ok) {
      console.log(`Invalid robber placement on tile ${tileId}: ${result.error}`);
      return;
    }
    appendGameLog(G, ctx, {
      type: "robber:move",
      actorId: ctx.currentPlayer,
      data: getTileLogData(G, tileId),
      forced: true
    });
    effects?.robberMove?.({
      effectId: `robber:move:${ctx.currentPlayer}:${fromTileId}:${tileId}:turn-${ctx.turn ?? "unknown"}:forced`,
      actorId: ctx.currentPlayer,
      fromTileId,
      toTileId: tileId,
      forced: true
    });
    if (selectedVictimId) {
      appendGameLog(G, ctx, {
        type: "robber:steal",
        actorId: ctx.currentPlayer,
        data: { victimId: selectedVictimId },
        forced: true
      });
      effects?.robberSteal?.({
        effectId: `robber:steal:${ctx.currentPlayer}:${selectedVictimId}:turn-${ctx.turn ?? "unknown"}`,
        thiefId: ctx.currentPlayer,
        victimId: selectedVictimId
      });
    }

    log.setMetadata({ message: `auto-moving robber to ${tileId}` });
    finishRobberResolution(context);
  }
};
