export function buildAutoMoveAction({ move, playerID, metadata, args = [] }) {
  const credentials = metadata?.players?.[playerID]?.credentials ?? null;
  return {
    type: "MAKE_MOVE",
    payload: { type: move, args, playerID, credentials }
  };
}
