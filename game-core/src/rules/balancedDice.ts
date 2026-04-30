export type DicePair = [number, number];

export type BalancedDiceDeckEntry = {
  totalDice: number;
  dicePairs: DicePair[];
  recentlyRolledCount: number;
};

export type BalancedDiceState = {
  mode: "balanced";
  deck: BalancedDiceDeckEntry[];
  cardsLeft: number;
  recentTotals: number[];
  sevensRolledByPlayer: Record<string, number>;
  sevenStreak: { playerId: string | null; streakCount: number };
};

export type BalancedDiceDrawOptions = {
  playerId: string;
  playerIds?: string[];
  rng: () => number;
};

const BALANCED_DICE_DEFAULTS = {
  minimumCardsBeforeReshuffling: 13,
  recentRollMemory: 5,
  recentRollPenalty: 0.34,
  sevenBalancing: true,
  sevenStreakPenalty: 0.4
};

const STANDARD_DICE_DECK: Array<{ totalDice: number; dicePairs: DicePair[] }> = [
  { totalDice: 2, dicePairs: [[1, 1]] },
  { totalDice: 3, dicePairs: [[1, 2], [2, 1]] },
  { totalDice: 4, dicePairs: [[1, 3], [2, 2], [3, 1]] },
  { totalDice: 5, dicePairs: [[1, 4], [2, 3], [3, 2], [4, 1]] },
  { totalDice: 6, dicePairs: [[1, 5], [2, 4], [3, 3], [4, 2], [5, 1]] },
  { totalDice: 7, dicePairs: [[1, 6], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1]] },
  { totalDice: 8, dicePairs: [[2, 6], [3, 5], [4, 4], [5, 3], [6, 2]] },
  { totalDice: 9, dicePairs: [[3, 6], [4, 5], [5, 4], [6, 3]] },
  { totalDice: 10, dicePairs: [[4, 6], [5, 5], [6, 4]] },
  { totalDice: 11, dicePairs: [[5, 6], [6, 5]] },
  { totalDice: 12, dicePairs: [[6, 6]] }
];

const clampRandom = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value >= 1) return 0.999999999999;
  return value;
};

const clampSevenAdjustment = (value: number): number => {
  if (value < 0) return 0;
  if (value > 2) return 2;
  return value;
};

const cloneStandardDeck = (): BalancedDiceDeckEntry[] =>
  STANDARD_DICE_DECK.map((entry) => ({
    totalDice: entry.totalDice,
    dicePairs: entry.dicePairs.map((pair) => [pair[0], pair[1]]),
    recentlyRolledCount: 0
  }));

const countStandardCards = () =>
  STANDARD_DICE_DECK.reduce((total, entry) => total + entry.dicePairs.length, 0);

export function createBalancedDiceState(playerIds: string[] = []): BalancedDiceState {
  const sevensRolledByPlayer: Record<string, number> = {};
  for (const playerId of playerIds) {
    sevensRolledByPlayer[playerId] = 0;
  }

  return {
    mode: "balanced",
    deck: cloneStandardDeck(),
    cardsLeft: countStandardCards(),
    recentTotals: [],
    sevensRolledByPlayer,
    sevenStreak: { playerId: null, streakCount: 0 }
  };
}

function reshuffleBalancedDiceDeck(state: BalancedDiceState) {
  const nextDeck = cloneStandardDeck();
  for (const entry of nextDeck) {
    const current = state.deck.find((candidate) => candidate.totalDice === entry.totalDice);
    entry.recentlyRolledCount = current?.recentlyRolledCount ?? 0;
  }
  state.deck = nextDeck;
  state.cardsLeft = countStandardCards();
}

function getEntry(state: BalancedDiceState, totalDice: number): BalancedDiceDeckEntry {
  const entry = state.deck.find((candidate) => candidate.totalDice === totalDice);
  if (!entry) {
    throw new Error(`Balanced dice deck is missing total ${totalDice}.`);
  }
  return entry;
}

