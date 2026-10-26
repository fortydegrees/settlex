// A single appended live row gets one cue. Loading/seeking/replacing history does not.
export function getFeedArrivalKey(previousKeys, nextKeys, enabled = true) {
  if (!enabled || previousKeys == null || nextKeys.length !== previousKeys.length + 1) return null;
  if (!previousKeys.every((key, index) => key === nextKeys[index])) return null;
  const key = nextKeys[nextKeys.length - 1];
  return previousKeys.includes(key) ? null : key;
}
