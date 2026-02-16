import { createRequire } from "module";

const require = createRequire(import.meta.url);
const core = require("../../game-core/dist/index.js");

const DICE_OUTCOMES = [
  { total: 2, p: 1 / 36 },
  { total: 3, p: 2 / 36 },
  { total: 4, p: 3 / 36 },
  { total: 5, p: 4 / 36 },
  { total: 6, p: 5 / 36 },
  { total: 7, p: 6 / 36 },
  { total: 8, p: 5 / 36 },
  { total: 9, p: 4 / 36 },
  { total: 10, p: 3 / 36 },
  { total: 11, p: 2 / 36 },
  { total: 12, p: 1 / 36 },
];

function legalActions(mask) {
  const actions = [];
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === 1) actions.push(i);
  }
  return actions;
}

function topKActionsByLogits(mask, logits, k) {
  const legal = legalActions(mask);
  const scored = legal.map((actionId) => ({
    actionId,
    score: Number.isFinite(logits[actionId]) ? logits[actionId] : -Infinity,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, k)).map((entry) => entry.actionId);
}

function terminalValueForRoot(env, rootPlayerId) {
  if (env.state?.gameOver?.winnerId != null) {
    return String(env.state.gameOver.winnerId) === String(rootPlayerId) ? 1 : -1;
  }
  if (env.truncated) {
    return 0;
  }
  return null;
}

function captureEnvSnapshot(env) {
  return {
    state: structuredClone(env.state),
    placementIndex: env.placementIndex,
    placementStage: env.placementStage,
    pendingRoadBuilding: structuredClone(env.pendingRoadBuilding),
    pendingRobberReturnMode: env.pendingRobberReturnMode,
    modeOverride: env.modeOverride,
    done: env.done,
    truncated: env.truncated,
    steps: env.steps,
  };
}

function restoreEnvSnapshot(env, snapshot) {
  env.state = structuredClone(snapshot.state);
  env.placementIndex = snapshot.placementIndex;
  env.placementStage = snapshot.placementStage;
  env.pendingRoadBuilding = structuredClone(snapshot.pendingRoadBuilding);
  env.pendingRobberReturnMode = snapshot.pendingRobberReturnMode;
  env.modeOverride = snapshot.modeOverride;
  env.done = snapshot.done;
  env.truncated = snapshot.truncated;
  env.steps = snapshot.steps;
}

function applyActionInPlace(env, actionId, forcedRollTotal = null) {
  if (env.done || env.truncated) {
    return { ok: false, error: "finished" };
  }

  env._autoAdvanceForcedPhases();
  const actorId = env._getActorId();
  const modeBefore = env._getMode();
  const decoded = env._decodeAction(actionId);
  let applied;

  if (forcedRollTotal != null) {
    if (decoded.type !== "roll") {
      return { ok: false, error: "forced-roll-on-non-roll-action" };
    }
    applied = core.applyRollDice(env.state, env.topology, forcedRollTotal);
  } else {
    applied = env._applyAction(actionId, actorId, modeBefore);
  }

  if (!applied.ok) {
    return applied;
  }

  env.steps += 1;
  if (env.steps >= env.options.maxSteps && !env.state.gameOver) {
    env.truncated = true;
  }
  env._autoAdvanceForcedPhases();
  if (env.state.gameOver) {
    env.done = true;
  }

  return { ok: true };
}

async function scoreState({
  env,
  policyClient,
  actorId,
  spec,
}) {
  const actionMask = env._computeActionMask(actorId);
  const observation = env.options.includeActionMaskInObservation
    ? env._buildBaseObservation(actorId).concat(actionMask)
    : env._buildBaseObservation(actorId);
  const { logits, value } = await policyClient.scoreActions({
    observation,
    actionMask,
    spec,
  });
  return { actionMask, observation, logits, value };
}

async function evaluateState({
  env,
  policyClient,
  rootPlayerId,
  spec,
  budgetEndMs,
  topK,
  depth,
}) {
  const now = Date.now();
  if (now >= budgetEndMs) {
    return { value: 0, timedOut: true };
  }

  const terminal = terminalValueForRoot(env, rootPlayerId);
  if (terminal != null) {
    return { value: terminal, timedOut: false };
  }

  const actorId = String(env._getActorId());
  const { actionMask, logits, value } = await scoreState({
    env,
    policyClient,
    actorId,
    spec,
  });
  const signedValue = actorId === String(rootPlayerId) ? value : -value;

  if (depth <= 0) {
    return { value: signedValue, timedOut: false };
  }

  const legal = legalActions(actionMask);
  if (legal.length === 0) {
    return { value: signedValue, timedOut: false };
  }
  const candidates = topKActionsByLogits(actionMask, logits, topK);
  const maximizing = actorId === String(rootPlayerId);
  const baseline = maximizing ? -Infinity : Infinity;
  let best = baseline;
  let evaluated = 0;

  for (const actionId of candidates) {
    if (Date.now() >= budgetEndMs) {
      break;
    }
    const decoded = env._decodeAction(actionId);
    const snapshot = captureEnvSnapshot(env);
    let branchValue;

    if (decoded.type === "roll") {
      branchValue = 0;
      for (const outcome of DICE_OUTCOMES) {
        if (Date.now() >= budgetEndMs) {
          restoreEnvSnapshot(env, snapshot);
          return { value: evaluated > 0 ? best : signedValue, timedOut: true };
        }
        restoreEnvSnapshot(env, snapshot);
        const applied = applyActionInPlace(env, actionId, outcome.total);
        if (!applied.ok) {
          continue;
        }
        const child = await evaluateState({
          env,
          policyClient,
          rootPlayerId,
          spec,
          budgetEndMs,
          topK,
          depth: depth - 1,
        });
        branchValue += outcome.p * child.value;
      }
    } else {
      const applied = applyActionInPlace(env, actionId);
      if (!applied.ok) {
        restoreEnvSnapshot(env, snapshot);
        continue;
      }
      const child = await evaluateState({
        env,
        policyClient,
        rootPlayerId,
        spec,
        budgetEndMs,
        topK,
        depth: depth - 1,
      });
      branchValue = child.value;
    }

    restoreEnvSnapshot(env, snapshot);
    evaluated += 1;
    if (maximizing) {
      best = Math.max(best, branchValue);
    } else {
      best = Math.min(best, branchValue);
    }
  }

  if (evaluated === 0) {
    return { value: signedValue, timedOut: Date.now() >= budgetEndMs };
  }
  return { value: best, timedOut: Date.now() >= budgetEndMs };
}

export async function chooseActionWithExpectimax({
  adapter,
  policyClient,
  playerID,
  budgetMs = 250,
  topK = 12,
  maxDepth = 2,
}) {
  if (!adapter?.env || !policyClient) {
    return null;
  }

  const env = adapter.env;
  const rootPlayerId = String(playerID);
  const rootMask = adapter.actionMask;
  const legal = legalActions(rootMask);
  if (legal.length === 0) {
    return null;
  }

  const budgetEndMs = Date.now() + Math.max(25, Number(budgetMs) || 250);
  const rootScore = await policyClient.scoreActions({
    observation: adapter.observation,
    actionMask: rootMask,
    spec: adapter.spec,
  });
  const candidates = topKActionsByLogits(rootMask, rootScore.logits, topK);

  let bestActionId = null;
  let bestValue = -Infinity;
  let nodesExpanded = 0;
  const rootSnapshot = captureEnvSnapshot(env);

  for (const actionId of candidates) {
    if (Date.now() >= budgetEndMs) {
      break;
    }
    const decoded = env._decodeAction(actionId);
    const snapshot = captureEnvSnapshot(env);
    let actionValue = -Infinity;

    if (decoded.type === "roll") {
      actionValue = 0;
      for (const outcome of DICE_OUTCOMES) {
        if (Date.now() >= budgetEndMs) {
          break;
        }
        restoreEnvSnapshot(env, snapshot);
        const applied = applyActionInPlace(env, actionId, outcome.total);
        if (!applied.ok) {
          continue;
        }
        const child = await evaluateState({
          env,
          policyClient,
          rootPlayerId,
          spec: adapter.spec,
          budgetEndMs,
          topK,
          depth: Math.max(0, maxDepth - 1),
        });
        actionValue += outcome.p * child.value;
        nodesExpanded += 1;
      }
    } else {
      const applied = applyActionInPlace(env, actionId);
      if (!applied.ok) {
        restoreEnvSnapshot(env, snapshot);
        continue;
      }
      const child = await evaluateState({
        env,
        policyClient,
        rootPlayerId,
        spec: adapter.spec,
        budgetEndMs,
        topK,
        depth: Math.max(0, maxDepth - 1),
      });
      actionValue = child.value;
      nodesExpanded += 1;
    }

    restoreEnvSnapshot(env, snapshot);
    if (actionValue > bestValue) {
      bestValue = actionValue;
      bestActionId = actionId;
    }
  }

  restoreEnvSnapshot(env, rootSnapshot);
  if (!Number.isInteger(bestActionId)) {
    return null;
  }
  return {
    actionId: bestActionId,
    meta: {
      bestValue,
      nodesExpanded,
      timedOut: Date.now() >= budgetEndMs,
    },
  };
}
