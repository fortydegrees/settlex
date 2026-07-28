export function getOpponentHudLayout({
  opponents = [],
  isNeutralViewer = false,
  isPhoneLayout = false
} = {}) {
  if (isPhoneLayout) {
    return {
      topOpponents: opponents.slice(0, 1),
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
