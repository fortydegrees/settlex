import { buildArchivedNotationFrames } from "../../replays/archivedReplayPayload.js";
import { buildReplayFrames as buildLegacyFrames } from "./buildReplayFrames.js";

// Select a presentation source once for every finished-archive entry point.
// Metadata excludes raw controller history; the notation path sends only the
// compact record, never duplicated per-frame board/log prefixes.
export const buildArchivedReplayPayload = (
  archive,
  { buildReplayFrames = buildLegacyFrames } = {}
) => {
  const replay = {
    match: archive.match,
    participants: archive.participants,
    chatMessages: archive.chatMessages ?? [],
    isComplete: true,
  };
  let fallbackReason = archive.notation?.status === "unavailable" ? "unavailable" : "not-recorded";
  if (archive.notation?.status === "ready") {
    fallbackReason = "invalid";
    try {
      const record = archive.notation.record;
      buildArchivedNotationFrames(replay, record);
      return { replay: { ...replay, source: { kind: "notation" } }, record };
    } catch {
      // Missing support, corrupt data, or geometry/identity mismatch must not
      // make a retained legacy replay inaccessible. Never reinterpret a profile.
    }
  }
  const frames = buildReplayFrames({
    initialState: archive.initialState,
    log: archive.log,
    finalState: archive.finalState,
  });
  if (!frames.length) throw new Error("Replay has no valid frames");
  return { replay: { ...replay, source: { kind: "legacy", fallbackReason } }, frames };
};
