const core = require("../../../game-core/dist/index.js");

const RESOURCE_TYPES = [
  core.ResourceType.WOOD,
  core.ResourceType.BRICK,
  core.ResourceType.SHEEP,
  core.ResourceType.WHEAT,
  core.ResourceType.ORE,
];

const DEV_CARD_TYPES = [
  "knight",
  "victoryPoint",
  "roadBuilding",
  "yearOfPlenty",
  "monopoly",
];

const MODE_ORDER = [
  "placement_settlement",
  "placement_road",
  "preRoll",
  "postRoll",
  "devRoadBuilding",
  "robberMove",
  "robberDiscard",
];

const LAND_TILE_RESOURCE_TYPES = [
  core.ResourceType.WOOD,
  core.ResourceType.BRICK,
  core.ResourceType.SHEEP,
  core.ResourceType.WHEAT,
  core.ResourceType.ORE,
  core.ResourceType.DESERT,
];

const ROLL_NUMBER_FEATURES = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

const PORT_FEATURES = [
  null,
  core.ResourceType.ANY,
  core.ResourceType.WOOD,
  core.ResourceType.BRICK,
  core.ResourceType.SHEEP,
  core.ResourceType.WHEAT,
  core.ResourceType.ORE,
];

function buildYearOfPlentyPairs() {
  const pairs = [];
  for (let i = 0; i < RESOURCE_TYPES.length; i += 1) {
    for (let j = i; j < RESOURCE_TYPES.length; j += 1) {
      pairs.push([RESOURCE_TYPES[i], RESOURCE_TYPES[j]]);
    }
  }
  return pairs;
}

function createRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(values, rng) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = values[i];
    values[i] = values[j];
    values[j] = tmp;
  }
  return values;
}

function sortEdgeId(a, b) {
  const [a0, a1] = a.split(",").map(Number);
  const [b0, b1] = b.split(",").map(Number);
  if (a0 !== b0) return a0 - b0;
  return a1 - b1;
}

function countResources(resources) {
  const counts = {};
  for (const card of resources) {
    counts[card] = (counts[card] ?? 0) + 1;
  }
  return counts;
}

function countDevCards(cards) {
  const counts = {};
  for (const card of cards) {
    counts[card] = (counts[card] ?? 0) + 1;
  }
  return counts;
}

function oneHot(value, vocabulary) {
  return vocabulary.map((entry) => (entry === value ? 1 : 0));
}

