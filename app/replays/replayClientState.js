export const buildReplayChatMessages = (chatMessages = []) =>
  chatMessages.map((message) => ({
    id: message.id,
    sender: message.actorId,
    payload: {
      message: message.message,
    },
  }));

export const clampReplayFrameIndex = (frameIndex, frameCount) =>
  Math.min(Math.max(frameIndex, 0), Math.max(frameCount - 1, 0));
