export function registerEffects({ bus, effects } = {}) {
  if (!bus || !effects) return () => {};
  const unsubscribes = [];

  if (effects.resourceDistribution) {
    unsubscribes.push(
      bus.on("resource:distribution", effects.resourceDistribution)
    );
  }
  if (effects.piecePlacement) {
    unsubscribes.push(bus.on("build:place", effects.piecePlacement));
  }
  if (effects.devCardReveal) {
    unsubscribes.push(bus.on("devcard:reveal", effects.devCardReveal));
  }

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}
