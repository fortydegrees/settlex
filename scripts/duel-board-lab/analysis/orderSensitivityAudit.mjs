export function auditOrderSensitivity(valuedNodes) {
  const ordered = [...valuedNodes].sort((left, right) => right.generalScore - left.generalScore || left.nodeId - right.nodeId);
  const blocked = new Set();
  const totals = { P1: 0, P2: 0 };
  const picks = [];
  for (const player of ["P1", "P2", "P2", "P1"]) {
    const pick = ordered.find((node) => !blocked.has(node.nodeId));
    if (!pick) throw new Error("Unable to complete diagnostic placement audit");
    picks.push({ player, nodeId: pick.nodeId, score: pick.generalScore });
    totals[player] += pick.generalScore;
    for (const nodeId of pick.blockedNodeIds) blocked.add(nodeId);
  }
  return {
    picks,
    totals,
    secondToFirstRatio: totals.P1 === 0 ? 1 : totals.P2 / totals.P1
  };
}
