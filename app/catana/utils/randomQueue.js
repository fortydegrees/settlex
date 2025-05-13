function getRandom(max) {
  return Math.floor(max * Math.random());
}

export class RandomQueue {
  static getRandomInt = getRandom;

  vals;
  nextForPop = null;

  constructor(initial) {
      if (initial === undefined) {
          this.vals = [];
      } else if (initial instanceof RandomQueue) {
          this.vals = initial.vals.slice();
      } else {
          this.vals = initial.slice();
      }
  }

  get length() {
      return this.vals.length;
  }

  isEmpty() {
      return this.vals.length === 0;
  }

  push(...vals) {
      this.vals.push(...vals);
      this.markMutated();
  }

  remove(val) {
      const i = this.vals.indexOf(val);
      if (i === -1) {
          return false;
      }
      this.removeAtIndex(i);
      return true;
  }

  filter(fn) {
      return new RandomQueue(this.vals.filter(fn));
  }

  filterBy(...vals) {
      return this.filter(val => vals.indexOf(val) > -1);
  }

  popExcluding(...vals) {
      const filtered = this.filter(val => vals.indexOf(val) === -1);
      const popped = filtered.pop();
      if (popped === undefined) {
          return undefined;
      }
      this.remove(popped);
      return popped;
  }

  popAvoiding(...vals) {
      const val = this.popExcluding(...vals);
      if (val !== undefined) {
          return val;
      }
      return this.pop();
  }

  popOneOf(...vals) {
      const filtered = this.filter(val => vals.indexOf(val) >= 0);
      const popped = filtered.pop();
      if (popped === undefined) {
          return undefined;
      }
      this.remove(popped);
      return popped;
  }

  pop() {
      if (this.isEmpty()) {
          return undefined;
      }
      if (this.nextForPop === null) {
          this.nextForPop = RandomQueue.getRandomInt(this.vals.length);
      }
      return this.removeAtIndex(this.nextForPop);
  }

  peek() {
      if (this.isEmpty()) {
          return undefined;
      }
      this.nextForPop = RandomQueue.getRandomInt(this.vals.length);
      return this.vals[this.nextForPop];
  }

  includes(v) {
      return this.vals.includes(v);
  }

  removeAtIndex(i) {
      const val = this.vals[i];
      this.vals.splice(i, 1);
      this.markMutated();
      return val;
  }

  markMutated() {
      this.nextForPop = null;
  }
}
