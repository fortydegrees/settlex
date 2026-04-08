const normalizePayloadMessage = (payload) => {
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

export class MatchChatStore {
  constructor() {
    this.messagesByMatch = new Map();
  }

  onChatMessage(matchID, rawMessage) {
    if (!matchID || rawMessage?.sender == null) {
      return null;
    }

    const messageText = normalizePayloadMessage(rawMessage.payload);
    if (!messageText) {
      return null;
    }

    const existing = this.messagesByMatch.get(matchID) ?? [];
    const nextMessage = {
      id: rawMessage.id ?? `${matchID}-chat-${existing.length + 1}`,
      seq: existing.length + 1,
      actorId: String(rawMessage.sender),
      messageText,
      createdAt: new Date().toISOString(),
    };

    this.messagesByMatch.set(matchID, [...existing, nextMessage]);
    return nextMessage;
  }

  getMessages(matchID) {
    return (this.messagesByMatch.get(matchID) ?? []).map((message) => ({
      ...message,
    }));
  }

  clear(matchID) {
    this.messagesByMatch.delete(matchID);
  }
}
