// design-sync shim for `next/font/google`.
//
// The real `next/font/google/index.js` is an EMPTY file — Next's SWC plugin
// rewrites the import at compile time into generated @font-face CSS. esbuild
// performs no such rewrite, so importing it yields `undefined` and the
// module-scope call `const f = Fredoka({...})` throws, taking the whole IIFE
// bundle down with it.
//
// Each loader returns the same shape Next's does ({className, style, variable})
// naming the real family, so components keep their intended typography as long
// as the family is shipped via cfg.extraFonts / the styles.css closure.
const descriptor = (family) => () => ({
  className: `ds-font-${family.toLowerCase()}`,
  variable: `--ds-font-${family.toLowerCase()}`,
  style: { fontFamily: `'${family}', ui-rounded, system-ui, sans-serif` },
});

export const Fredoka = descriptor("Fredoka");
export const Outfit = descriptor("Outfit");
export const Nunito_Sans = descriptor("Nunito Sans");
export const Inter = descriptor("Inter");
