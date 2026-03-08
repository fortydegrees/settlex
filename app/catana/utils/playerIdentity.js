const BOT_NAME_PREFIX_RE = /^\s*\[bot\]\s*/i;

export function sanitizeDisplayName(name) {
  if (typeof name !== "string") return "";
  return name.replace(BOT_NAME_PREFIX_RE, "").trim();
}