function getSevenAdjustment(
  state: BalancedDiceState,
  playerId: string,
  playerIds: string[]
): number {
  if (!BALANCED_DICE_DEFAULTS.sevenBalancing || playerIds.length < 2) return 1;

  let totalSevens = 0;
  for (const id of playerIds) {
    totalSevens += state.sevensRolledByPlayer[id] ?? 0;
  }
  if (totalSevens < playerIds.length) {
    return clampSevenAdjustment(getSevenStreakAdjustment(state, playerId));
  }

  const playerSevens = state.sevensRolledByPlayer[playerId] ?? 0;
  const percentageOfTotalSevens = playerSevens / totalSevens;
  const idealPercentageOfTotalSevens = 1 / playerIds.length;
  const imbalanceAdjustment =
    1 + (idealPercentageOfTotalSevens - percentageOfTotalSevens) / idealPercentageOfTotalSevens;
  const adjustment = imbalanceAdjustment + getSevenStreakAdjustment(state, playerId) - 1;

  return clampSevenAdjustment(adjustment);
}

function getSevenStreakAdjustment(state: BalancedDiceState, playerId: string): number {
  if (!state.sevenStreak.playerId || state.sevenStreak.streakCount <= 0) return 1;
  const direction = state.sevenStreak.playerId === playerId ? -1 : 1;
  return 1 + BALANCED_DICE_DEFAULTS.sevenStreakPenalty * state.sevenStreak.streakCount * direction;
}

function getWeight(
  state: BalancedDiceState,
  entry: BalancedDiceDeckEntry,
  playerId: string,
  playerIds: string[]
): number {
  if (entry.dicePairs.length === 0 || state.cardsLeft <= 0) return 0;
  const recentMultiplier = Math.max(
    0,
    1 - entry.recentlyRolledCount * BALANCED_DICE_DEFAULTS.recentRollPenalty
  );
  const sevenMultiplier =
    entry.totalDice === 7 ? getSevenAdjustment(state, playerId, playerIds) : 1;
  return (entry.dicePairs.length / state.cardsLeft) * recentMultiplier * sevenMultiplier;
}

function updateRecentTotals(state: BalancedDiceState, totalDice: number) {
  state.recentTotals.push(totalDice);
  getEntry(state, totalDice).recentlyRolledCount += 1;

  while (state.recentTotals.length > BALANCED_DICE_DEFAULTS.recentRollMemory) {
    const removed = state.recentTotals.shift();
    if (removed == null) continue;
    const entry = getEntry(state, removed);
    entry.recentlyRolledCount = Math.max(0, entry.recentlyRolledCount - 1);
  }
}

function updateSevenRolls(state: BalancedDiceState, playerId: string) {
  state.sevensRolledByPlayer[playerId] = (state.sevensRolledByPlayer[playerId] ?? 0) + 1;

  if (state.sevenStreak.playerId === playerId) {
    state.sevenStreak.streakCount += 1;
    return;
  }

  state.sevenStreak = { playerId, streakCount: 1 };
}

export function drawBalancedDice(
  state: BalancedDiceState,
  { playerId, playerIds = Object.keys(state.sevensRolledByPlayer), rng }: BalancedDiceDrawOptions
): DicePair {
  if (state.cardsLeft < BALANCED_DICE_DEFAULTS.minimumCardsBeforeReshuffling) {
    reshuffleBalancedDiceDeck(state);
  }

  const trackedPlayerIds = Array.from(new Set([...playerIds, playerId].map(String)));
  for (const id of trackedPlayerIds) {
    state.sevensRolledByPlayer[id] ??= 0;
  }

  const weightedEntries = state.deck.map((entry) => ({
    entry,
    weight: getWeight(state, entry, playerId, trackedPlayerIds)
  }));
  const totalWeight = weightedEntries.reduce((total, { weight }) => total + weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Balanced dice deck has no drawable cards.");
  }

  let target = clampRandom(rng()) * totalWeight;
  let selectedEntry: BalancedDiceDeckEntry | null = null;
  for (const { entry, weight } of weightedEntries) {
    if (weight <= 0) continue;
    if (target < weight) {
      selectedEntry = entry;
      break;
    }
    target -= weight;
  }
  selectedEntry ??= weightedEntries.find(({ weight }) => weight > 0)?.entry ?? null;
  if (!selectedEntry || selectedEntry.dicePairs.length === 0) {
    throw new Error("Balanced dice failed to select a drawable total.");
  }

  const pairIndex = Math.min(
    Math.floor(clampRandom(rng()) * selectedEntry.dicePairs.length),
    selectedEntry.dicePairs.length - 1
  );
  const [pair] = selectedEntry.dicePairs.splice(pairIndex, 1);
  state.cardsLeft -= 1;
  updateRecentTotals(state, selectedEntry.totalDice);
  if (selectedEntry.totalDice === 7) {
    updateSevenRolls(state, playerId);
  }

  return [pair[0], pair[1]];
}
