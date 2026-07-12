export function measureOpportunityDepth(valuedNodes, profile) {
  const ordered = [...valuedNodes].sort((left, right) => right.generalScore - left.generalScore || left.nodeId - right.nodeId);
  const bestScore = ordered[0]?.generalScore ?? 0;
  const secondScore = ordered[1]?.generalScore ?? 0;
  return {
    bestScore,
    secondScore,
    topSpotCliff: bestScore === 0 ? 0 : (bestScore - secondScore) / bestScore,
    competitiveThreshold: bestScore * profile.competitiveSpotRatio,
    competitiveSpotCount: ordered.filter((node) => node.generalScore >= bestScore * profile.competitiveSpotRatio).length
  };
}
