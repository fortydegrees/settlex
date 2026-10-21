import {
  buildOpeningPortfolio,
  compileExpansionPaths
} from "./openingPortfolio.mjs";
import {
  flattenPolicyFeatures,
  valueOpeningPortfolio
} from "./openingPolicy.mjs";

const PLAYERS = Object.freeze(["P1", "P2", "P2", "P1"]);
const MAX_RESPONSE_OPTIONS = 32;
const ONE_ROAD_FEATURE = "oneRoadExpansionCount";
const TWO_ROAD_FEATURE = "twoRoadExpansionCount";

const nodeMask = (nodeId) => 1n << BigInt(nodeId);

function idsMask(nodeIds) {
  return nodeIds.reduce((mask, nodeId) => mask | nodeMask(nodeId), 0n);
}

function compareNodeIdSequences(left, right) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

function normaliseSeatAdvantage(p1Value, p2Value) {
  return (p1Value - p2Value) / Math.max(Math.abs(p1Value), Math.abs(p2Value), 1);
}

function materialiseTerminal(facts, nodeIds, policy, precision) {
  const [p1First, p2First, p2Second, p1Second] = nodeIds;
  const p1Portfolio = buildOpeningPortfolio(
    facts,
    [p1First, p1Second],
    { occupiedNodeIds: nodeIds, precision }
  );
  const p2Portfolio = buildOpeningPortfolio(
    facts,
    [p2First, p2Second],
    { occupiedNodeIds: nodeIds, precision }
  );
  const p1Value = valueOpeningPortfolio(p1Portfolio, policy);
  const p2Value = valueOpeningPortfolio(p2Portfolio, policy);
  return {
    line: nodeIds.map((nodeId, index) => ({ player: PLAYERS[index], nodeId })),
    p1Portfolio,
    p2Portfolio,
    p1Value,
    p2Value,
    seatAdvantage: p1Value - p2Value,
    normalisedSeatAdvantage: normaliseSeatAdvantage(p1Value, p2Value)
  };
}

function countBits(mask) {
  let remaining = mask;
  let count = 0;
  while (remaining !== 0n) {
    remaining &= remaining - 1n;
    count += 1;
  }
  return count;
}

function compileReachMasks(compiledPaths) {
  let oneRoadDestinationMask = 0n;
  for (const path of compiledPaths.oneRoadPaths) {
    oneRoadDestinationMask |= path.destinationMask;
  }

  const destinationMasksByTransit = new Map();
  for (const path of compiledPaths.twoRoadPaths) {
    destinationMasksByTransit.set(
      path.transitNodeId,
      (destinationMasksByTransit.get(path.transitNodeId) ?? 0n) | path.destinationMask
    );
  }

  const twoRoadTransitGroups = [...destinationMasksByTransit.entries()]
    .sort(([left], [right]) => left - right)
    .map(([transitNodeId, destinationMask]) => Object.freeze({
      transitMask: nodeMask(transitNodeId),
      destinationMask
    }));

  return Object.freeze({
    oneRoadDestinationMask,
    twoRoadTransitGroups: Object.freeze(twoRoadTransitGroups)
  });
}

function expansionValue(
  entry,
  opponentEntry,
  occupiedMask,
  settlementBlockedMask,
  policy,
  expansionCountsByPairMatchup,
  pairCount
) {
  const cacheIndex = entry.unorderedPairId * pairCount + opponentEntry.unorderedPairId;
  const cachedCounts = expansionCountsByPairMatchup[cacheIndex];
  if (cachedCounts !== 0) {
    const oneRoadCount = (cachedCounts & 0xff) - 1;
    const twoRoadCount = (cachedCounts >>> 8) - 1;
    return oneRoadCount * policy.weights[ONE_ROAD_FEATURE]
      + twoRoadCount * policy.weights[TWO_ROAD_FEATURE];
  }

  const oneRoadMask = entry.reachMasks.oneRoadDestinationMask & ~occupiedMask;
  const opponentMask = occupiedMask & ~entry.compiledPaths.ownedNodeMask;
  let twoRoadMask = 0n;
  for (const group of entry.reachMasks.twoRoadTransitGroups) {
    if ((group.transitMask & opponentMask) === 0n) {
      twoRoadMask |= group.destinationMask;
    }
  }
  twoRoadMask &= ~occupiedMask & ~settlementBlockedMask;
  const oneRoadCount = countBits(oneRoadMask);
  const twoRoadCount = countBits(twoRoadMask);
  expansionCountsByPairMatchup[cacheIndex] = (oneRoadCount + 1) | ((twoRoadCount + 1) << 8);
  return oneRoadCount * policy.weights[ONE_ROAD_FEATURE]
    + twoRoadCount * policy.weights[TWO_ROAD_FEATURE];
}

