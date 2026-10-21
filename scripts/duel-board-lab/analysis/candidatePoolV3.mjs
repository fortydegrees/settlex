import { STANDARD_RESOURCES } from "../constants.mjs";

export const V3_LENS_ORDER = Object.freeze([
  "broad",
  "road",
  "settlement",
  "city",
  "dev",
  ...STANDARD_RESOURCES.map((resource) => `resource:${resource}`),
  "port",
  "expansion",
  "denial"
]);

function normalise(value, maximum) {
  return maximum > 0 ? value / maximum : 0;
}

function stableFirstLegalDraft(facts, allowedNodeIds) {
  const nodesById = new Map(facts.nodes.map((node) => [node.nodeId, node]));
  const sortedNodeIds = [...allowedNodeIds].sort((left, right) => left - right);
  const sequence = [];
  const search = (blockedNodeIds) => {
    if (sequence.length === 4) return [...sequence];
    for (const nodeId of sortedNodeIds) {
      if (blockedNodeIds.has(nodeId)) continue;
      sequence.push(nodeId);
      const nextBlocked = new Set(blockedNodeIds);
      for (const blockedNodeId of nodesById.get(nodeId).blockedNodeIds) {
        nextBlocked.add(blockedNodeId);
      }
      const result = search(nextBlocked);
      if (result !== null) return result;
      sequence.pop();
    }
    return null;
  };
  return search(new Set());
}

function lensValue(feature, lens, broadScores) {
  if (lens === "broad") return broadScores.get(feature.nodeId);
  if (lens === "road") return feature.roadLens;
  if (lens === "settlement") return feature.settlementLens;
  if (lens === "city") return feature.cityLens;
  if (lens === "dev") return feature.devLens;
  if (lens === "port") return feature.portValue;
  if (lens === "expansion") return feature.expansionLens;
  if (lens === "denial") return feature.denialLens;
  if (lens.startsWith("resource:")) return feature.resourceLens[lens.slice("resource:".length)];
  throw new Error(`unknown-v3-candidate-lens:${lens}`);
}

export function selectCandidatePoolV3({ facts, settlementFeatures, profile }) {
  const maximums = {
    production: Math.max(...settlementFeatures.map((feature) => feature.scarcityWeightedProduction)),
    recipeOpportunity: Math.max(...settlementFeatures.map((feature) => feature.recipeOpportunity)),
    city: Math.max(...settlementFeatures.map((feature) => feature.cityLens)),
    expansion: Math.max(...settlementFeatures.map((feature) => feature.expansionLens)),
    port: Math.max(...settlementFeatures.map((feature) => feature.portValue))
  };
  const broadScores = new Map(settlementFeatures.map((feature) => [feature.nodeId,
    normalise(feature.scarcityWeightedProduction, maximums.production)
      * profile.candidateBroadWeights.production
    + normalise(feature.recipeOpportunity, maximums.recipeOpportunity)
      * profile.candidateBroadWeights.recipeOpportunity
    + normalise(feature.cityLens, maximums.city)
      * profile.candidateBroadWeights.city
    + normalise(feature.expansionLens, maximums.expansion)
      * profile.candidateBroadWeights.expansion
    + normalise(feature.portValue, maximums.port)
      * profile.candidateBroadWeights.port
  ]));
  const sortedByLens = new Map(V3_LENS_ORDER.map((lens) => [lens,
    [...settlementFeatures].sort((left, right) =>
      lensValue(right, lens, broadScores) - lensValue(left, lens, broadScores)
        || left.nodeId - right.nodeId)
  ]));
  const championsByLens = {};
  const selected = new Set();
  for (const lens of V3_LENS_ORDER) {
    const champion = sortedByLens.get(lens)[0];
    championsByLens[lens] = champion.nodeId;
    selected.add(champion.nodeId);
  }
  for (const feature of sortedByLens.get("broad")) {
    if (selected.size >= profile.candidateLimit) break;
    selected.add(feature.nodeId);
  }

  const initialLine = stableFirstLegalDraft(facts, selected);
  let fallbackLine = null;
  let fallbackUsed = false;
  if (initialLine === null) {
    fallbackLine = stableFirstLegalDraft(facts, facts.nodes.map((node) => node.nodeId));
    if (fallbackLine === null) throw new Error("candidate-pool-cannot-complete-draft");
    fallbackUsed = true;
    for (const nodeId of fallbackLine) selected.add(nodeId);
  }
  if (selected.size > profile.fallbackCandidateLimit) {
    throw new Error("candidate-pool-fallback-limit");
  }

  return Object.freeze({
    nodeIds: Object.freeze([...selected].sort((left, right) => left - right)),
    championsByLens: Object.freeze(championsByLens),
    fallbackUsed,
    fallbackLine: fallbackLine === null ? null : Object.freeze(fallbackLine)
  });
}

export { stableFirstLegalDraft as findStableLegalDraftV3 };
