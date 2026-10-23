import { buildNotationReplayFile } from "./notationReplay.js";

// Shared by server validation and client reconstruction. Keep archived identity
// outside the portable file and apply the same mapping on both sides.
export const buildArchivedNotationFrames = (replay, record) => {
  // SettleHex's exporter maps its ordered 0-based seats to portable 1-based
  // seats. Validate that mapping rather than relying on database row order.
  const participants = replay.participants ?? [];
  const ids = new Set(participants.map(p => String(p.seatId)));
  if (record?.coverage !== "complete" || !Array.isArray(record.players)
    || participants.length !== record.players.length || ids.size !== participants.length
    || replay.match.playerCount !== record.players.length) throw new Error("Archive participant mismatch");
  const playerIdBySeat = Object.fromEntries(record.players.map((seat, index) => {
    const id = String(index);
    if (seat !== String(index + 1) || !ids.has(id)) throw new Error("Archive seat mismatch");
    return [seat, id];
  }));
  if (playerIdBySeat[record.result?.winner] !== String(replay.match.winnerSeatId)) {
    throw new Error("Archive result mismatch");
  }
  const playerMap = Object.fromEntries(participants.map(p => [
    String(p.seatId), { name: p.usernameSnapshot },
  ]));
  return buildNotationReplayFile(record, { playerIdBySeat, playerMap }).frames;
};

export const hydrateArchivedReplayPayload = (payload) => {
  if (payload?.replay?.source?.kind !== "notation") return payload;
  const { record, ...presentation } = payload;
  return { ...presentation, frames: buildArchivedNotationFrames(payload.replay, record) };
};
