export const DEFAULT_PLAYER_COLOR_ID = "red";

export const LEGACY_PLAYER_COLOR_ALIASES = Object.freeze({
  blue: "sky",
  cyan: "teal",
  pink: "coral",
  amber: "gold",
  olive: "lime"
});

export const SEAT_FALLBACK_COLOR_IDS = Object.freeze([
  "red",
  "sky",
  "green",
  "orange",
  "teal",
  "magenta"
]);

const PLAYER_COLOR_OPTION_VALUES = [
  {
    id: "red",
    swatch: "bg-[#d52a2a]",
    gradient: "from-[#eb5d5d] to-[#8f1e1e]",
    nameHex: "#d52a2a"
  },
  {
    id: "sky",
    swatch: "bg-[#4b92db]",
    gradient: "from-[#7fb6ef] to-[#2f5fa6]",
    nameHex: "#4b92db"
  },
  {
    id: "green",
    swatch: "bg-[#1d911d]",
    gradient: "from-[#46b546] to-[#136713]",
    nameHex: "#1d911d"
  },
  {
    id: "teal",
    swatch: "bg-[#1d9191]",
    gradient: "from-[#4db2b2] to-[#176c6c]",
    nameHex: "#1d9191"
  },
  {
    id: "orange",
    swatch: "bg-[#d68c2f]",
    gradient: "from-[#efb35a] to-[#9d5f18]",
    nameHex: "#d68c2f"
  },
  {
    id: "magenta",
    swatch: "bg-[#db47d3]",
    gradient: "from-[#f07cea] to-[#91358b]",
    nameHex: "#db47d3"
  },
  {
    id: "purple",
    swatch: "bg-[#911d91]",
    gradient: "from-[#b04db0] to-[#561356]",
    nameHex: "#911d91"
  },
  {
    id: "maroon",
    swatch: "bg-[#911d1d]",
    gradient: "from-[#b04545] to-[#581414]",
    nameHex: "#911d1d"
  },
  {
    id: "brown",
    swatch: "bg-[#9a632f]",
    gradient: "from-[#c28c58] to-[#61381a]",
    nameHex: "#9a632f"
  },
  {
    id: "royal",
    swatch: "bg-[#2f46d6]",
    gradient: "from-[#5f74f0] to-[#18279a]",
    nameHex: "#2f46d6"
  },
  {
    id: "violet",
    swatch: "bg-[#5d529f]",
    gradient: "from-[#8377c8] to-[#40367f]",
    nameHex: "#5d529f"
  },
  {
    id: "lime",
    swatch: "bg-[#87a728]",
    gradient: "from-[#abc953] to-[#5f771d]",
    nameHex: "#87a728"
  },
  {
    id: "coral",
    swatch: "bg-[#df5d5f]",
    gradient: "from-[#f08e8f] to-[#9f3638]",
    nameHex: "#df5d5f"
  },
  {
    id: "lavender",
    swatch: "bg-[#ac7cc1]",
    gradient: "from-[#cfabd8] to-[#6e4c80]",
    nameHex: "#ac7cc1"
  },
  {
    id: "tan",
    swatch: "bg-[#b99e77]",
    gradient: "from-[#d1be9d] to-[#7a6448]",
    nameHex: "#b99e77"
  },
  {
    id: "black",
    swatch: "bg-[#1d1d25] border border-black/20",
    gradient: "from-[#4b4b59] to-[#111119]",
    nameHex: "#1d1d25"
  },
  {
    id: "white",
    swatch: "bg-[#edebe3] border border-slate-400",
    gradient: "from-[#f7f4ed] to-[#c6bfb3]",
    nameHex: "#edebe3"
  },
  {
    id: "silver",
    swatch: "bg-[#aaaeb6] border border-slate-500",
    gradient: "from-[#d5dae2] to-[#6b7280]",
    nameHex: "#aaaeb6"
  },
  {
    id: "gold",
    swatch: "bg-[#ba973b]",
    gradient: "from-[#efd27f] to-[#7a5a14]",
    nameHex: "#ba973b"
  }
];

export const PLAYER_COLOR_OPTIONS = Object.freeze(
  PLAYER_COLOR_OPTION_VALUES.map((option) => Object.freeze(option))
);

const PLAYER_COLOR_OPTIONS_BY_ID = new Map(
  PLAYER_COLOR_OPTIONS.map((option) => [option.id, option])
);

export function normalizePlayerColorId(colorId) {
  const normalizedColor =
    typeof colorId === "string" ? colorId.trim().toLowerCase() : "";
  const canonicalColor =
    LEGACY_PLAYER_COLOR_ALIASES[normalizedColor] ?? normalizedColor;
  return canonicalColor || DEFAULT_PLAYER_COLOR_ID;
}

export function getPlayerColorOption(id) {
  const normalizedColor = normalizePlayerColorId(id);
  return (
    PLAYER_COLOR_OPTIONS_BY_ID.get(normalizedColor) ??
    PLAYER_COLOR_OPTIONS_BY_ID.get(DEFAULT_PLAYER_COLOR_ID) ??
    PLAYER_COLOR_OPTIONS[0]
  );
}

export function getPlayerNameHex(colorId) {
  const normalizedColor = normalizePlayerColorId(colorId);
  return PLAYER_COLOR_OPTIONS_BY_ID.get(normalizedColor)?.nameHex ?? null;
}