function createPairEntry(facts, orderedNodeIds, unorderedPairId, policy, precision) {
  const portfolio = buildOpeningPortfolio(facts, orderedNodeIds, {
    occupiedNodeIds: orderedNodeIds,
    precision
  });
  valueOpeningPortfolio(portfolio, policy);

  const staticFeatures = Object.freeze({
    ...flattenPolicyFeatures(portfolio),
    [ONE_ROAD_FEATURE]: 0,
    [TWO_ROAD_FEATURE]: 0
  });
  const staticValue = Object.entries(staticFeatures).reduce(
    (value, [feature, amount]) => value + amount * policy.weights[feature],
    0
  );
  const compiledPaths = compileExpansionPaths(facts, orderedNodeIds);

  return Object.freeze({
    orderedNodeIds: Object.freeze([...orderedNodeIds]),
    unorderedPairId,
    startingCards: portfolio.startingCards,
    staticFeatures,
    staticValue,
    compiledPaths,
    reachMasks: compileReachMasks(compiledPaths)
  });
}

function buildOrderedPairIndex(facts, policy, precision) {
  const index = [];
  const addEntry = (firstNodeId, secondNodeId, unorderedPairId) => {
    index[firstNodeId] ??= [];
    index[firstNodeId][secondNodeId] = createPairEntry(
      facts,
      [firstNodeId, secondNodeId],
      unorderedPairId,
      policy,
      precision
    );
  };

  for (const [unorderedPairId, [leftNodeId, rightNodeId]] of facts.legalPairs.entries()) {
    addEntry(leftNodeId, rightNodeId, unorderedPairId);
    addEntry(rightNodeId, leftNodeId, unorderedPairId);
  }
  return index;
}

function pairValue(
  entry,
  opponentEntry,
  occupiedMask,
  settlementBlockedMask,
  policy,
  expansionCountsByPairMatchup,
  pairCount
) {
  return entry.staticValue + expansionValue(
    entry,
    opponentEntry,
    occupiedMask,
    settlementBlockedMask,
    policy,
    expansionCountsByPairMatchup,
    pairCount
  );
}

function makeScalarTerminal(nodeIds, p1Value, p2Value) {
  return {
    nodeIds: [...nodeIds],
    p1Value,
    p2Value,
    seatAdvantage: p1Value - p2Value,
    normalisedSeatAdvantage: normaliseSeatAdvantage(p1Value, p2Value)
  };
}

function isBetterScalar(seatAdvantage, nodeIds, selected, maximise, precision) {
  if (selected === null) return true;
  const difference = seatAdvantage - selected.seatAdvantage;
  if (Math.abs(difference) <= precision) {
    return compareNodeIdSequences(nodeIds, selected.nodeIds) < 0;
  }
  return maximise ? difference > 0 : difference < 0;
}

function scalarSummary(terminal) {
  return {
    seatAdvantage: terminal.seatAdvantage,
    normalisedSeatAdvantage: terminal.normalisedSeatAdvantage,
    line: terminal.nodeIds.map((nodeId, index) => ({ player: PLAYERS[index], nodeId }))
  };
}

function responseComparator(left, right, precision) {
  const difference = left.seatAdvantage - right.seatAdvantage;
  if (Math.abs(difference) > precision) return difference;
  return compareNodeIdSequences(left.nodeIds, right.nodeIds);
}

