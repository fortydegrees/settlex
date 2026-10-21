import { STANDARD_RESOURCES } from "../constants.mjs";

export function measureResourceContestability(facts, valuedNodes, profile) {
  const byResource = {};
  for (const resource of STANDARD_RESOURCES) {
    const ordered = [...valuedNodes].sort((left, right) =>
      right.resourcePips[resource] - left.resourcePips[resource] || left.nodeId - right.nodeId
    );
    const best = ordered[0];
    const blocked = new Set(best?.blockedNodeIds ?? []);
    const secondIndependent = ordered.find((node) => !blocked.has(node.nodeId));
    const bestAccess = best?.resourcePips[resource] ?? 0;
    const secondAccess = secondIndependent?.resourcePips[resource] ?? 0;
    const viableThreshold = bestAccess * profile.viableResourceRatio;
    const selected = [];
    const excluded = new Set();
    for (const node of ordered) {
      if (node.resourcePips[resource] < viableThreshold || excluded.has(node.nodeId)) continue;
      selected.push(node.nodeId);
      for (const id of node.blockedNodeIds) excluded.add(id);
    }
    byResource[resource] = {
      totalProduction: facts.totalProductionByResource?.[resource] ?? 0,
      bestAccess,
      secondIndependentAccess: secondAccess,
      secondIndependentRatio: bestAccess === 0 ? 1 : secondAccess / bestAccess,
      independentViableRoutes: selected
    };
  }
  return { byResource };
}
