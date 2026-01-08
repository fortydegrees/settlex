export type RandomFn = () => number;

function getRandomInt(max: number, rng: RandomFn): number {
  return Math.floor(max * rng());
}

export class RandomQueue<T> {
  static getRandomInt = getRandomInt;

  vals: T[];
  private nextForPop: number | null = null;
  private rng: RandomFn;

  constructor(initial: T[] | RandomQueue<T> | undefined, rng: RandomFn) {
    this.rng = rng;
    if (initial === undefined) {
      this.vals = [];
    } else if (initial instanceof RandomQueue) {
      this.vals = initial.vals.slice();
    } else {
      this.vals = initial.slice();
    }
  }

  get length(): number {
    return this.vals.length;
  }

  isEmpty(): boolean {
    return this.vals.length === 0;
  }

  push(...vals: T[]): void {
    this.vals.push(...vals);
    this.markMutated();
  }

  remove(val: T): boolean {
    const i = this.vals.indexOf(val);
    if (i === -1) {
      return false;
    }
    this.removeAtIndex(i);
    return true;
  }

  filter(fn: (val: T) => boolean): RandomQueue<T> {
    return new RandomQueue(this.vals.filter(fn), this.rng);
  }

  filterBy(...vals: T[]): RandomQueue<T> {
    return this.filter((val) => vals.indexOf(val) > -1);
  }

  popExcluding(...vals: T[]): T | undefined {
    const filtered = this.filter((val) => vals.indexOf(val) === -1);
    const popped = filtered.pop();
    if (popped === undefined) {
      return undefined;
    }
    this.remove(popped);
    return popped;
  }

  popAvoiding(...vals: T[]): T | undefined {
    const val = this.popExcluding(...vals);
    if (val !== undefined) {
      return val;
    }
    return this.pop();
  }

  popOneOf(...vals: T[]): T | undefined {
    const filtered = this.filter((val) => vals.indexOf(val) >= 0);
    const popped = filtered.pop();
    if (popped === undefined) {
      return undefined;
    }
    this.remove(popped);
    return popped;
  }

  pop(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    if (this.nextForPop === null) {
      this.nextForPop = getRandomInt(this.vals.length, this.rng);
    }
    return this.removeAtIndex(this.nextForPop);
  }

  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    this.nextForPop = getRandomInt(this.vals.length, this.rng);
    return this.vals[this.nextForPop];
  }

  includes(v: T): boolean {
    return this.vals.includes(v);
  }

  removeAtIndex(i: number): T {
    const val = this.vals[i];
    this.vals.splice(i, 1);
    this.markMutated();
    return val;
  }

  private markMutated(): void {
    this.nextForPop = null;
  }
}
