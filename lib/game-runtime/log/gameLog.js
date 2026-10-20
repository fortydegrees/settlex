export function appendGameLog(G, ctx, entry) {
  if (!G.gameLog) {
    G.gameLog = [];
  }
  const nextId = (G.gameLogSeq ?? 0) + 1;
  G.gameLogSeq = nextId;
  G.gameLog.push({
    id: nextId,
    turn: ctx?.turn ?? null,
    phase: ctx?.phase ?? null,
    ...entry
  });
}
