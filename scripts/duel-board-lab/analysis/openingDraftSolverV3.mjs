import {
  compileOpeningPairV3,
  materialiseOpeningPairV3,
  scoreOpeningPairExpansionV3,
  valueOpeningPairMatchupV3
} from "./openingPortfolioV3.mjs";

const PLAYERS = Object.freeze(["P1", "P2", "P2", "P1"]);
const nodeMask = (nodeId) => 1n << BigInt(nodeId);
const idsMask = (nodeIds) => nodeIds.reduce((mask, nodeId) => mask | nodeMask(nodeId), 0n);

function compareSequences(left, right) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

function normalizedAdvantage(p1Value, p2Value) {
  return (p1Value - p2Value) / Math.max(Math.abs(p1Value), Math.abs(p2Value), 1);
}

function makeTerminal(nodeIds, p1Value, p2Value) {
  return {
    nodeIds: [...nodeIds],
    p1Value,
    p2Value,
    seatAdvantage: p1Value - p2Value,
    normalizedAdvantage: normalizedAdvantage(p1Value, p2Value)
  };
}

function isBetter(candidate, selected, maximise, precision) {
  if (selected === null) return true;
  const difference = candidate.seatAdvantage - selected.seatAdvantage;
  if (Math.abs(difference) <= precision) {
    return compareSequences(candidate.nodeIds, selected.nodeIds) < 0;
  }
  return maximise ? difference > 0 : difference < 0;
}

function compilePairIndex({ facts, context, featuresByNodeId, profile, candidateNodeIds }) {
  const pairIndex = [];
  let pairCount = 0;
  for (let leftIndex = 0; leftIndex < candidateNodeIds.length; leftIndex += 1) {
    const leftNodeId = candidateNodeIds[leftIndex];
    const leftNode = facts.nodes.find((node) => node.nodeId === leftNodeId);
    for (let rightIndex = leftIndex + 1; rightIndex < candidateNodeIds.length; rightIndex += 1) {
      const rightNodeId = candidateNodeIds[rightIndex];
      if (leftNode.blockedNodeIds.includes(rightNodeId)) continue;
      let sharedPair;
      const addEntry = (firstNodeId, secondNodeId) => {
        pairIndex[firstNodeId] ??= [];
        const compiled = compileOpeningPairV3({
            facts,
            context,
            featuresByNodeId,
            orderedNodeIds: [firstNodeId, secondNodeId],
            profile,
            sharedPair
          });
        sharedPair ??= compiled.sharedPair;
        pairIndex[firstNodeId][secondNodeId] = Object.freeze({
          ...compiled,
          unorderedPairId: pairCount
        });
      };
      addEntry(leftNodeId, rightNodeId);
      addEntry(rightNodeId, leftNodeId);
      pairCount += 1;
    }
  }
  return { pairIndex, pairCount };
}

