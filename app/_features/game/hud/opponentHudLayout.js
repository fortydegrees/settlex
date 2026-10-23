export function getOpponentHudLayout({
  opponents = [],
  isNeutralViewer = false,
  isPhoneLayout = false,
  isReplay = false,
} = {}) {
  if (isReplay && isNeutralViewer && opponents.length === 2) {
    return { topOpponents: [opponents[1]], bottomOpponent: opponents[0] };
  }
  if (isPhoneLayout) {
    return {
      topOpponents: isReplay ? opponents : opponents.slice(0, 1),
      bottomOpponent: null
    };
  }

  if (isNeutralViewer && opponents.length === 2) {
    return {
      topOpponents: [opponents[1]],
      bottomOpponent: opponents[0]
    };
  }

  return {
    topOpponents: opponents,
    bottomOpponent: null
  };
}
