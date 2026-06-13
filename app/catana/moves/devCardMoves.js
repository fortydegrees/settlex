import {
  applyFreeRoad,
  applyKnight,
  applyMonopoly,
  applyYearOfPlenty,
  buildableEdges,
  buyDevCard as applyBuyDevCard,
  canPlayDevCard,
  playDevCard
} from "@settlex/game-core";
import { appendGameLog } from "../utils/gameLog.js";
import { logAwardChanges } from "./awardLogging.js";
import {
  DEV_CARD_CHOICE_STAGE,
  STANDARD_RESOURCE_TYPES,
  buildAutoYearOfPlentyPayload,
  getDevCardReturnStage,
  isChoiceDevCardType,
  isDevCardChoiceStage
} from "./devCardFlow.js";
import {
  buildChoiceDevCardPlayPayload,
  buildKnightPlayPayload,
  buildMonopolyTransfers,
  buildRoadBuildingPlayPayload,
  getAwardOwners,
  hasMaskedOpponentResources,
  storePendingKnightPlayAnimation
} from "./devCardPresentation.js";
import { maybeLogGameOver } from "./gameOver.js";
import { pickRandom } from "./randomChoice.js";
import { beginRobberMoveStage } from "./robberMoves.js";
import { setCurrentPlayerStage } from "./stageControl.js";

export const buyDevCard = {
  client: false,
  move: (context) => {
    const { G, playerID, effects } = context;
    const result = applyBuyDevCard(G.core, playerID);
    if (!result.ok) {
      console.log(`Invalid buy dev card: ${result.error}`);
      return;
    }
    effects?.buyDevCardReveal?.({
      playerId: playerID,
      cardType: result.cardType
    });
    appendGameLog(G, context.ctx, {
      type: "dev:buy",
      actorId: playerID,
      data: {}
    });
    maybeLogGameOver(G, context.ctx);
  }
};

const isDevCardStage = (ctx, playerID) => {
  const stage = ctx.activePlayers?.[playerID];
  return stage === "preRoll" || stage === "postRoll";
};

const finishDevCardChoice = (context, devPlay) => {
  context.G.devCardPlay = null;
  setCurrentPlayerStage(context, getDevCardReturnStage(devPlay));
};

