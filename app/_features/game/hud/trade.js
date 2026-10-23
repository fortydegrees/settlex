import { bestTradeRate } from "@settlex/game-core";

export const getMaritimeTradeRateIfTradable = ({
  core,
  coreTopology,
  playerId,
  resource,
  playerResources
}) => {
  if (!core || !coreTopology) return null;
  const rate = bestTradeRate(core, coreTopology, playerId, resource);
  const count = playerResources.filter((r) => r === resource).length;
  return count >= rate ? rate : null;
};