export function solveOpeningDraft(facts, { policy, precision }) {
  const nodeIds = facts.nodes.map((node) => node.nodeId).sort((left, right) => left - right);
  const nodeBits = [];
  const blockedNodeMasks = [];
  for (const node of facts.nodes) {
    nodeBits[node.nodeId] = nodeMask(node.nodeId);
    blockedNodeMasks[node.nodeId] = idsMask(node.blockedNodeIds);
  }

  const pairIndex = buildOrderedPairIndex(facts, policy, precision);
  const pairCount = facts.legalPairs.length;
  const expansionCountsByPairMatchup = new Uint16Array(pairCount * pairCount);
  const sequence = Array(PLAYERS.length);

  const search = (depth, occupiedMask, settlementBlockedMask) => {
    const maximise = PLAYERS[depth] === "P1";
    let selected = null;

    for (const nodeId of nodeIds) {
      const bit = nodeBits[nodeId];
      if ((settlementBlockedMask & bit) !== 0n) continue;
      sequence[depth] = nodeId;
      const nextOccupiedMask = occupiedMask | bit;
      const nextBlockedMask = settlementBlockedMask | blockedNodeMasks[nodeId];

      if (depth === PLAYERS.length - 1) {
        const p1Entry = pairIndex[sequence[0]]?.[sequence[3]];
        const p2Entry = pairIndex[sequence[1]]?.[sequence[2]];
        if (!p1Entry || !p2Entry) throw new Error("opening-solver-missing-pair");
        const p1Value = pairValue(
          p1Entry,
          p2Entry,
          nextOccupiedMask,
          nextBlockedMask,
          policy,
          expansionCountsByPairMatchup,
          pairCount
        );
        const p2Value = pairValue(
          p2Entry,
          p1Entry,
          nextOccupiedMask,
          nextBlockedMask,
          policy,
          expansionCountsByPairMatchup,
          pairCount
        );
        const seatAdvantage = p1Value - p2Value;
        if (isBetterScalar(seatAdvantage, sequence, selected, maximise, precision)) {
          selected = makeScalarTerminal(sequence, p1Value, p2Value);
        }
      } else {
        const candidate = search(depth + 1, nextOccupiedMask, nextBlockedMask);
        if (
          candidate !== null &&
          isBetterScalar(candidate.seatAdvantage, candidate.nodeIds, selected, maximise, precision)
        ) {
          selected = candidate;
        }
      }
    }

    return selected;
  };

  const rootOptions = [];
  let selected = null;
  for (const nodeId of nodeIds) {
    sequence[0] = nodeId;
    const terminal = search(1, nodeBits[nodeId], blockedNodeMasks[nodeId]);
    if (terminal === null) continue;
    rootOptions.push({ nodeId, ...scalarSummary(terminal) });
    if (isBetterScalar(terminal.seatAdvantage, terminal.nodeIds, selected, true, precision)) {
      selected = terminal;
    }
  }
  if (selected === null) throw new Error("opening-solver-no-line");

  const responseByPair = new Map();
  sequence[0] = selected.nodeIds[0];
  const collectResponses = (depth, occupiedMask, settlementBlockedMask) => {
    for (const nodeId of nodeIds) {
      const bit = nodeBits[nodeId];
      if ((settlementBlockedMask & bit) !== 0n) continue;
      sequence[depth] = nodeId;
      const nextOccupiedMask = occupiedMask | bit;
      const nextBlockedMask = settlementBlockedMask | blockedNodeMasks[nodeId];

      if (depth < PLAYERS.length - 1) {
        collectResponses(depth + 1, nextOccupiedMask, nextBlockedMask);
        continue;
      }

      const p1Entry = pairIndex[sequence[0]]?.[sequence[3]];
      const p2Entry = pairIndex[sequence[1]]?.[sequence[2]];
      if (!p1Entry || !p2Entry) throw new Error("opening-solver-missing-pair");
      const p1Value = pairValue(
        p1Entry,
        p2Entry,
        nextOccupiedMask,
        nextBlockedMask,
        policy,
        expansionCountsByPairMatchup,
        pairCount
      );
      const p2Value = pairValue(
        p2Entry,
        p1Entry,
        nextOccupiedMask,
        nextBlockedMask,
        policy,
        expansionCountsByPairMatchup,
        pairCount
      );
      const seatAdvantage = p1Value - p2Value;
      const key = `${sequence[1]}:${sequence[2]}`;
      const current = responseByPair.get(key) ?? null;
      if (isBetterScalar(seatAdvantage, sequence, current, true, precision)) {
        responseByPair.set(key, makeScalarTerminal(sequence, p1Value, p2Value));
      }
    }
  };
  const rootNodeId = selected.nodeIds[0];
  collectResponses(1, nodeBits[rootNodeId], blockedNodeMasks[rootNodeId]);

  const responseOptions = [...responseByPair.values()]
    .map((terminal) => ({
      nodeIds: [terminal.nodeIds[1], terminal.nodeIds[2]],
      ...scalarSummary(terminal)
    }))
    .sort((left, right) => responseComparator(left, right, precision))
    .slice(0, MAX_RESPONSE_OPTIONS);

  const materialised = materialiseTerminal(facts, selected.nodeIds, policy, precision);
  if (
    Math.abs(materialised.p1Value - selected.p1Value) > precision ||
    Math.abs(materialised.p2Value - selected.p2Value) > precision
  ) {
    throw new Error("opening-solver-precompute-drift");
  }

  return {
    ...materialised,
    rootOptions,
    responseOptions
  };
}
