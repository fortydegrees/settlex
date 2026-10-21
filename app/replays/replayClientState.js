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
