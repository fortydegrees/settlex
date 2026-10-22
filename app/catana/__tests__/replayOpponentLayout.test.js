import { expect, it } from "vitest";
import { getOpponentHudLayout } from "../utils/opponentHudLayout";

const opponents = [{ id: "0" }, { id: "1" }];
it("keeps both duel hands available in a neutral phone replay", () => {
  expect(getOpponentHudLayout({ opponents, isNeutralViewer: true, isPhoneLayout: true, isReplay: true })).toEqual({ topOpponents: [opponents[1]], bottomOpponent: opponents[0] });
});
it("keeps every opponent available in a seated multiplayer phone replay", () => {
  expect(getOpponentHudLayout({ opponents, isNeutralViewer: false, isPhoneLayout: true, isReplay: true }).topOpponents).toEqual(opponents);
});
it("retains the compact opponent selection for live phone games", () => {
  expect(getOpponentHudLayout({ opponents, isNeutralViewer: true, isPhoneLayout: true })).toEqual({ topOpponents: [opponents[0]], bottomOpponent: null });
});
