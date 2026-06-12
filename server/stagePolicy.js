const CHOICE_DEV_CARD_TYPES = new Set(["yearOfPlenty", "monopoly"]);

const DEFAULT_STAGE_TIMERS_MS = {
  "preGame:waiting": 15000,
  "main:preRoll": 5000,
  "main:robberDiscard": 20000,
  "placement:settlement": 60000,
  "placement:road": 10000,
  "main:moveRobber": 20000,
  "main:roadBuilding": 10000,
  "main:devCardChoice": 20000
};

const STAGE_TIMEOUT_MOVES = {
  "preGame:waiting": "autoStartGame",
  "main:preRoll": "autoRoll",
  "main:robberDiscard": "autoDiscard",
  "placement:settlement": "autoPlaceSettlement",
  "placement:road": "autoPlaceRoad",
  "main:moveRobber": "autoMoveRobber",
  "main:roadBuilding": "autoPlaceRoad",
  "main:devCardChoice": "autoResolveDevCard"
};

const BOT_ACTION_STAGE_KEYS = new Set([
  "placement:settlement",
  "placement:road",
  "main:preRoll",
  "main:postRoll",
  "main:moveRobber",
  "main:roadBuilding",
  "main:devCardChoice"
]);

const BOT_STAGE_FALLBACK_MOVES = {
  "preGame:waiting": "readyUp",
  ...STAGE_TIMEOUT_MOVES,
  "main:postRoll": "autoEndTurn"
};

const getActiveStage = (ctx) => {
  const active = ctx?.activePlayers?.[ctx.currentPlayer] ?? ctx?.activePlayers?.all ?? "";
  return typeof active === "string" ? active : active?.stage ?? "";
};

export function resolveStageKey(state) {
  const { ctx = {}, G = {} } = state ?? {};
  const activeStage = getActiveStage(ctx);
  const devPlay = G?.devCardPlay;
  const coreTurn = G?.core?.turn;

  if (
    ctx.phase === "main" &&
    (coreTurn?.phase === "robberDiscard" ||
      (coreTurn?.pendingDiscards?.length ?? 0) > 0)
  ) {
    return "main:robberDiscard";
  }

  if (
    ctx.phase === "main" &&
    devPlay?.type === "roadBuilding" &&
    devPlay?.pendingRoads > 0 &&
    devPlay?.playerId === ctx.currentPlayer
  ) {
    return "main:roadBuilding";
  }

  if (
    ctx.phase === "main" &&
    CHOICE_DEV_CARD_TYPES.has(devPlay?.type) &&
    devPlay?.playerId === ctx.currentPlayer
  ) {
    return "main:devCardChoice";
  }

  return `${ctx.phase}:${activeStage}`;
}

export function getStagePlayers(state, stageKey = resolveStageKey(state)) {
  if (stageKey === "main:robberDiscard") {
    return [...(state?.G?.core?.turn?.pendingDiscards ?? [])];
  }
  const currentPlayer = state?.ctx?.currentPlayer;
  return currentPlayer == null ? [] : [currentPlayer];
}

export function getStageTimeoutMs(stageKey) {
  return DEFAULT_STAGE_TIMERS_MS[stageKey];
}

export function getStageTimeoutMove(stageKey) {
  return STAGE_TIMEOUT_MOVES[stageKey];
}

export function isBotActionStage(stageKey) {
  return BOT_ACTION_STAGE_KEYS.has(stageKey);
}

export function getBotFallbackMove(state) {
  return BOT_STAGE_FALLBACK_MOVES[resolveStageKey(state)] ?? "autoEndTurn";
}
