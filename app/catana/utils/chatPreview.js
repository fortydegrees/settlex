const PREVIEW_MESSAGES = [
  "Ready when you are.",
  "I can take the next seat.",
];

const compareSeatIds = (left, right) =>
  String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });

const getPreviewSeatIds = (playerID, playerMap = {}) => {
  const seatIds = Object.keys(playerMap)
    .filter((id) => playerMap?.[id] != null)
    .sort(compareSeatIds);

  const explicitId = playerID != null ? String(playerID) : null;
  const currentId = explicitId ?? seatIds[0] ?? "system";
  const opponentId = seatIds.find((id) => id !== currentId) ?? currentId;

  return { currentId, opponentId };
};

export function buildChatPreviewEntries({ playerID, playerMap = {} } = {}) {
  const { currentId, opponentId } = getPreviewSeatIds(playerID, playerMap);

  return [
    {
      id: "chat-preview-0",
      actorId: currentId,
      message: PREVIEW_MESSAGES[0],
    },
    {
      id: "chat-preview-1",
      actorId: opponentId,
      message: PREVIEW_MESSAGES[1],
    },
  ];
}
