import {
  applyFreeRoad,
  applyEndTurn,
  applyKnight,
  applyMonopoly,
  applyRollDice,
  applyYearOfPlenty,
  applyDiscard,
  applyMaritimeTradeBatch,
  buildableEdges,
  buyDevCard as applyBuyDevCard,
  canPlayDevCard,
  createBalancedDiceState,
  drawBalancedDice,
  playDevCard
} from "@settlex/game-core";
import { appendGameLog } from "./utils/gameLog.js";
import { logAwardChanges } from "./moves/awardLogging.js";
import {
  logResourceDistributions,
  logResourceShortages
} from "./moves/resourceLogging.js";
import {
  getBuildableEdges,
  getBuildableNodes,
  placeCity,
  placeRoad,
  placeSettlement,
  updateValids
} from "./moves/buildMoves.js";
import {
  autoMoveRobber,
  beginRobberMoveStage,
  moveRobber
} from "./moves/robberMoves.js";
import {
  DEV_CARD_CHOICE_STAGE,
  STANDARD_RESOURCE_TYPES,
  buildAutoYearOfPlentyPayload,
  getDevCardReturnStage,
  isChoiceDevCardType,
  isDevCardChoiceStage
} from "./moves/devCardFlow.js";
import {
  buildChoiceDevCardPlayPayload,
  buildKnightPlayPayload,
  buildMonopolyTransfers,
  buildRoadBuildingPlayPayload,
  getAwardOwners,
  hasMaskedOpponentResources,
  storePendingKnightPlayAnimation
} from "./moves/devCardPresentation.js";
import { maybeLogGameOver } from "./moves/gameOver.js";
import { pickRandom } from "./moves/randomChoice.js";
import { setCurrentPlayerStage } from "./moves/stageControl.js";

export {
  getBuildableEdges,
  getBuildableNodes,
  placeCity,
  placeRoad,
  placeSettlement,
  updateValids
} from "./moves/buildMoves.js";
export { autoMoveRobber, moveRobber } from "./moves/robberMoves.js";

const countResources = (resources = []) =>
  resources.reduce((acc, resource) => {
    acc[resource] = (acc[resource] ?? 0) + 1;
    return acc;
  }, {});

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

//need to allow arrays for both arguments
export const takeCardsFromBank = (context, cards, playerID) => {
  const { G } = context;
  console.log("giving cards", G, cards, playerID);

  const bank = G.core?.bank?.resources ?? [];
  const playerState = G.core?.playerStateById?.[playerID];
  if (!playerState) {
    return;
  }
  const playerHand = playerState.resources;
  const cardLog = [];
  for (const card of cards) {
    const cardIndex = bank.indexOf(card);

    // Check if the card exists in the bank
    if (cardIndex !== -1) {
      // Remove the card from the bank
      bank.splice(cardIndex, 1);

      // Add the card to the player's hand (assuming playerId is an identifier)
      playerHand.push(card);
      cardLog.push(card);
    }
  }
  context.log.setMetadata({
    message: `player ${playerID} received ${cardLog}`,
  });
};

export const readyUp = {
  ignoreStaleStateID: true,
  move: (context) => {
    const { G, ctx, playerID, events } = context;
    if (!playerID) return;
    if (!G.preGame) {
      G.preGame = { readyByPlayerId: {} };
    }
    G.preGame.readyByPlayerId[playerID] = true;

    const allPlayers = G.core?.players ?? ctx.playOrder ?? [];
    if (!Array.isArray(allPlayers) || allPlayers.length === 0) {
      return;
    }
    const allReady = allPlayers.every(
      (id) => G.preGame.readyByPlayerId?.[id]
    );
    if (allReady) {
      events.endPhase();
    }
  }
};

export const autoStartGame = {
  move: (context) => {
    const { events } = context;
    events.endPhase();
  }
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

    // Trigger resource distribution and blocked tile animations together
    const hasDistributions = result.distributions?.length > 0;
    const hasBlocked = result.blockedTiles?.length > 0;

    if (hasDistributions || hasBlocked) {
      const cardAnims = (result.distributions || []).map(d => {
        const tile = G.tiles.find(t => t.tile.id === d.tileId);
        return {
          tileId: d.tileId,
          coordinate: tile?.coordinate ? [...tile.coordinate] : null,
          playerID: d.playerId,
          resource: d.resource,
        };
      });

      // Pass combined payload so both flash simultaneously
      effects?.distributeCardsFromTile?.({
        cards: cardAnims,
        blockedTileIds: result.blockedTiles || [],
      });
    }

    if (G.core.turn.phase.startsWith("robber")) {
      if (G.core.turn.phase === "robberDiscard") {
        const pendingPlayers = G.core.turn.pendingDiscards;
        const activePlayersConfig = {};

        pendingPlayers.forEach(pid => {
          activePlayersConfig[pid] = "robberDiscard";
        });

        events.setActivePlayers({
          others: null,
          value: activePlayersConfig,
        });

      } else {
        beginRobberMoveStage(context, options);
      }
      return;
    }

    events.setStage("postRoll");
  },
};

export const getAvailableMoves = (context) => {};

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
    // Assume core G structure
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

    // After a successful discard, this player is done with this stage.
    // We remove them from the active players.
    events.endStage();
  }
};

export const autoPlaceSettlement = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const playerID = context.playerID ?? ctx.currentPlayer;
    const nodes =
      G.valids?.nodes?.length > 0
        ? G.valids.nodes
        : getBuildableNodes(playerID, G, ctx);
    const nodeId = pickRandom(nodes, random);
    if (nodeId == null) {
      return;
    }
    appendGameLog(G, ctx, {
      type: "forced:placeSettlement",
      actorId: "system",
      data: { playerId: playerID }
    });
    log.setMetadata({ message: `auto-placing settlement at ${nodeId}` });
    placeSettlement.move(context, nodeId, { forced: true });
  }
};

export const autoPlaceRoad = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const playerID = context.playerID ?? ctx.currentPlayer;
    const edges =
      G.valids?.edges?.length > 0
        ? G.valids.edges
        : buildableEdges(G.core, G.coreTopology, playerID, {
            initialPlacement: ctx.phase === "placement"
          });
    const edgeId = pickRandom(edges, random);
    if (!edgeId) {
      return;
    }
    appendGameLog(G, ctx, {
      type: "forced:placeRoad",
      actorId: "system",
      data: { playerId: playerID }
    });
    log.setMetadata({ message: `auto-placing road at ${edgeId}` });
    placeRoad.move(context, edgeId, { forced: true });
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

export const autoChooseSteal = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const playerID = ctx.currentPlayer;
    const victims = G.core?.players?.filter((id) => id !== playerID) ?? [];
    const victimId = pickRandom(victims, random);
    if (!victimId) {
      return;
    }
    log.setMetadata({ message: `auto-choosing steal target ${victimId}` });
  }
};

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
    const { G, playerID, ctx, events, effects } = context;
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