export function solveOpeningDraftV3({
  facts,
  context,
  featuresByNodeId,
  profile,
  candidateNodeIds,
  terminalEvaluator,
  precision = profile?.tiePrecision ?? 1e-12
}) {
  const nodeIds = [...candidateNodeIds].sort((left, right) => left - right);
  const nodeBits = [];
  const blockedMasks = [];
  for (const node of facts.nodes) {
    nodeBits[node.nodeId] = nodeMask(node.nodeId);
    blockedMasks[node.nodeId] = idsMask(node.blockedNodeIds);
  }
  const compiled = terminalEvaluator === undefined
    ? compilePairIndex({ facts, context, featuresByNodeId, profile, candidateNodeIds: nodeIds })
    : { pairIndex: null, pairCount: 0 };
  const expansionCache = terminalEvaluator === undefined
    ? new Float64Array(compiled.pairCount * compiled.pairCount).fill(Number.NaN)
    : null;
  const sequence = Array(4);
  let legalSequenceCount = 0;

  const evaluateTerminal = (occupiedMask, settlementBlockedMask) => {
    if (terminalEvaluator !== undefined) {
      const values = terminalEvaluator(sequence);
      return makeTerminal(sequence, values.p1Value, values.p2Value);
    }
    const p1Entry = compiled.pairIndex[sequence[0]]?.[sequence[3]];
    const p2Entry = compiled.pairIndex[sequence[1]]?.[sequence[2]];
    if (!p1Entry || !p2Entry) throw new Error("opening-v3-missing-pair");
    const expansionValue = (entry, opponentEntry) => {
      const cacheIndex = entry.unorderedPairId * compiled.pairCount + opponentEntry.unorderedPairId;
      let expansionScore = expansionCache[cacheIndex];
      if (Number.isNaN(expansionScore)) {
        expansionScore = scoreOpeningPairExpansionV3({
          entry,
          occupiedMask,
          settlementBlockedMask,
          featuresByNodeId,
          profile
        });
        expansionCache[cacheIndex] = expansionScore;
      }
      return valueOpeningPairMatchupV3({ entry, expansionScore, profile });
    };
    return makeTerminal(
      sequence,
      expansionValue(p1Entry, p2Entry),
      expansionValue(p2Entry, p1Entry)
    );
  };

  const search = (depth, occupiedMask, settlementBlockedMask, countLeaf) => {
    const maximise = PLAYERS[depth] === "P1";
    let selected = null;
    for (const nodeId of nodeIds) {
      if ((settlementBlockedMask & nodeBits[nodeId]) !== 0n) continue;
      sequence[depth] = nodeId;
      const nextOccupiedMask = occupiedMask | nodeBits[nodeId];
      const nextBlockedMask = settlementBlockedMask | blockedMasks[nodeId];
      let candidate;
      if (depth === 3) {
        if (countLeaf) legalSequenceCount += 1;
        candidate = evaluateTerminal(nextOccupiedMask, nextBlockedMask);
      } else {
        candidate = search(depth + 1, nextOccupiedMask, nextBlockedMask, countLeaf);
      }
      if (candidate !== null && isBetter(candidate, selected, maximise, precision)) {
        selected = candidate;
      }
    }
    return selected;
  };

  const rootOptions = [];
  let selected = null;
  for (const nodeId of nodeIds) {
    sequence[0] = nodeId;
    const terminal = search(1, nodeBits[nodeId], blockedMasks[nodeId], true);
    if (terminal === null) continue;
    rootOptions.push(Object.freeze({
      nodeId,
      seatAdvantage: terminal.seatAdvantage,
      normalizedAdvantage: terminal.normalizedAdvantage,
      selectedNodeIds: Object.freeze([...terminal.nodeIds])
    }));
    if (isBetter(terminal, selected, true, precision)) selected = terminal;
  }
  if (selected === null) throw new Error("opening-v3-no-line");

  const responseOptions = [];
  const selectedRoot = selected.nodeIds[0];
  sequence[0] = selectedRoot;
  for (const p2First of nodeIds) {
    if ((blockedMasks[selectedRoot] & nodeBits[p2First]) !== 0n) continue;
    sequence[1] = p2First;
    const afterP2First = blockedMasks[selectedRoot] | blockedMasks[p2First];
    const occupiedAfterP2First = nodeBits[selectedRoot] | nodeBits[p2First];
    for (const p2Second of nodeIds) {
      if ((afterP2First & nodeBits[p2Second]) !== 0n) continue;
      sequence[2] = p2Second;
      const terminal = search(
        3,
        occupiedAfterP2First | nodeBits[p2Second],
        afterP2First | blockedMasks[p2Second],
        false
      );
      if (terminal === null) continue;
      responseOptions.push(Object.freeze({
        nodeIds: Object.freeze([p2First, p2Second]),
        seatAdvantage: terminal.seatAdvantage,
        normalizedAdvantage: terminal.normalizedAdvantage,
        selectedNodeIds: Object.freeze([...terminal.nodeIds])
      }));
    }
  }
  responseOptions.sort((left, right) => compareSequences(left.nodeIds, right.nodeIds));

  let p1 = null;
  let p2 = null;
  if (terminalEvaluator === undefined) {
    const p1Entry = compiled.pairIndex[selected.nodeIds[0]][selected.nodeIds[3]];
    const p2Entry = compiled.pairIndex[selected.nodeIds[1]][selected.nodeIds[2]];
    p1 = materialiseOpeningPairV3({
      facts,
      featuresByNodeId,
      entry: p1Entry,
      occupiedNodeIds: selected.nodeIds,
      profile
    });
    p2 = materialiseOpeningPairV3({
      facts,
      featuresByNodeId,
      entry: p2Entry,
      occupiedNodeIds: selected.nodeIds,
      profile
    });
    if (
      Math.abs(p1.value - selected.p1Value) > 1e-9 ||
      Math.abs(p2.value - selected.p2Value) > 1e-9
    ) throw new Error("opening-v3-precompute-drift");
  }

  return Object.freeze({
    selectedNodeIds: Object.freeze([...selected.nodeIds]),
    selectedLine: Object.freeze(selected.nodeIds.map((nodeId, index) => Object.freeze({
      player: PLAYERS[index],
      nodeId
    }))),
    p1,
    p2,
    p1Value: selected.p1Value,
    p2Value: selected.p2Value,
    seatAdvantage: selected.seatAdvantage,
    normalizedAdvantage: selected.normalizedAdvantage,
    rawSequenceCount: nodeIds.length * (nodeIds.length - 1)
      * (nodeIds.length - 2) * (nodeIds.length - 3),
    legalSequenceCount,
    rootOptions: Object.freeze(rootOptions),
    responseOptions: Object.freeze(responseOptions)
  });
}
