import {
  DEFAULT_PLAYER_COLOR_ID,
  normalizePlayerColorId
} from "./playerColors.js";

export const PIECE_FOLDER = "pieces";
export const DEFAULT_PIECE_COLOR = DEFAULT_PLAYER_COLOR_ID;

export function normalizePieceColor(colorId) {
  return normalizePlayerColorId(colorId) || DEFAULT_PIECE_COLOR;
}

export function getPieceSvgFile(pieceType, colorId) {
  const normalizedPieceType = String(pieceType ?? "").trim().toLowerCase();
  const normalizedColor = normalizePieceColor(colorId);
  return `${PIECE_FOLDER}/${normalizedPieceType}_${normalizedColor}.svg`;
}

export function getPieceSvgPath(pieceType, colorId) {
  return `/svgs/${getPieceSvgFile(pieceType, colorId)}`;
}
