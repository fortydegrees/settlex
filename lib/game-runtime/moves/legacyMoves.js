import { pickRandom } from "./randomChoice.js";

export const takeCardsFromBank = (context, cards, playerID) => {
  const { G } = context;
  console.log("giving cards", G, cards, playerID);

  const bank = G.core?.bank?.resources ?? [];
  const playerState = G.core?.playerStateById?.[playerID];
  if (!playerState) {
    return;
  }
  const playerHand = playerState.resources;
  const cardLog = [];
  for (const card of cards) {
    const cardIndex = bank.indexOf(card);

    if (cardIndex !== -1) {
      bank.splice(cardIndex, 1);
      playerHand.push(card);
      cardLog.push(card);
    }
  }
  context.log.setMetadata({
    message: `player ${playerID} received ${cardLog}`,
  });
};

export const getAvailableMoves = (context) => {};

export const autoChooseSteal = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const playerID = ctx.currentPlayer;
    const victims = G.core?.players?.filter((id) => id !== playerID) ?? [];
    const victimId = pickRandom(victims, random);
    if (!victimId) {
      return;
    }
    log.setMetadata({ message: `auto-choosing steal target ${victimId}` });
  }
};
