import { describe, expect, it } from 'vitest';
import { getFeedArrivalKey } from '../feedArrival';

describe('feed arrival policy', () => {
  it('cues only a single new live tail row, including the first arrival after empty', () => {
    expect(getFeedArrivalKey(['a'], ['a', 'b'])).toBe('b');
    expect(getFeedArrivalKey([], ['a'])).toBe('a');
  });
  it('keeps initial history and batches quiet', () => {
    expect(getFeedArrivalKey(null, ['a'])).toBe(null);
    expect(getFeedArrivalKey([], ['a', 'b'])).toBe(null);
    expect(getFeedArrivalKey(['a'], ['a', 'b', 'c'])).toBe(null);
  });
  it('keeps rerenders, replacement, removal, prepend and reorder quiet', () => {
    for (const keys of [['a'], ['b'], [], ['b', 'a'], ['b', 'c']]) {
      expect(getFeedArrivalKey(['a'], keys)).toBe(null);
    }
  });
  it('does not treat duplicate identities as arrivals', () => {
    expect(getFeedArrivalKey(['a'], ['a', 'a'])).toBe(null);
  });
  it('suppresses even a one-row forward seek in quiet mode', () => {
    expect(getFeedArrivalKey(['a'], ['a', 'b'], false)).toBe(null);
  });
});