export const playDevCardStart = {
  move: (context, cardType, options) => {
    const { G, playerID, ctx, effects } = context;
    if (playerID !== ctx.currentPlayer) return;
    if (!isDevCardStage(ctx, playerID)) return;
    if (G.devCardPlay) return;
    if (cardType === "victoryPoint") return;
    if (!canPlayDevCard(G.core, playerID, cardType)) return;

    const currentStage = ctx.activePlayers?.[playerID] ?? "postRoll";
    if (cardType === "knight") {
      const previousAwards = getAwardOwners(G.core);
      const previousKnightsPlayed =
        G.core?.playerStateById?.[playerID]?.knightsPlayed ?? 0;
      const played = playDevCard(G.core, playerID, "knight");
      if (!played.ok) {
        console.log(`Invalid play dev card: ${played.error}`);
        return;
      }
      const result = applyKnight(G.core, playerID);
      if (!result.ok) {
        console.log(`Invalid knight: ${result.error}`);
        return;
      }
      appendGameLog(G, ctx, {
        type: "dev:play",
        actorId: playerID,
        data: { cardType: "knight" },
        forced: options?.forced
      });
      logAwardChanges(G, ctx, previousAwards, options, effects);
      maybeLogGameOver(G, ctx);
      const startPayload = buildKnightPlayPayload({
        G,
        ctx,
        playerId: playerID,
        phase: "start",
        startedFromStage: currentStage,
        previousKnightsPlayed,
        previousLargestArmyOwnerId: previousAwards.largestArmyOwnerId
      });
      storePendingKnightPlayAnimation(G, startPayload);
      effects?.devCardPlayStarted?.(startPayload);
      G.robberReturnToStage = currentStage;
      beginRobberMoveStage(context, options);
      return;
    }

    if (cardType === "roadBuilding") {
      const player = G.core?.playerStateById?.[playerID];
      if (!player || player.roadsRemaining <= 0) return;
      const previousRoadsRemaining = player.roadsRemaining;
      const legalEdges = buildableEdges(G.core, G.coreTopology, playerID, {
        initialPlacement: false
      });
      const pendingRoads = Math.min(2, player.roadsRemaining, legalEdges.length);
      if (pendingRoads <= 0) return;
      const startPayload = buildRoadBuildingPlayPayload({
        ctx,
        playerId: playerID,
        phase: "start",
        startedFromStage: currentStage,
        pendingRoads,
        previousRoadsRemaining,
        nextRoadsRemaining: player.roadsRemaining
      });
      G.devCardPlay = {
        type: "roadBuilding",
        playerId: playerID,
        pendingRoads,
        effectId: startPayload.effectId,
        startedFromStage: currentStage,
        previousRoadsRemaining
      };
      effects?.devCardPlayStarted?.(startPayload);
      return;
    }

    if (cardType === "yearOfPlenty" || cardType === "monopoly") {
      const startPayload = buildChoiceDevCardPlayPayload({
        ctx,
        playerId: playerID,
        cardType,
        phase: "start",
        startedFromStage: currentStage
      });
      G.devCardPlay = {
        type: cardType,
        playerId: playerID,
        effectId: startPayload.effectId,
        startedFromStage: currentStage
      };
      effects?.devCardPlayStarted?.(startPayload);
      setCurrentPlayerStage(context, DEV_CARD_CHOICE_STAGE);
    }
  }
};

export const confirmDevCardPlay = {
  move: (context, payload, options) => {
    const { G, playerID, ctx, effects } = context;
    const devPlay = G.devCardPlay;
    if (!devPlay || devPlay.playerId !== playerID) return;
    if (playerID !== ctx.currentPlayer) return;
    if (!isDevCardChoiceStage(ctx, playerID)) return;

    let applied = { ok: false, error: "unknown" };
    let resolvePayload = null;
    if (devPlay.type === "yearOfPlenty") {
      applied = applyYearOfPlenty(G.core, playerID, payload);
      resolvePayload = buildChoiceDevCardPlayPayload({
        ctx,
        playerId: playerID,
        cardType: devPlay.type,
        phase: "resolve",
        startedFromStage: devPlay.startedFromStage,
        effectId: devPlay.effectId,
        resources: Array.isArray(payload) ? payload : []
      });
    } else if (devPlay.type === "monopoly") {
      const transfersAreKnown = !hasMaskedOpponentResources(G.core, playerID);
      const transfers = transfersAreKnown
        ? buildMonopolyTransfers(G.core, playerID, payload)
        : [];
      applied = applyMonopoly(G.core, playerID, payload);
      if (transfersAreKnown) {
        resolvePayload = buildChoiceDevCardPlayPayload({
          ctx,
          playerId: playerID,
          cardType: devPlay.type,
          phase: "resolve",
          startedFromStage: devPlay.startedFromStage,
          effectId: devPlay.effectId,
          resource: payload,
          transfers,
          totalTransferred: transfers.reduce((total, entry) => total + entry.count, 0)
        });
      }
    } else {
      return;
    }

    if (!applied.ok) {
      console.log(`Invalid dev card play: ${applied.error}`);
      return;
    }

    const played = playDevCard(G.core, playerID, devPlay.type);
    if (!played.ok) {
      console.log(`Invalid play dev card: ${played.error}`);
      return;
    }
    appendGameLog(G, ctx, {
      type: "dev:play",
      actorId: playerID,
      data: { cardType: devPlay.type },
      forced: options?.forced
    });
    if (devPlay.type === "monopoly") {
      appendGameLog(G, ctx, {
        type: "dev:monopolyResult",
        actorId: playerID,
        data: {
          resource: applied.resource,
          amountStolen: applied.amountStolen ?? 0
        },
        forced: options?.forced
      });
    }

    if (resolvePayload) {
      effects?.devCardPlayResolved?.(resolvePayload);
    }
    finishDevCardChoice(context, devPlay);
  }
};

