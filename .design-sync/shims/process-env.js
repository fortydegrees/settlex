// Minimal `process` for the browser bundle, supplied via esbuild's `inject`.
//
// Next inlines `process.env.NEXT_PUBLIC_*` at build time; esbuild does not, so
// the compiled source keeps live `process.env.X` reads and the bundle dies at
// load with "ReferenceError: process is not defined" — which takes the whole
// IIFE down, leaving every component missing from window.SettleHex.
//
// `env` is deliberately empty apart from NODE_ENV: the repo has no committed
// .env, so the reference Storybook build resolves these to undefined too, and
// the components fall back to release/release-notes.json. Matching that
// fallback is what keeps previews faithful to the oracle.
export const process = {
  env: {
    // `storybook build` runs production, so the reference render took the
    // production branch of any NODE_ENV check. Match it.
    NODE_ENV: "production",
  },
};
