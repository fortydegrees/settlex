export function getTurnControlMode({ canRoll, canEnd }) {
  if (canRoll) return "roll";
  if (canEnd) return "endTurn";
  return "inactive";
}
