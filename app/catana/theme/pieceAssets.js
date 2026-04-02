export const PIECE_FOLDER = "pieces";
export const DEFAULT_PIECE_COLOR = "red";

export function normalizePieceColor(colorId) {
  const normalizedColor =
    typeof colorId === "string" ? colorId.trim().toLowerCase() : "";
  return normalizedColor || DEFAULT_PIECE_COLOR;
}

export function getPieceSvgFile(pieceType, colorId) {
  const normalizedPieceType = String(pieceType ?? "").trim().toLowerCase();
  const normalizedColor = normalizePieceColor(colorId);
  return `${PIECE_FOLDER}/${normalizedPieceType}_${normalizedColor}.svg`;
}

export function getPieceSvgPath(pieceType, colorId) {
  return `/svgs/${getPieceSvgFile(pieceType, colorId)}`;
}
