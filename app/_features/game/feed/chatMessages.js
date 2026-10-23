const normalizeChatPayload = (payload) => {
  if (typeof payload === "string") {
    return payload.trim();
  }

  if (
    payload &&
    typeof payload === "object" &&
    typeof payload.message === "string"
  ) {
    return payload.message.trim();
  }

  return "";
};

export const buildChatEntries = (chatMessages = []) =>
  chatMessages
    .map((message) => {
      const normalizedMessage = normalizeChatPayload(message?.payload);
      if (!normalizedMessage || message?.sender == null) {
        return null;
      }

      return {
        id: message.id ?? `${message.sender}-${normalizedMessage}`,
        actorId: String(message.sender),
        message: normalizedMessage,
      };
    })
    .filter(Boolean);

export const submitChatDraft = ({
  draft = "",
  playerID,
  sendChatMessage,
}) => {
  const nextMessage = draft.trim();
  if (!nextMessage || playerID == null || typeof sendChatMessage !== "function") {
    return { sent: false, nextDraft: draft };
  }

  sendChatMessage(nextMessage);
  return { sent: true, nextDraft: "" };
};
