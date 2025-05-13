/**
 * @fileoverview Functions for manipulating and searching arrays, sets, and maps.
 */

export function hasAll(set, ...vals) {
    for (const val of vals) {
        if (!set.has(val)) {
            return false;
        }
    }
    return true;
}

export function sumByKey(map, ...keys) {
    let sum = 0;
    for (const key of keys) {
        sum += map.get(key) || 0;
    }
    return sum;
}

export function findLowestBy(collection, fn) {
    let lowestVal;
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

export function findAllLowestBy(collection, fn) {
    let lowestVals = [];
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

export function findHighestBy(collection, fn) {
    let highestVal;
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

export function findAllHighestBy(collection, fn) {
    let highestVals = [];
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

export function countMatches(collection, fn) {
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
export function defined(val) {
    return val !== null && val !== undefined;
}
