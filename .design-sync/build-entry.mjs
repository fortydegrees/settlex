// Prebuild for design-sync: compile the repo's own source into the `dist/`
// the converter expects.
//
// Why this exists: SettleHex writes JSX inside `.js` files, which Next's SWC
// pipeline accepts but plain esbuild does not — its `.js` loader has no JSX
// extension, so the converter's bundle pass fails with "The JSX syntax
// extension is not currently enabled" on every component. A published design
// system would hand the converter a compiled `dist/`; this script is that
// build step, and `buildCmd` in config.json replays it on every re-sync.
//
// Scope is deliberately narrow — transform the repo's own files and nothing
// else. `packages: "external"` leaves every bare import (react, @base-ui/react,
// @heroicons/react, @settlex/game-core, next/*) untouched so the converter
// resolves them itself. That matters: the converter's react shim rewrites
// react/react-dom/react-is/scheduler to the single `window.React` instance, and
// pre-bundling a second copy here would defeat it.

import { build } from "esbuild";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const outdir = resolve(here, "dist");

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

const result = await build({
  entryPoints: [resolve(here, "entry.js")],
  outdir,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  // Repo source only — every node_modules package stays external.
  packages: "external",
  // The point of the whole script: JSX in .js.
  loader: { ".js": "jsx", ".jsx": "jsx", ".svg": "dataurl", ".png": "dataurl" },
  // Automatic runtime, so component files that never `import React` still
  // compile. The converter maps react/jsx-runtime onto window.React.
  jsx: "automatic",
  // Supplies `process` as an unbound-identifier shim. Only `inject` covers
  // every `process.env.X` read; the converter's own `define` handles the single
  // expression `process.env.NODE_ENV` and nothing else.
  inject: [resolve(here, "shims/process-env.js")],
  metafile: true,
  logLevel: "info",
});

const outputs = Object.keys(result.metafile.outputs);
console.log(`design-sync prebuild → ${outputs.join(", ")}`);

// ── Stylesheet ─────────────────────────────────────────────────────────────
//
// Storybook 8 + @storybook/nextjs injects Tailwind through style-loader, so its
// build contains no .css file for the converter's storybook scrape to find —
// hence [CSS_PLACEHOLDER]/[CSS_RUNTIME] with an empty stylesheet, and previews
// that render completely unstyled. Running the repo's OWN Tailwind + PostCSS
// pipeline here produces the compiled stylesheet the converter needs, and
// cfg.cssEntry points at the result.
//
// Coverage note: Tailwind emits only the utilities its `content` globs actually
// find, so this stylesheet spans the classes SettleHex uses today. See
// conventions.md for what that means when composing new layouts.
const cssIn = resolve(repoRoot, "app/globals.css");
const cssOut = resolve(outdir, "styles.css");
const compiled = await postcss([
  tailwindcss(resolve(repoRoot, "tailwind.config.js")),
  autoprefixer(),
]).process(readFileSync(cssIn, "utf8"), { from: cssIn, to: cssOut });

writeFileSync(cssOut, compiled.css);
console.log(
  `design-sync prebuild → ${cssOut} (${(compiled.css.length / 1024).toFixed(1)} KB)`
);
