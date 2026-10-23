import { getGameLogEntryKey } from "../../../lib/shared/gameText";
import { DEV_CARD_TEXT } from "../game/cards/devCardDisplayUtils";

// Archives originally logged purchases without identities. Recover a card only
// from the immediate purchase transition, never from a later reveal or play.
export function buildReplayPurchaseDetails(frames) {
  const purchases = new Map();
  let seenLogCount = 0;
  for (let index = 0; index < frames.length; index += 1) {
    const state = frames[index]?.state;
    const log = state?.G?.gameLog ?? [];
    const added = log.slice(seenLogCount);
    seenLogCount = log.length;
    const buys = added.filter(entry => entry.type === "dev:buy");
    for (const buy of buys) {
      if (buy.data?.cardType || buys.filter(entry => entry.actorId === buy.actorId).length !== 1) continue;
      const before = frames[index - 1]?.state?.G?.core?.playerStateById?.[buy.actorId]?.devCards;
      const after = state?.G?.core?.playerStateById?.[buy.actorId]?.devCards;
      if (!Array.isArray(before) || !Array.isArray(after) || after.length !== before.length + 1) continue;
      if (![...before, ...after].every(card => Object.hasOwn(DEV_CARD_TEXT, card))) continue;
      const remaining = [...after];
      let complete = true;
      for (const card of before) {
        const position = remaining.indexOf(card);
        if (position === -1) { complete = false; break; }
        remaining.splice(position, 1);
      }
      if (!complete || remaining.length !== 1) continue;
      const logIndex = log.indexOf(buy);
      purchases.set(getGameLogEntryKey(buy, logIndex), {
        ...buy, data: { ...buy.data, cardType: remaining[0] },
      });
    }
  }
  return entries => entries.map((entry, index) => purchases.get(getGameLogEntryKey(entry, index)) ?? entry);
}
