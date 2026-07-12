import { ResourceType } from "@settlex/game-core";

export function valueSettlements(facts) {
  return facts.nodes.map((node) => {
    const diversity = node.resources?.length ?? Object.values(node.resourcePips).filter((value) => value > 0).length;
    const expansion = Math.sqrt(node.resourcePips[ResourceType.WOOD] * node.resourcePips[ResourceType.BRICK]);
    const growth = Math.sqrt(node.resourcePips[ResourceType.WHEAT] * node.resourcePips[ResourceType.ORE]);
    const portBonus = node.port === ResourceType.ANY
      ? 1
      : node.port
        ? 0.5 + 0.15 * node.resourcePips[node.port]
        : 0;
    return {
      ...node,
      diversity,
      expansionScore: expansion,
      growthScore: growth,
      portBonus,
      generalScore: node.totalPips + 0.5 * diversity + 0.2 * Math.max(expansion, growth) + portBonus
    };
  }).sort((left, right) => right.generalScore - left.generalScore || left.nodeId - right.nodeId);
}

export function valuePair(left, right) {
  const combined = Object.fromEntries(Object.keys(left.resourcePips).map((resource) => [
    resource,
    left.resourcePips[resource] + right.resourcePips[resource]
  ]));
  const diversity = Object.values(combined).filter((pips) => pips > 0).length;
  const scores = {
    expansion: left.totalPips + right.totalPips + Math.sqrt(combined[ResourceType.WOOD] * combined[ResourceType.BRICK]),
    growth: left.totalPips + right.totalPips + Math.sqrt(combined[ResourceType.WHEAT] * combined[ResourceType.ORE]) + 0.2 * combined[ResourceType.SHEEP],
    flexible: left.generalScore + right.generalScore + 0.5 * diversity
  };
  const anchorNodeId = left.generalScore > right.generalScore || (left.generalScore === right.generalScore && left.nodeId < right.nodeId)
    ? left.nodeId
    : right.nodeId;
  return { scores, anchorNodeId };
}
