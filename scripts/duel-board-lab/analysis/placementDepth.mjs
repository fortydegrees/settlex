import { buildOpeningPortfolio } from "./openingPortfolio.mjs";
import { valueOpeningPortfolio } from "./openingPolicy.mjs";
import { valueSettlements } from "./settlementValue.mjs";

const PLAYERS = Object.freeze(["P1", "P2", "P2", "P1"]);

function normaliseSeatAdvantage(p1Value, p2Value) {
  return (p1Value - p2Value) / Math.max(Math.abs(p1Value), Math.abs(p2Value), 1);
}

function buildGreedyLine(facts) {
  const valuedNodes = valueSettlements(facts);
  const selected = [];

  for (const player of PLAYERS) {
    const node = valuedNodes.find((candidate) => selected.every((existing) => (
      !candidate.blockedNodeIds.includes(existing.nodeId)
      && !existing.blockedNodeIds.includes(candidate.nodeId)
    )));
    if (!node) throw new Error("greedy-opening-no-line");
    selected.push(node);
  }

  return selected.map((node, index) => ({ player: PLAYERS[index], nodeId: node.nodeId }));
}

export function measurePlacementDepth({ facts, solved, policy, profile }) {
  const greedyLine = buildGreedyLine(facts);
  const occupiedNodeIds = greedyLine.map(({ nodeId }) => nodeId);
  const greedyP1Portfolio = buildOpeningPortfolio(
    facts,
    [occupiedNodeIds[0], occupiedNodeIds[3]],
    { occupiedNodeIds, precision: profile.tradePrecision }
  );
  const greedyP2Portfolio = buildOpeningPortfolio(
    facts,
    [occupiedNodeIds[1], occupiedNodeIds[2]],
    { occupiedNodeIds, precision: profile.tradePrecision }
  );
  const greedyP1Value = valueOpeningPortfolio(greedyP1Portfolio, policy);
  const greedyP2Value = valueOpeningPortfolio(greedyP2Portfolio, policy);
  const greedySeatAdvantage = greedyP1Value - greedyP2Value;
  const greedyNormalisedSeatAdvantage = normaliseSeatAdvantage(greedyP1Value, greedyP2Value);

  const meaningfulFirstPickCount = solved.rootOptions.filter((option) => (
    solved.normalisedSeatAdvantage - option.normalisedSeatAdvantage
      <= profile.meaningfulLineTolerance
  )).length;
  const minimumResponseAdvantage = Math.min(
    ...solved.responseOptions.map((entry) => entry.normalisedSeatAdvantage)
  );
  const meaningfulResponseCount = solved.responseOptions.filter((option) => (
    option.normalisedSeatAdvantage - minimumResponseAdvantage
      <= profile.meaningfulLineTolerance
  )).length;
  const safeRootOptions = solved.rootOptions.filter((option) => (
    option.normalisedSeatAdvantage >= -profile.maxNormalisedSeatAdvantage
  ));
  const otherRootOptions = solved.rootOptions.filter((option) => option !== safeRootOptions[0]);
  const forcedDefence = safeRootOptions.length === 1 && otherRootOptions.every((option) => (
    option.normalisedSeatAdvantage < -profile.forcedDefenceThreshold
  ));
  const rootAdvantages = solved.rootOptions.map((option) => option.normalisedSeatAdvantage);
  const lineSensitivity = rootAdvantages.length === 0
    ? 0
    : Math.max(...rootAdvantages) - Math.min(...rootAdvantages);

  return {
    greedyLine,
    greedyPortfolios: { P1: greedyP1Portfolio, P2: greedyP2Portfolio },
    greedySeatAdvantage,
    greedyNormalisedSeatAdvantage,
    greedyRegret: Math.abs(
      solved.normalisedSeatAdvantage - greedyNormalisedSeatAdvantage
    ),
    meaningfulFirstPickCount,
    meaningfulResponseCount,
    forcedDefence,
    lineSensitivity
  };
}
