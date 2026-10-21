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
  if (effects.cardTransfer) {
    unsubscribes.push(bus.on("resource:robber-steal", effects.cardTransfer));
    unsubscribes.push(bus.on("resource:maritime-trade", effects.cardTransfer));
    unsubscribes.push(bus.on("resource:discard", effects.cardTransfer));
  }
  if (effects.robberMove) {
    unsubscribes.push(bus.on("robber:move", effects.robberMove));
  }
  if (effects.awardClaim) {
    unsubscribes.push(bus.on("award:claim", effects.awardClaim));
  }
  if (effects.devCardPlay) {
    unsubscribes.push(bus.on("devcard:play:start", effects.devCardPlay));
    unsubscribes.push(bus.on("devcard:play:resolve", effects.devCardPlay));
  }

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}
