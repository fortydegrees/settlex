import { STANDARD_RESOURCES } from "../constants.mjs";

export function measurePickSensitivity(valuedNodes, profile) {
  const ordered = [...valuedNodes].sort((left, right) => right.generalScore - left.generalScore || left.nodeId - right.nodeId);
  const baselineBest = ordered[0]?.generalScore ?? 0;
  let worst = { nodeId: null, collapse: 0, resource: null };
  for (const pick of ordered.slice(0, profile.plausiblePickLimit)) {
    const blocked = new Set(pick.blockedNodeIds);
    const remaining = ordered.filter((node) => !blocked.has(node.nodeId));
    const generalCollapse = baselineBest === 0 ? 0 : 1 - (remaining[0]?.generalScore ?? 0) / baselineBest;
    if (generalCollapse > worst.collapse) worst = { nodeId: pick.nodeId, collapse: generalCollapse, resource: null };
    for (const resource of STANDARD_RESOURCES) {
      const before = Math.max(...ordered.map((node) => node.resourcePips[resource]), 0);
      const after = Math.max(...remaining.map((node) => node.resourcePips[resource]), 0);
      const collapse = before === 0 ? 0 : 1 - after / before;
      if (collapse > worst.collapse) worst = { nodeId: pick.nodeId, collapse, resource };
    }
  }
  return { worstPick: worst, maxCollapse: worst.collapse };
}
