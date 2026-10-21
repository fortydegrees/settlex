// Inject the brand @font-face rules into the reference Storybook's iframe.
//
// Storybook serves public/fonts via staticDirs but declares no @font-face, so
// its canvas renders in a system fallback while the real Next app renders in
// Outfit. The synced bundle ships Outfit (see fonts.css), and comparing a
// preview that HAS the font against a reference that does NOT would flag every
// text-bearing component as a mismatch for the wrong reason.
//
// Run after every `storybook build -o .design-sync/sb-reference`; a rebuild
// overwrites iframe.html and drops this. Idempotent — safe to re-run.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const iframe = resolve(here, "sb-reference/iframe.html");
const MARKER = "ds-sync-brand-fonts";

const weights = [
  ["Outfit-Medium.ttf", 500],
  ["Outfit-Bold.ttf", 700],
  ["Outfit-Black.ttf", 900],
];

const style = `<style id="${MARKER}">
${weights
  .map(
    ([file, weight]) => `@font-face{font-family:"Outfit";src:url("./fonts/${file}") format("truetype");font-weight:${weight};font-style:normal;font-display:block;}`
  )
  .join("\n")}
</style>`;

const html = readFileSync(iframe, "utf8");
if (html.includes(MARKER)) {
  console.log("sb-reference iframe.html already patched — nothing to do");
} else {
  writeFileSync(iframe, html.replace("</head>", `${style}\n</head>`));
  console.log("sb-reference iframe.html patched with brand @font-face rules");
}