export const autoResolveDevCard = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const devPlay = G.devCardPlay;
    if (!devPlay || devPlay.playerId !== ctx.currentPlayer) return;
    if (!isDevCardChoiceStage(ctx, devPlay.playerId)) return;
    appendGameLog(G, ctx, {
      type: "forced:devCardResolution",
      actorId: "system",
      data: { playerId: devPlay.playerId, cardType: devPlay.type }
    });

    if (devPlay.type === "yearOfPlenty") {
      const payload = buildAutoYearOfPlentyPayload(G.core, random);
      log.setMetadata({ message: "auto-resolving Year of Plenty" });
      confirmDevCardPlay.move(context, payload, { forced: true });
      return;
    }

    if (devPlay.type === "monopoly") {
      const choice = pickRandom(STANDARD_RESOURCE_TYPES, random);
      if (!choice) return;
      log.setMetadata({ message: "auto-resolving Monopoly" });
      confirmDevCardPlay.move(context, choice, { forced: true });
    }
  }
};

export const cancelDevCardPlay = {
  move: (context) => {
    const { G, playerID } = context;
    if (!G.devCardPlay || G.devCardPlay.playerId !== playerID) return;
    if (isChoiceDevCardType(G.devCardPlay.type)) return;
    G.devCardPlay = null;
  }
};

export const placeRoadFromDevCard = {
  move: (context, edge, options) => {
    const { G, playerID, ctx, effects } = context;
    const devPlay = G.devCardPlay;
    if (!devPlay || devPlay.type !== "roadBuilding") return;
    if (devPlay.playerId !== playerID) return;
    if (!isDevCardStage(ctx, playerID)) return;

    const previousAwards = getAwardOwners(G.core);
    const result = applyFreeRoad(G.core, G.coreTopology, edge, playerID);
    if (!result.ok) {
      console.log(`Invalid dev road: ${result.error}`);
      return;
    }
    effects?.placePiece?.({
      pieceType: "road",
      id: edge,
      playerId: playerID,
      initialPlacement: ctx.phase === "placement"
    });
    appendGameLog(G, ctx, {
      type: "build:road",
      actorId: playerID,
      data: { edgeId: edge, free: true, via: "devCard" },
      forced: options?.forced
    });
    logAwardChanges(G, ctx, previousAwards, options, effects);
    maybeLogGameOver(G, ctx);

    devPlay.pendingRoads -= 1;
    const remainingLegalEdges = buildableEdges(G.core, G.coreTopology, playerID, {
      initialPlacement: false
    });
    if (devPlay.pendingRoads <= 0 || remainingLegalEdges.length === 0) {
      const played = playDevCard(G.core, playerID, "roadBuilding");
      if (!played.ok) {
        console.log(`Invalid play dev card: ${played.error}`);
        return;
      }
      appendGameLog(G, ctx, {
        type: "dev:play",
        actorId: playerID,
        data: { cardType: "roadBuilding" },
        forced: options?.forced
      });
      effects?.devCardPlayResolved?.(
        buildRoadBuildingPlayPayload({
          ctx,
          playerId: playerID,
          phase: "resolve",
          startedFromStage: devPlay.startedFromStage,
          pendingRoads: devPlay.pendingRoads,
          previousRoadsRemaining: devPlay.previousRoadsRemaining,
          nextRoadsRemaining:
            G.core?.playerStateById?.[playerID]?.roadsRemaining ?? null,
          effectId: devPlay.effectId
        })
      );
      G.devCardPlay = null;
    }
  }
};
