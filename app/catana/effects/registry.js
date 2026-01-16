export function registerEffects({ bus, effects } = {}) {
  if (!bus || !effects) return () => {};
  const unsubscribes = [];

  if (effects.resourceDistribution) {
    unsubscribes.push(
      bus.on("resource:distribution", effects.resourceDistribution)
    );
  }

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}
