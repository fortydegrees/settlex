import { createCatanGame } from "../app/catana/Game.js";

// Privileged def: used only by the server's internal dispatch path
// (timers/presence/bots) so it can apply forfeits and auto-starts.
export const ServerCatan = createCatanGame({
  includeDebugMoves: false,
  includeEffects: true,
  includeServerMoves: true
});

// Socket-facing def: what remote clients are validated against. Server-only
// moves are absent here, so clients cannot emit them at all.
export const SocketCatan = createCatanGame({
  includeDebugMoves: false,
  includeEffects: true,
  includeServerMoves: false
});
