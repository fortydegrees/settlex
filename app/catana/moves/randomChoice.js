export const pickRandom = (items, random) => {
  if (!items || items.length === 0) return null;
  if (random?.Shuffle) {
    return random.Shuffle([...items])[0];
  }
  if (random?.Number) {
    const index = Math.floor(random.Number() * items.length);
    return items[index];
  }
  return items[0];
};