function getPipWeight(rollNumber) {
  if (!Number.isInteger(rollNumber)) {
    return 0;
  }
  if (typeof core.getNumDots === "function") {
    return core.getNumDots(rollNumber);
  }
  if (rollNumber < 7) {
    return rollNumber - 1;
  }
  return 13 - rollNumber;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function resolveRuleset(options) {
  const requested = options.rulesetId ?? "auto";
  if (requested === "duel") {
    return { rulesetId: "duel", rulesetSpec: core.DUEL_RULESET };
  }
  if (requested === "standard") {
    return { rulesetId: "standard", rulesetSpec: core.STANDARD_RULESET };
  }
  if (requested !== "auto") {
    throw new Error(`Unsupported rulesetId: ${requested}`);
  }
  if (options.numPlayers === 2) {
    return { rulesetId: "duel", rulesetSpec: core.DUEL_RULESET };
  }
  return { rulesetId: "standard", rulesetSpec: core.STANDARD_RULESET };
}

class SettlexSelfPlayEnv {
  constructor(options = {}) {
    this.options = {
      boardConfigId: options.boardConfigId ?? "standard-official",
      numPlayers: options.numPlayers ?? 4,
      rulesetId: options.rulesetId ?? "auto",
      maxSteps: options.maxSteps ?? 1200,
      includeActionMaskInObservation:
        options.includeActionMaskInObservation ?? true,
      friendlyRobber: options.friendlyRobber ?? true,
      vpRewardScale: options.vpRewardScale ?? 0.1,
      winReward: options.winReward ?? 1.0,
      lossReward: options.lossReward ?? -1.0,
      illegalActionPenalty: options.illegalActionPenalty ?? -0.05,
      stepPenalty: options.stepPenalty ?? 0.001,
    };

    if (this.options.numPlayers < 2 || this.options.numPlayers > 4) {
      throw new Error("numPlayers must be in [2, 4]");
    }

    this.closed = false;
    this.initialized = false;

    this.state = null;
    this.topology = null;
    this.tiles = null;

    this.players = [];
    this.placementOrder = [];
    this.placementIndex = 0;
    this.placementStage = "settlement";

    this.rng = null;
    this.seed = 0;
    this.steps = 0;
    this.done = false;
    this.truncated = false;

    this.actionCount = 0;
    this.baseObservationSize = 0;
    this.observationSchemaVersion = "v2";
    this.observationLayout = null;
    this.observationSchemaHash = "";
    this.actionSpaceHash = "";

    this.nodeIds = [];
    this.edgeIds = [];
    this.landTileIds = [];
    this.nodeFeatureById = new Map();
    this.landTileById = new Map();

    this.tradeActions = [];
    this.monopolyActions = [...RESOURCE_TYPES];
    this.yearOfPlentyActions = buildYearOfPlentyPairs();
    this.pendingRoadBuilding = null;
    this.pendingRobberReturnMode = null;
    this.modeOverride = null;
    this.rulesetId = "standard";

    this.actionLayout = {
      roll: 0,
      endTurn: 1,
      buyDevCard: 2,
      buildRoadOffset: 3,
      buildRoadCount: 0,
      settlementOffset: 0,
      settlementCount: 0,
      cityOffset: 0,
      cityCount: 0,
      tradeOffset: 0,
      tradeCount: 0,
      playKnight: -1,
      playRoadBuilding: -1,
      monopolyOffset: 0,
      monopolyCount: 0,
      yearOfPlentyOffset: 0,
      yearOfPlentyCount: 0,
      robberOffset: 0,
      robberCount: 0,
    };
  }

  close() {
    this.closed = true;
  }

  getSpec() {
    if (!this.initialized) {
      this.reset(this.seed);
    }

    const actionLabels = Array.from({ length: this.actionCount }, (_, i) =>
      this._actionLabel(i)
    );

    return {
      actionCount: this.actionCount,
      baseObservationSize: this.baseObservationSize,
      observationSize:
        this.baseObservationSize +
        (this.options.includeActionMaskInObservation ? this.actionCount : 0),
      observationSchemaVersion: this.observationSchemaVersion,
      observationLayout: this.observationLayout
        ? JSON.parse(JSON.stringify(this.observationLayout))
        : null,
      observationSchemaHash: this.observationSchemaHash,
      actionSpaceHash: this.actionSpaceHash,
      actionLayout: { ...this.actionLayout },
      modes: [...MODE_ORDER],
      players: [...this.players],
      boardConfigId: this.options.boardConfigId,
      numPlayers: this.options.numPlayers,
      rulesetId: this.rulesetId,
      maxSteps: this.options.maxSteps,
      includeActionMaskInObservation: this.options.includeActionMaskInObservation,
      actionLabels,
    };
  }

  reset(seed = 0) {
    this._ensureOpen();

    this.seed = Number(seed) || 0;
    this.rng = createRng(this.seed);

    this.steps = 0;
    this.done = false;
    this.truncated = false;

    this._initializeState();
    this._autoAdvanceForcedPhases();
    this.initialized = true;

    return this._buildOutput(0, {
      reset: true,
      illegalAction: false,
      selectedAction: null,
      requestedAction: null,
    });
  }

  step(action) {
    this._ensureOpen();
    if (!this.initialized) {
      throw new Error("step() called before reset()");
    }
    if (this.done || this.truncated) {
      throw new Error("step() called after episode finished");
    }

    this._autoAdvanceForcedPhases();

    const actorId = this._getActorId();
    const mask = this._computeActionMask(actorId);
    let selectedAction = Number(action);
    let illegalAction = false;

    if (!Number.isInteger(selectedAction) || selectedAction < 0 || selectedAction >= this.actionCount || mask[selectedAction] !== 1) {
      illegalAction = true;
      selectedAction = this._sampleLegalAction(mask);
      if (selectedAction === -1) {
        this.done = true;
        return this._buildOutput(this.options.illegalActionPenalty, {
          illegalAction: true,
          selectedAction: -1,
          requestedAction: action,
          error: "no-legal-actions",
        });
      }
    }

    const vpBefore = core.getVictoryPoints(this.state, actorId);
    const modeBefore = this._getMode();

    const applied = this._applyAction(selectedAction, actorId, modeBefore);
    if (!applied.ok) {
      illegalAction = true;
      const fallbackMask = this._computeActionMask(actorId);
      const fallbackAction = this._sampleLegalAction(fallbackMask);
      if (fallbackAction === -1) {
        this.done = true;
        return this._buildOutput(this.options.illegalActionPenalty, {
          illegalAction: true,
          requestedAction: action,
          selectedAction,
          error: applied.error,
        });
      }
      selectedAction = fallbackAction;
      const fallbackApplied = this._applyAction(selectedAction, actorId, modeBefore);
      if (!fallbackApplied.ok) {
        this.done = true;
        return this._buildOutput(this.options.illegalActionPenalty, {
          illegalAction: true,
          requestedAction: action,
          selectedAction,
          error: fallbackApplied.error,
        });
      }
    }

    this.steps += 1;
    if (this.steps >= this.options.maxSteps && !this.state.gameOver) {
      this.truncated = true;
    }

    this._autoAdvanceForcedPhases();

    if (this.state.gameOver) {
      this.done = true;
    }

    const vpAfter = core.getVictoryPoints(this.state, actorId);
    let reward = (vpAfter - vpBefore) * this.options.vpRewardScale - this.options.stepPenalty;

    if (illegalAction) {
      reward += this.options.illegalActionPenalty;
    }

    if (this.done && this.state.gameOver) {
      reward +=
        this.state.gameOver.winnerId === actorId
          ? this.options.winReward
          : this.options.lossReward;
    }

    return this._buildOutput(reward, {
      illegalAction,
      requestedAction: action,
      selectedAction,
      modeBefore,
    });
  }

  _ensureOpen() {
    if (this.closed) {
      throw new Error("Environment is closed");
    }
  }

  _initializeState() {
    this.players = Array.from({ length: this.options.numPlayers }, (_, i) =>
      String(i)
    );
    this.placementOrder = this._buildPlacementOrder(this.players);
    this.placementIndex = 0;
    this.placementStage = "settlement";
    this.pendingRoadBuilding = null;
    this.pendingRobberReturnMode = null;

    const boardConfig = core.resolveBoardConfig(this.options.boardConfigId);
    const { rulesetId, rulesetSpec } = resolveRuleset(this.options);
    this.tiles = core.generateBoard(boardConfig, () => this.rng());
    this.topology = core.buildTopology(this.tiles);
    this.state = core.createEmptyState(this.players, rulesetSpec);
    this.rulesetId = rulesetId;

    this.state.phase = "placement";
    this.state.turn.currentPlayerId = this.players[0];
    this.state.turn.phase = "preRoll";
    this.state.turn.hasRolled = false;
    this.state.turn.lastRollTotal = null;
    this.state.turn.pendingDiscards = [];

    const robberTile = this.tiles.find(
      (tile) => tile.tile.resource === core.ResourceType.DESERT
    );
    this.state.robberTileId = robberTile ? robberTile.tile.id : null;

    if (this.options.friendlyRobber) {
      this.state.ruleset.friendlyRobber = { enabled: true, vpThreshold: 2 };
    }

    this.nodeIds = [...this.topology.nodeIds].sort((a, b) => a - b);
    this.edgeIds = [...this.topology.edgeIds].sort(sortEdgeId);
    this.landTileIds = this.topology.tiles
      .filter((tile) => tile.type === core.TileTypes.LAND)
      .map((tile) => tile.tile.id)
      .sort((a, b) => a - b);
    this.landTileById = new Map(
      this.topology.tiles
        .filter((tile) => tile.type === core.TileTypes.LAND)
        .map((tile) => [tile.tile.id, tile])
    );
    this.nodeFeatureById = this._buildStaticNodeFeatures();

    this._configureActionSpace();
    this.observationLayout = this._buildObservationLayout();

    // Shuffle the development deck to match in-game setup behavior.
    shuffleInPlace(this.state.devDeck, this.rng);

    this.state.turn.currentPlayerId = this.placementOrder[this.placementIndex];

    // Build once to lock observation dimensions.
    const initialMask = this._computeActionMask(this._getActorId());
    const baseObs = this._buildBaseObservation(this._getActorId());
    this.baseObservationSize = baseObs.length;
    this.actionSpaceHash = hashString(
      JSON.stringify(
        Array.from({ length: this.actionCount }, (_, i) => this._actionLabel(i))
      )
    );
    this.observationSchemaHash = hashString(
      JSON.stringify({
        version: this.observationSchemaVersion,
        layout: this.observationLayout,
      })
    );

    // Guarantee dimensions are stable.
    if (initialMask.length !== this.actionCount) {
      throw new Error("Internal error: action mask length mismatch");
    }
  }

  _buildPlacementOrder(players) {
    if (players.length <= 1) {
      return [...players];
    }
    const forward = [...players];
    const reverse = [...players].reverse();
    return forward.concat(reverse);
  }

  _configureActionSpace() {
    const layout = this.actionLayout;
    layout.roll = 0;
    layout.endTurn = 1;
    layout.buyDevCard = 2;

    layout.buildRoadOffset = 3;
    layout.buildRoadCount = this.edgeIds.length;

    layout.settlementOffset = layout.buildRoadOffset + layout.buildRoadCount;
    layout.settlementCount = this.nodeIds.length;

    layout.cityOffset = layout.settlementOffset + layout.settlementCount;
    layout.cityCount = this.nodeIds.length;

    this.tradeActions = [];
    for (const give of RESOURCE_TYPES) {
      for (const receive of RESOURCE_TYPES) {
        if (give === receive) continue;
        this.tradeActions.push({ give, receive });
      }
    }

    layout.tradeOffset = layout.cityOffset + layout.cityCount;
    layout.tradeCount = this.tradeActions.length;

    layout.playKnight = layout.tradeOffset + layout.tradeCount;
    layout.playRoadBuilding = layout.playKnight + 1;

    layout.monopolyOffset = layout.playRoadBuilding + 1;
    layout.monopolyCount = this.monopolyActions.length;

    layout.yearOfPlentyOffset = layout.monopolyOffset + layout.monopolyCount;
    layout.yearOfPlentyCount = this.yearOfPlentyActions.length;

    layout.robberOffset = layout.yearOfPlentyOffset + layout.yearOfPlentyCount;
    layout.robberCount = this.landTileIds.length;

    this.actionCount = layout.robberOffset + layout.robberCount;

    this.edgeIndexById = new Map(
      this.edgeIds.map((edgeId, index) => [edgeId, index])
    );
    this.nodeIndexById = new Map(
      this.nodeIds.map((nodeId, index) => [nodeId, index])
    );
    this.landTileIndexById = new Map(
      this.landTileIds.map((tileId, index) => [tileId, index])
    );
  }

  _buildStaticNodeFeatures() {
    const featureByNodeId = new Map();
    const landTiles = [...this.landTileById.values()];

    for (const nodeId of this.nodeIds) {
      const pipByResource = {};
      for (const resource of RESOURCE_TYPES) {
        pipByResource[resource] = 0;
      }
      let totalPips = 0;

      for (const tile of landTiles) {
        const nodes = Object.values(tile.tile.nodes ?? {});
        if (!nodes.includes(nodeId)) {
          continue;
        }
        const resource = tile.tile.resource;
        if (!RESOURCE_TYPES.includes(resource)) {
          continue;
        }
        const pips = getPipWeight(tile.tile.number);
        pipByResource[resource] += pips;
        totalPips += pips;
      }

      featureByNodeId.set(nodeId, {
        port: this.topology.portsByNodeId[nodeId] ?? null,
        pipByResource,
        totalPips,
      });
    }

    return featureByNodeId;
  }

  _buildObservationLayout() {
    const perPlayerFeatureSize = 19;
    const globalSize =
      MODE_ORDER.length +
      this.players.length +
      this.players.length * perPlayerFeatureSize +
      11 +
      RESOURCE_TYPES.length +
      1 + // hasRolled
      1 + // pendingRoadBuilding roadsToPlace
      2 + // pendingRobberReturnMode one-hot
      this.nodeIds.length + // pending road start node one-hot
      1; // normalized step

    const tilesOffset = globalSize;
    const tileFeatureSize =
      LAND_TILE_RESOURCE_TYPES.length + ROLL_NUMBER_FEATURES.length + 1 + 1;
    const tileFeaturesSize = this.landTileIds.length * tileFeatureSize;

    const nodesOffset = tilesOffset + tileFeaturesSize;
    const nodeFeatureSize =
      PORT_FEATURES.length +
      RESOURCE_TYPES.length +
      1 + // total adjacent pips
      this.players.length * 2; // settlement/city occupancy
    const nodeFeaturesSize = this.nodeIds.length * nodeFeatureSize;

    const edgesOffset = nodesOffset + nodeFeaturesSize;
    const edgeFeatureSize = this.players.length + 1; // unowned + owner one-hot
    const edgeFeaturesSize = this.edgeIds.length * edgeFeatureSize;

    return {
      global: {
        offset: 0,
        size: globalSize,
        perPlayerFeatureSize,
      },
      tiles: {
        offset: tilesOffset,
        count: this.landTileIds.length,
        featureSize: tileFeatureSize,
        resourceOffset: 0,
        resourceSize: LAND_TILE_RESOURCE_TYPES.length,
        numberOffset: LAND_TILE_RESOURCE_TYPES.length,
        numberSize: ROLL_NUMBER_FEATURES.length,
        pipOffset: LAND_TILE_RESOURCE_TYPES.length + ROLL_NUMBER_FEATURES.length,
        robberOffset:
          LAND_TILE_RESOURCE_TYPES.length + ROLL_NUMBER_FEATURES.length + 1,
      },
      nodes: {
        offset: nodesOffset,
        count: this.nodeIds.length,
        featureSize: nodeFeatureSize,
        portOffset: 0,
        portSize: PORT_FEATURES.length,
        pipByResourceOffset: PORT_FEATURES.length,
        pipByResourceSize: RESOURCE_TYPES.length,
        totalPipsOffset: PORT_FEATURES.length + RESOURCE_TYPES.length,
        settlementOffset: PORT_FEATURES.length + RESOURCE_TYPES.length + 1,
        cityOffset:
          PORT_FEATURES.length + RESOURCE_TYPES.length + 1 + this.players.length,
      },
      edges: {
        offset: edgesOffset,
        count: this.edgeIds.length,
        featureSize: edgeFeatureSize,
        ownerOffset: 0,
        ownerSize: this.players.length + 1,
      },
      baseObservationSize: globalSize + tileFeaturesSize + nodeFeaturesSize + edgeFeaturesSize,
    };
  }

  _modeOneHot(mode) {
    return MODE_ORDER.map((value) => (value === mode ? 1 : 0));
  }

  _getMode() {
    if (this.modeOverride && MODE_ORDER.includes(this.modeOverride)) {
      return this.modeOverride;
    }
    if (this.state.phase === "placement") {
      return this.placementStage === "road"
        ? "placement_road"
        : "placement_settlement";
    }
    if (this.pendingRoadBuilding && this.pendingRoadBuilding.roadsToPlace > 0) {
      return "devRoadBuilding";
    }
    if (this.state.turn.phase === "preRoll") return "preRoll";
    if (this.state.turn.phase === "postRoll") return "postRoll";
    if (this.state.turn.phase === "robberMove" || this.state.turn.phase === "robberSteal") {
      return "robberMove";
    }
    if (this.state.turn.phase === "robberDiscard") return "robberDiscard";
    return "preRoll";
  }

  _getActorId() {
    if (this.state.phase === "placement") {
      return this.placementOrder[this.placementIndex];
    }
    if (this.pendingRoadBuilding && this.pendingRoadBuilding.roadsToPlace > 0) {
      return this.pendingRoadBuilding.playerId;
    }
    return this.state.turn.currentPlayerId;
  }

  _sampleLegalAction(mask) {
    const legal = [];
    for (let i = 0; i < mask.length; i += 1) {
      if (mask[i] === 1) legal.push(i);
    }
    if (legal.length === 0) return -1;
    const idx = Math.floor(this.rng() * legal.length);
    return legal[idx];
  }

  _actionLabel(action) {
    const l = this.actionLayout;
    if (action === l.roll) return "roll";
    if (action === l.endTurn) return "endTurn";
    if (action === l.buyDevCard) return "buyDevCard";

    if (action >= l.buildRoadOffset && action < l.buildRoadOffset + l.buildRoadCount) {
      const edgeId = this.edgeIds[action - l.buildRoadOffset];
      return `buildRoad:${edgeId}`;
    }
    if (
      action >= l.settlementOffset &&
      action < l.settlementOffset + l.settlementCount
    ) {
      const nodeId = this.nodeIds[action - l.settlementOffset];
      return `placeSettlement:${nodeId}`;
    }
    if (action >= l.cityOffset && action < l.cityOffset + l.cityCount) {
      const nodeId = this.nodeIds[action - l.cityOffset];
      return `buildCity:${nodeId}`;
    }
    if (action >= l.tradeOffset && action < l.tradeOffset + l.tradeCount) {
      const trade = this.tradeActions[action - l.tradeOffset];
      return `trade:${trade.give}->${trade.receive}`;
    }
    if (action === l.playKnight) {
      return "playDev:knight";
    }
    if (action === l.playRoadBuilding) {
      return "playDev:roadBuilding";
    }
    if (
      action >= l.monopolyOffset &&
      action < l.monopolyOffset + l.monopolyCount
    ) {
      const resource = this.monopolyActions[action - l.monopolyOffset];
      return `playDev:monopoly:${resource}`;
    }
    if (
      action >= l.yearOfPlentyOffset &&
      action < l.yearOfPlentyOffset + l.yearOfPlentyCount
    ) {
      const [first, second] =
        this.yearOfPlentyActions[action - l.yearOfPlentyOffset];
      return `playDev:yearOfPlenty:${first}+${second}`;
    }
    if (action >= l.robberOffset && action < l.robberOffset + l.robberCount) {
      const tileId = this.landTileIds[action - l.robberOffset];
      return `moveRobber:${tileId}`;
    }
    return "unknown";
  }

  _decodeAction(action) {
    const l = this.actionLayout;
    if (action === l.roll) return { type: "roll" };
    if (action === l.endTurn) return { type: "endTurn" };
    if (action === l.buyDevCard) return { type: "buyDevCard" };

    if (action >= l.buildRoadOffset && action < l.buildRoadOffset + l.buildRoadCount) {
      return {
        type: "buildRoad",
        edgeId: this.edgeIds[action - l.buildRoadOffset],
      };
    }
    if (
      action >= l.settlementOffset &&
      action < l.settlementOffset + l.settlementCount
    ) {
      return {
        type: "settlement",
        nodeId: this.nodeIds[action - l.settlementOffset],
      };
    }
    if (action >= l.cityOffset && action < l.cityOffset + l.cityCount) {
      return {
        type: "city",
        nodeId: this.nodeIds[action - l.cityOffset],
      };
    }
    if (action >= l.tradeOffset && action < l.tradeOffset + l.tradeCount) {
      const trade = this.tradeActions[action - l.tradeOffset];
      return { type: "trade", ...trade };
    }
    if (action === l.playKnight) {
      return { type: "playKnight" };
    }
    if (action === l.playRoadBuilding) {
      return { type: "playRoadBuilding" };
    }
    if (
      action >= l.monopolyOffset &&
      action < l.monopolyOffset + l.monopolyCount
    ) {
      const resource = this.monopolyActions[action - l.monopolyOffset];
      return { type: "playMonopoly", resource };
    }
    if (
      action >= l.yearOfPlentyOffset &&
      action < l.yearOfPlentyOffset + l.yearOfPlentyCount
    ) {
      const resources =
        this.yearOfPlentyActions[action - l.yearOfPlentyOffset];
      return { type: "playYearOfPlenty", resources };
    }
    if (action >= l.robberOffset && action < l.robberOffset + l.robberCount) {
      return {
        type: "robber",
        tileId: this.landTileIds[action - l.robberOffset],
      };
    }
    return { type: "invalid" };
  }

  _canBuyDevCard(actorId) {
    if (!this.state.ruleset.devCardsEnabled) return false;
    if (this.state.devDeck.length <= 0) return false;
    const player = this.state.playerStateById[actorId];
    if (!player) return false;
    const cost = this.state.ruleset.buildCosts.devCard;
    const counts = countResources(player.resources);
    for (const [resource, amount] of Object.entries(cost)) {
      if ((counts[resource] ?? 0) < (amount ?? 0)) {
        return false;
      }
    }
    return true;
  }

  _canTrade(actorId, give, receive) {
    if (give === receive) return false;
    const player = this.state.playerStateById[actorId];
    if (!player) return false;

    const rate = core.bestTradeRate(this.state, this.topology, actorId, give);
    const counts = countResources(player.resources);
    if ((counts[give] ?? 0) < rate) {
      return false;
    }

    if (this.state.ruleset.bank.finite) {
      const available = this.state.bank.resources.filter((r) => r === receive).length;
      if (available < 1) {
        return false;
      }
    }

    return true;
  }

  _canPlayDevCard(actorId, card) {
    return core.canPlayDevCard(this.state, actorId, card);
  }

  _canPlayYearOfPlentyPair(resources) {
    if (!this.state.ruleset.bank.finite) {
      return true;
    }
    const required = {};
    for (const resource of resources) {
      required[resource] = (required[resource] ?? 0) + 1;
    }
    for (const [resource, count] of Object.entries(required)) {
      const available = this.state.bank.resources.filter(
        (card) => card === resource
      ).length;
      if (available < count) {
        return false;
      }
    }
    return true;
  }

  _canStartRoadBuilding(actorId) {
    const player = this.state.playerStateById[actorId];
    if (!player) return false;
    if (player.roadsRemaining <= 0) return false;
    const legalEdges = core.buildableEdges(this.state, this.topology, actorId, {
      initialPlacement: false,
    });
    return legalEdges.length > 0;
  }

  _addPlayableDevActionsToMask(actorId, mask) {
    const l = this.actionLayout;

    if (this._canPlayDevCard(actorId, "knight")) {
      mask[l.playKnight] = 1;
    }

    if (
      this._canPlayDevCard(actorId, "roadBuilding") &&
      this._canStartRoadBuilding(actorId)
    ) {
      mask[l.playRoadBuilding] = 1;
    }

    if (this._canPlayDevCard(actorId, "monopoly")) {
      for (let i = 0; i < this.monopolyActions.length; i += 1) {
        mask[l.monopolyOffset + i] = 1;
      }
    }

    if (this._canPlayDevCard(actorId, "yearOfPlenty")) {
      for (let i = 0; i < this.yearOfPlentyActions.length; i += 1) {
        if (this._canPlayYearOfPlentyPair(this.yearOfPlentyActions[i])) {
          mask[l.yearOfPlentyOffset + i] = 1;
        }
      }
    }
  }

  _computeActionMask(actorId) {
    const mask = new Array(this.actionCount).fill(0);
    const mode = this._getMode();
    const l = this.actionLayout;

    if (mode === "placement_settlement") {
      const nodes = core.buildableNodes(this.state, this.topology, actorId, {
        initialPlacement: true,
      });
      for (const nodeId of nodes) {
        const nodeIndex = this.nodeIndexById.get(nodeId);
        if (nodeIndex !== undefined) {
          mask[l.settlementOffset + nodeIndex] = 1;
        }
      }
      return mask;
    }

    if (mode === "placement_road") {
      const fromNodeId = this.state.pendingRoadFromNodeIdByPlayer[actorId] ?? undefined;
      const edges = core.buildableEdges(this.state, this.topology, actorId, {
        initialPlacement: true,
        fromNodeId,
      });
      for (const edgeId of edges) {
        const edgeIndex = this.edgeIndexById.get(edgeId);
        if (edgeIndex !== undefined) {
          mask[l.buildRoadOffset + edgeIndex] = 1;
        }
      }
      return mask;
    }

    if (mode === "devRoadBuilding") {
      const player = this.state.playerStateById[actorId];
      if (!player || player.roadsRemaining <= 0) {
        return mask;
      }
      const edges = core.buildableEdges(this.state, this.topology, actorId, {
        initialPlacement: false,
      });
      for (const edgeId of edges) {
        const edgeIndex = this.edgeIndexById.get(edgeId);
        if (edgeIndex !== undefined) {
          mask[l.buildRoadOffset + edgeIndex] = 1;
        }
      }
      return mask;
    }

    if (mode === "preRoll") {
      mask[l.roll] = 1;
      this._addPlayableDevActionsToMask(actorId, mask);
      return mask;
    }

    if (mode === "robberMove") {
      for (const tileId of this.landTileIds) {
        if (tileId === this.state.robberTileId) continue;
        if (!core.canPlaceRobber(this.state, this.topology, tileId)) continue;
        const tileIndex = this.landTileIndexById.get(tileId);
        if (tileIndex !== undefined) {
          mask[l.robberOffset + tileIndex] = 1;
        }
      }
      if (!mask.some((v) => v === 1)) {
        for (const tileId of this.landTileIds) {
          if (!core.canPlaceRobber(this.state, this.topology, tileId)) continue;
          const tileIndex = this.landTileIndexById.get(tileId);
          if (tileIndex !== undefined) {
            mask[l.robberOffset + tileIndex] = 1;
          }
        }
      }
      return mask;
    }

    if (mode === "postRoll") {
      mask[l.endTurn] = 1;

      if (core.canBuildRoad(this.state, actorId).ok) {
        const edges = core.buildableEdges(this.state, this.topology, actorId, {
          initialPlacement: false,
        });
        for (const edgeId of edges) {
          const edgeIndex = this.edgeIndexById.get(edgeId);
          if (edgeIndex !== undefined) {
            mask[l.buildRoadOffset + edgeIndex] = 1;
          }
        }
      }

      if (core.canBuildSettlement(this.state, actorId).ok) {
        const nodes = core.buildableNodes(this.state, this.topology, actorId, {
          initialPlacement: false,
        });
        for (const nodeId of nodes) {
          const nodeIndex = this.nodeIndexById.get(nodeId);
          if (nodeIndex !== undefined) {
            mask[l.settlementOffset + nodeIndex] = 1;
          }
        }
      }

      if (core.canBuildCity(this.state, actorId).ok) {
        for (const nodeId of this.nodeIds) {
          const building = this.state.buildingsByNodeId[nodeId];
          if (!building) continue;
          if (building.ownerId !== actorId || building.type !== "settlement") continue;
          const nodeIndex = this.nodeIndexById.get(nodeId);
          if (nodeIndex !== undefined) {
            mask[l.cityOffset + nodeIndex] = 1;
          }
        }
      }

      if (core.canMaritimeTrade(this.state, this.topology, actorId).ok) {
        for (let i = 0; i < this.tradeActions.length; i += 1) {
          const trade = this.tradeActions[i];
          if (this._canTrade(actorId, trade.give, trade.receive)) {
            mask[l.tradeOffset + i] = 1;
          }
        }
      }

      if (this._canBuyDevCard(actorId)) {
        mask[l.buyDevCard] = 1;
      }

      this._addPlayableDevActionsToMask(actorId, mask);

      return mask;
    }

    if (mode === "robberDiscard") {
      // Forced phase handled automatically.
      return mask;
    }

    return mask;
  }

  _applyAction(action, actorId, modeBefore) {
    const decoded = this._decodeAction(action);

    if (decoded.type === "roll") {
      const dieA = 1 + Math.floor(this.rng() * 6);
      const dieB = 1 + Math.floor(this.rng() * 6);
      const total = dieA + dieB;
      return core.applyRollDice(this.state, this.topology, total);
    }

    if (decoded.type === "endTurn") {
      return core.applyEndTurn(this.state);
    }

    if (decoded.type === "buyDevCard") {
      return core.buyDevCard(this.state, actorId);
    }

    if (decoded.type === "buildRoad") {
      let result;
      if (modeBefore === "placement_road") {
        result = core.applyPlaceRoad(
          this.state,
          this.topology,
          decoded.edgeId,
          actorId,
          { initialPlacement: true }
        );
        if (result.ok) {
          this._advancePlacementAfterRoad();
        }
      } else if (modeBefore === "devRoadBuilding") {
        result = core.applyFreeRoad(
          this.state,
          this.topology,
          decoded.edgeId,
          actorId
        );
        if (result.ok) {
          this._advanceRoadBuildingAfterPlacement();
        }
      } else {
        result = core.applyBuildRoad(this.state, this.topology, decoded.edgeId, actorId);
      }
      return result;
    }

    if (decoded.type === "settlement") {
      let result;
      if (modeBefore === "placement_settlement") {
        result = core.applyPlaceSettlement(
          this.state,
          this.topology,
          decoded.nodeId,
          actorId,
          { initialPlacement: true }
        );
        if (result.ok) {
          this.placementStage = "road";
          this.state.turn.currentPlayerId = actorId;
        }
      } else {
        result = core.applyBuildSettlement(this.state, this.topology, decoded.nodeId, actorId);
      }
      return result;
    }

    if (decoded.type === "city") {
      return core.applyBuildCity(this.state, this.topology, decoded.nodeId, actorId);
    }

    if (decoded.type === "trade") {
      return core.applyMaritimeTrade(this.state, this.topology, actorId, {
        give: decoded.give,
        receive: decoded.receive,
      });
    }

    if (decoded.type === "playKnight") {
      const played = core.playDevCard(this.state, actorId, "knight");
      if (!played.ok) {
        return played;
      }
      const applied = core.applyKnight(this.state, actorId);
      if (!applied.ok) {
        return applied;
      }
      this.pendingRobberReturnMode =
        modeBefore === "preRoll" ? "preRoll" : "postRoll";
      this.state.turn.phase = "robberMove";
      return { ok: true };
    }

    if (decoded.type === "playMonopoly") {
      const played = core.playDevCard(this.state, actorId, "monopoly");
      if (!played.ok) {
        return played;
      }
      return core.applyMonopoly(this.state, actorId, decoded.resource);
    }

    if (decoded.type === "playYearOfPlenty") {
      const played = core.playDevCard(this.state, actorId, "yearOfPlenty");
      if (!played.ok) {
        return played;
      }
      return core.applyYearOfPlenty(this.state, actorId, decoded.resources);
    }

    if (decoded.type === "playRoadBuilding") {
      if (!this._canStartRoadBuilding(actorId)) {
        return { ok: false, error: "illegal-road" };
      }
      const played = core.playDevCard(this.state, actorId, "roadBuilding");
      if (!played.ok) {
        return played;
      }
      const player = this.state.playerStateById[actorId];
      if (!player || player.roadsRemaining <= 0) {
        return { ok: false, error: "no-pieces-left" };
      }
      this.pendingRoadBuilding = {
        playerId: actorId,
        roadsToPlace: Math.min(2, player.roadsRemaining),
        returnToMode: modeBefore === "preRoll" ? "preRoll" : "postRoll",
      };
      this.state.turn.phase =
        this.pendingRoadBuilding.returnToMode === "preRoll"
          ? "preRoll"
          : "postRoll";
      return { ok: true };
    }

    if (decoded.type === "robber") {
      const stolenIndex = this.rng();
      let result = core.applyMoveRobber(
        this.state,
        this.topology,
        decoded.tileId,
        actorId,
        stolenIndex
      );

      if (!result.ok && result.error === "ambiguous-victim") {
        const victims = core
          .getRobberVictims(this.state, this.topology, decoded.tileId, actorId)
          .filter(
            (id) => (this.state.playerStateById[id]?.resources?.length ?? 0) > 0
          );
        if (victims.length > 0) {
          const victim = victims[Math.floor(this.rng() * victims.length)];
          result = core.applyMoveRobber(
            this.state,
            this.topology,
            decoded.tileId,
            actorId,
            stolenIndex,
            victim
          );
        }
      }

      if (result.ok) {
        const returnMode =
          this.pendingRobberReturnMode === "preRoll" ? "preRoll" : "postRoll";
        this.state.turn.phase = returnMode;
        this.pendingRobberReturnMode = null;
      }
      return result;
    }

    return { ok: false, error: "unknown-action" };
  }

  _advancePlacementAfterRoad() {
    if (this.placementIndex >= this.placementOrder.length - 1) {
      this.state.phase = "normal";
      this.placementStage = "done";
      this.state.turn.currentPlayerId = this.players[0];
      this.state.turn.phase = "preRoll";
      this.state.turn.hasRolled = false;
      this.state.turn.lastRollTotal = null;
      this.state.turn.pendingDiscards = [];
      return;
    }

    this.placementIndex += 1;
    this.placementStage = "settlement";
    this.state.turn.currentPlayerId = this.placementOrder[this.placementIndex];
    this.state.turn.phase = "preRoll";
    this.state.turn.hasRolled = false;
    this.state.turn.lastRollTotal = null;
    this.state.turn.pendingDiscards = [];
  }

  _advanceRoadBuildingAfterPlacement() {
    if (!this.pendingRoadBuilding) {
      return;
    }

    this.pendingRoadBuilding.roadsToPlace -= 1;

    const player = this.state.playerStateById[this.pendingRoadBuilding.playerId];
    const noRoadPiecesLeft = !player || player.roadsRemaining <= 0;
    const noPendingRoads = this.pendingRoadBuilding.roadsToPlace <= 0;
    const noLegalEdges =
      core.buildableEdges(
        this.state,
        this.topology,
        this.pendingRoadBuilding.playerId,
        { initialPlacement: false }
      ).length === 0;

    if (noPendingRoads || noRoadPiecesLeft || noLegalEdges) {
      this.pendingRoadBuilding = null;
    }
  }

  _autoAdvanceForcedPhases() {
    if (this.state.phase !== "normal") {
      return;
    }

    let guard = 0;
    while (
      this.state.turn.phase === "robberDiscard" &&
      this.state.turn.pendingDiscards.length > 0 &&
      guard < 16
    ) {
      guard += 1;
      const discardActor = this.state.turn.pendingDiscards[0];
      const player = this.state.playerStateById[discardActor];
      if (!player) {
        this.state.turn.pendingDiscards = this.state.turn.pendingDiscards.slice(1);
        continue;
      }

      const requiredCount = Math.floor(player.resources.length / 2);
      if (requiredCount <= 0) {
        const result = core.applyDiscard(this.state, discardActor, []);
        if (!result.ok) {
          break;
        }
        continue;
      }

      const shuffled = shuffleInPlace([...player.resources], this.rng);
      const toDiscard = shuffled.slice(0, requiredCount);
      const result = core.applyDiscard(this.state, discardActor, toDiscard);
      if (!result.ok) {
        break;
      }
    }
  }

  _buildBaseObservation(actorId) {
    const obs = [];
    const mode = this._getMode();

    obs.push(...this._modeOneHot(mode));

    for (const playerId of this.players) {
      obs.push(playerId === actorId ? 1 : 0);
    }

    for (const playerId of this.players) {
      const player = this.state.playerStateById[playerId];
      const ownView = playerId === actorId;
      const resourceCounts = countResources(player.resources);
      const devCounts = countDevCards(player.devCards);

      const vp = ownView
        ? core.getVictoryPoints(this.state, playerId)
        : core.getPublicVictoryPoints(this.state, playerId);
      obs.push(vp / 15);

      obs.push(player.resources.length / 30);
      for (const resource of RESOURCE_TYPES) {
        obs.push(ownView ? (resourceCounts[resource] ?? 0) / 19 : 0);
      }

      obs.push(player.devCards.length / 25);
      for (const card of DEV_CARD_TYPES) {
        obs.push(ownView ? (devCounts[card] ?? 0) / 14 : 0);
      }

      obs.push(player.roadsRemaining / this.state.ruleset.pieceLimits.roads);
      obs.push(
        player.settlementsRemaining / this.state.ruleset.pieceLimits.settlements
      );
      obs.push(player.citiesRemaining / this.state.ruleset.pieceLimits.cities);
      obs.push(player.knightsPlayed / 10);

      obs.push(this.state.awards.longestRoadOwnerId === playerId ? 1 : 0);
      obs.push(this.state.awards.largestArmyOwnerId === playerId ? 1 : 0);
    }

    for (let roll = 2; roll <= 12; roll += 1) {
      obs.push(this.state.turn.lastRollTotal === roll ? 1 : 0);
    }

    const bankCounts = countResources(this.state.bank.resources);
    for (const resource of RESOURCE_TYPES) {
      obs.push((bankCounts[resource] ?? 0) / 19);
    }

    obs.push(this.state.turn.hasRolled ? 1 : 0);
    obs.push(
      this.pendingRoadBuilding ? this.pendingRoadBuilding.roadsToPlace / 2 : 0
    );
    obs.push(this.pendingRobberReturnMode === "preRoll" ? 1 : 0);
    obs.push(this.pendingRobberReturnMode === "postRoll" ? 1 : 0);

    const pendingNodeId =
      this.state.pendingRoadFromNodeIdByPlayer[actorId] ?? null;
    for (const nodeId of this.nodeIds) {
      obs.push(pendingNodeId === nodeId ? 1 : 0);
    }

    obs.push(this.steps / this.options.maxSteps);

    for (const tileId of this.landTileIds) {
      const tile = this.landTileById.get(tileId);
      const resource = tile?.tile?.resource ?? null;
      const rollNumber = tile?.tile?.number ?? null;
      const rollPips = getPipWeight(rollNumber);

      obs.push(...oneHot(resource, LAND_TILE_RESOURCE_TYPES));
      obs.push(...oneHot(rollNumber, ROLL_NUMBER_FEATURES));
      obs.push(rollPips / 5);
      obs.push(this.state.robberTileId === tileId ? 1 : 0);
    }

    for (const nodeId of this.nodeIds) {
      const staticFeature = this.nodeFeatureById.get(nodeId);
      const port = staticFeature?.port ?? null;
      obs.push(...oneHot(port, PORT_FEATURES));

      for (const resource of RESOURCE_TYPES) {
        const pips = staticFeature?.pipByResource?.[resource] ?? 0;
        obs.push(pips / 15);
      }
      obs.push((staticFeature?.totalPips ?? 0) / 15);

      const building = this.state.buildingsByNodeId[nodeId];
      for (const playerId of this.players) {
        obs.push(
          building && building.ownerId === playerId && building.type === "settlement"
            ? 1
            : 0
        );
      }
      for (const playerId of this.players) {
        obs.push(
          building && building.ownerId === playerId && building.type === "city"
            ? 1
            : 0
        );
      }
    }

    for (const edgeId of this.edgeIds) {
      const owner = this.state.roadsByEdgeId[edgeId] ?? null;
      obs.push(owner == null ? 1 : 0);
      for (const playerId of this.players) {
        obs.push(owner === playerId ? 1 : 0);
      }
    }

    if (this.observationLayout && obs.length !== this.observationLayout.baseObservationSize) {
      throw new Error(
        `Observation size mismatch: expected ${this.observationLayout.baseObservationSize}, got ${obs.length}`
      );
    }

    return obs;
  }

  _buildOutput(reward, infoPatch = {}) {
    const actorId = this._getActorId();
    const mode = this._getMode();

    const actionMask = this.done || this.truncated
      ? new Array(this.actionCount).fill(0)
      : this._computeActionMask(actorId);

    let observation = this._buildBaseObservation(actorId);
    if (this.options.includeActionMaskInObservation) {
      observation = observation.concat(actionMask);
    }

    const info = {
      actorId,
      mode,
      winnerId: this.state.gameOver?.winnerId ?? null,
      legalActionCount: actionMask.reduce((sum, value) => sum + value, 0),
      stepCount: this.steps,
      ...infoPatch,
    };

    if (Number.isInteger(info.selectedAction)) {
      info.selectedActionLabel = this._actionLabel(info.selectedAction);
    }

    return {
      observation,
      actionMask,
      reward,
      done: this.done,
      truncated: this.truncated,
      actorId,
      mode,
      info,
    };
  }
}

function createSettlexSelfPlayEnv(options = {}) {
  return new SettlexSelfPlayEnv(options);
}

module.exports = {
  SettlexSelfPlayEnv,
  createSettlexSelfPlayEnv,
};
