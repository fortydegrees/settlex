import { createCatanGame } from "../app/catana/Game.js";

export const ServerCatan = createCatanGame({
  includeDebugMoves: false,
  includeEffects: true,
  includeServerMoves: true
});
