import { valuePair } from "./settlementValue.mjs";

export function measureOpeningRoutes(facts, valuedNodes, profile) {
  const byId = new Map(valuedNodes.map((node) => [node.nodeId, node]));
  const pairs = facts.legalPairs.map(([leftId, rightId]) => ({
    nodeIds: [leftId, rightId],
    ...valuePair(byId.get(leftId), byId.get(rightId))
  }));
  const strategyNames = ["expansion", "growth", "flexible"];
  const bestByStrategy = Object.fromEntries(strategyNames.map((strategy) => [
    strategy,
    Math.max(0, ...pairs.map((pair) => pair.scores[strategy]))
  ]));
  const competitivePairs = pairs.map((pair) => ({
    ...pair,
    competitiveStrategies: strategyNames.filter((strategy) =>
      pair.scores[strategy] >= bestByStrategy[strategy] * profile.competitivePairRatio)
  })).filter((pair) => pair.competitiveStrategies.length > 0);

  // Collapse variants that depend on the same dominant node, retaining the
  // pair's strongest normalised strategic lens for explainability.
  const distinctByAnchor = new Map();
  for (const pair of competitivePairs) {
    const strategy = [...pair.competitiveStrategies].sort((left, right) =>
      pair.scores[right] / bestByStrategy[right] - pair.scores[left] / bestByStrategy[left] || left.localeCompare(right))[0];
    const route = { ...pair, strategy, score: pair.scores[strategy] / bestByStrategy[strategy] };
    const current = distinctByAnchor.get(pair.anchorNodeId);
    if (!current || route.score > current.score || (route.score === current.score && pair.nodeIds.join(",") < current.nodeIds.join(","))) {
      distinctByAnchor.set(pair.anchorNodeId, route);
    }
  }
  const distinctRoutes = [...distinctByAnchor.values()]
    .sort((left, right) => right.score - left.score || left.nodeIds[0] - right.nodeIds[0] || left.nodeIds[1] - right.nodeIds[1]);
  const searchRoutes = distinctRoutes.slice(0, profile.routeSearchLimit);
  const compatibleRouteSet = searchRoutes.some((left, leftIndex) => searchRoutes.slice(leftIndex + 1).some((right) => {
    const rightIds = new Set(right.nodeIds);
    return left.nodeIds.every((nodeId) => {
      const blocked = new Set(byId.get(nodeId).blockedNodeIds);
      return [...rightIds].every((rightId) => !blocked.has(rightId));
    });
  }));
  return {
    bestByStrategy,
    rawCompetitivePairCount: competitivePairs.length,
    distinctCompetitiveRouteCount: distinctRoutes.length,
    strategyDepth: Object.fromEntries(strategyNames.map((strategy) => [strategy, distinctRoutes.filter((route) => route.strategy === strategy).length])),
    hasCompatibleCompetitiveRouteSet: compatibleRouteSet,
    topRoutes: distinctRoutes.slice(0, 12)
  };
}
