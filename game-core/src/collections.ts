/**
 * @fileoverview Functions for manipulating and searching arrays, sets, and maps.
 */

type HasSet<T> = { has: (val: T) => boolean };

export function hasAll<T>(set: HasSet<T>, ...vals: T[]): boolean {
  for (const val of vals) {
    if (!set.has(val)) {
      return false;
    }
  }
  return true;
}

export function sumByKey<K>(map: Map<K, number>, ...keys: K[]): number {
  let sum = 0;
  for (const key of keys) {
    sum += map.get(key) || 0;
  }
  return sum;
}

export function findLowestBy<T>(collection: Iterable<T>, fn: (val: T) => number): T | undefined {
  let lowestVal: T | undefined;
  let lowestNum = Number.MAX_VALUE;
  for (const val of collection) {
    const score = fn(val);
    if (score < lowestNum) {
      lowestNum = score;
      lowestVal = val;
    }
  }
  return lowestVal;
}

export function findAllLowestBy<T>(collection: Iterable<T>, fn: (val: T) => number): T[] {
  let lowestVals: T[] = [];
  let lowestNum = Number.MAX_VALUE;
  for (const val of collection) {
    const score = fn(val);
    if (score < lowestNum) {
      lowestNum = score;
      lowestVals = [val];
    } else if (score === lowestNum) {
      lowestVals.push(val);
    }
  }
  return lowestVals;
}

export function findHighestBy<T>(collection: Iterable<T>, fn: (val: T) => number): T | undefined {
  let highestVal: T | undefined;
  let highestNum = -1;
  for (const val of collection) {
    const score = fn(val);
    if (score > highestNum) {
      highestNum = score;
      highestVal = val;
    }
  }
  return highestVal;
}

export function findAllHighestBy<T>(collection: Iterable<T>, fn: (val: T) => number): T[] {
  let highestVals: T[] = [];
  let highestNum = -1;
  for (const val of collection) {
    const score = fn(val);
    if (score > highestNum) {
      highestNum = score;
      highestVals = [val];
    } else if (score === highestNum) {
      highestVals.push(val);
    }
  }
  return highestVals;
}

export function countMatches<T>(collection: Iterable<T>, fn: (val: T) => boolean): number {
  let i = 0;
  for (const val of collection) {
    if (fn(val)) {
      i++;
    }
  }
  return i;
}

/**
 * Use this in conjunction with .filter() on an array.
 */
export function defined<T>(val: T | null | undefined): val is T {
  return val !== null && val !== undefined;
}
