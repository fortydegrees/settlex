export const PLAYER_COLOR_OPTIONS = Object.freeze([
  Object.freeze({
    id: "red",
    swatch: "bg-red-500",
    gradient: "from-red-500 to-red-800",
    nameHex: "#dc2626"
  }),
  Object.freeze({
    id: "blue",
    swatch: "bg-blue-500",
    gradient: "from-blue-500 to-blue-800",
    nameHex: "#2563eb"
  }),
  Object.freeze({
    id: "green",
    swatch: "bg-green-500",
    gradient: "from-green-500 to-green-800",
    nameHex: "#16a34a"
  }),
  Object.freeze({
    id: "orange",
    swatch: "bg-orange-500",
    gradient: "from-orange-500 to-orange-800",
    nameHex: "#ea580c"
  }),
  Object.freeze({
    id: "purple",
    swatch: "bg-purple-500",
    gradient: "from-purple-500 to-purple-800",
    nameHex: "#a855f7"
  }),
  Object.freeze({
    id: "pink",
    swatch: "bg-pink-500",
    gradient: "from-pink-500 to-pink-800",
    nameHex: "#ec4899"
  }),
  Object.freeze({
    id: "cyan",
    swatch: "bg-cyan-500",
    gradient: "from-cyan-500 to-cyan-800",
    nameHex: "#06b6d4"
  }),
  Object.freeze({
    id: "amber",
    swatch: "bg-amber-500",
    gradient: "from-amber-500 to-amber-800",
    nameHex: "#f59e0b"
  })
]);

export function getPlayerColorOption(id) {
  return (
    PLAYER_COLOR_OPTIONS.find((option) => option.id === id) ??
    PLAYER_COLOR_OPTIONS[0]
  );
}

export function getPlayerNameHex(colorId) {
  return PLAYER_COLOR_OPTIONS.find((option) => option.id === colorId)?.nameHex ?? null;
}
