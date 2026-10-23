import { clampReplayEventIndex } from "./replayTimeline";

export const buildReplayChatMessages = (chatMessages = []) =>
  chatMessages.map((message) => ({
    id: message.id,
    sender: message.actorId,
    payload: {
      message: message.message,
    },
  }));

export const clampReplayFrameIndex = (frameIndex, frameCount) =>
  clampReplayEventIndex(frameIndex, frameCount);

export const getReplayKeyboardAction = ({
  key,
  shiftKey = false,
  altKey = false,
  ctrlKey = false,
  metaKey = false,
} = {}) => {
  if (altKey || ctrlKey || metaKey) return null;
  if (key === "ArrowLeft") {
    return shiftKey ? "previousTurn" : "previousEvent";
  }
  if (key === "ArrowRight") {
    return shiftKey ? "nextTurn" : "nextEvent";
  }
  return null;
};

export const getReplayEventIndexForFrame = (frameIndex, events = []) => {
  if (!Number.isFinite(frameIndex) || frameIndex <= 0) return 0;
  // Native frames may add several visible log rows. Open after every
  // consequence of the requested frame, or the nearest earlier position.
  const index = events.findLastIndex((event) => event.frameIndex <= frameIndex);
  return Math.max(index, 0);
};
