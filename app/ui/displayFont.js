// Coverage of the approved v0.4 J Black WOFF2 (including lowercase w).
// This is not a general-purpose alphabet. Use for deliberate display moments,
// never as the default face for player names, controls or arbitrary headings.
const supported = new Set(' SetlHxoOcanhmirduysgPFBvRVY!w');

export function canUseDisplayFont(text) {
  return typeof text === 'string' && text.trim().length > 0 && [...text].every(character => supported.has(character));
}
