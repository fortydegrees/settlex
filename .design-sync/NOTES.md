# design-sync notes — SettleHex

Repo-specific gotchas for future syncs. Read this before touching anything.

## The big one: this repo is a Next.js app, not a component package

The converter's model assumes a published design system with a compiled `dist/`.
SettleHex has neither, so three pieces bridge the gap. All are committed:

- **`entry.js`** — names every storied component under its *source file basename*.
  That basename match is load-bearing: `lib/story-imports.mjs` rule 2 shims a
  story's `import { Button } from "./Button"` to `window.SettleHex.Button` only
  when the bundle exports a name equal to the file's basename. Get it wrong and
  the preview silently compiles a second copy of the component from source.
- **`entry.d.ts`** — hand-maintained. Component *discovery* reads TypeScript
  declarations (`lib/dts.mjs` → `exportedNames`), and with no `.d.ts` the build
  discovers zero components and drops every story as `[TITLE_UNMAPPED]`.
  `package.json` `"types"` points here; that field exists solely for this.
  **No generator can replace it** — see the JSX note below.
- **`build-entry.mjs`** (`cfg.buildCmd`) — compiles `entry.js` and the repo's
  Tailwind into `.design-sync/dist/`, which is what `cfg.entry`/`cfg.cssEntry`
  point at.

## Gotchas, in the order they bite

- **JSX lives in `.js` files.** Next's SWC accepts this; esbuild and tsc do not
  (`The JSX syntax extension is not currently enabled`). `build-entry.mjs` sets
  `loader: {".js": "jsx"}`. This is also why `tsc --declaration` cannot generate
  `entry.d.ts` — it refuses JSX in `.js` just as esbuild does.
- **`npm` is blocked by a shell-level guard** ("Use pnpm instead!"). It exits 0,
  so an `npm i` in `.ds-sync/` silently installs nothing and the converter then
  dies on `Cannot find package 'ts-morph'`. Install converter deps with
  `pnpm i --ignore-workspace <deps>` from inside `.ds-sync/`.
- **`npx storybook` pulls Storybook v10** from the pnpm dlx cache and fails
  preset loading against this repo's v8.6.14. Use `pnpm exec storybook build`.
  Never pipe that build through `head`/`tail` — it masks the exit code and a
  failed build looks like a success.
- **`next/*` cannot be bundled outside Next.** `next/font/google/index.js` is an
  *empty* file that Next's SWC plugin rewrites at compile time; bundling it makes
  `Fredoka(...)` a call on `undefined` at module scope, which throws and takes
  the whole IIFE down — every component then reads as "not a component on
  window.SettleHex" with every preview root empty. `shims/` provides
  `next/navigation`, `next/link`, `next/image`, `next/font/google`, wired through
  `cfg.tsconfig` → `tsconfig.sync.json` `compilerOptions.paths`.
- **`process` is not defined in the browser bundle.** The converter defines only
  the exact expression `process.env.NODE_ENV`; `releaseInfo.js` reads
  `process.env.NEXT_PUBLIC_*`, which Next inlines and esbuild does not.
  `shims/process-env.js` is `inject`ed by the prebuild to cover every read.
  - The *preview* compiler (`lib/previews.mjs`) has the same gap and is **not**
    config-extensible. `releaseInfo.js` is reached directly by the
    HomeTitleChrome story, so it is forced onto the bundle via
    `cfg.storyImports.shim`, and `entry.js` exports `publicReleaseInfo` for it.
    Any *new* story-reachable module that reads `process.env` needs the same
    treatment — it is the only such module today.
- **Storybook 8 + `@storybook/nextjs` emits no `.css` file.** Tailwind is injected
  at runtime by style-loader, so the converter's storybook CSS scrape finds
  nothing (`[CSS_PLACEHOLDER]` + `[CSS_RUNTIME]`, everything renders unstyled).
  `build-entry.mjs` runs the repo's own PostCSS/Tailwind pipeline instead.

## Typography — the part the compare loop cannot check

The reference Storybook serves `public/fonts/Outfit-*.ttf` via `staticDirs` but
declares **no `@font-face`**, so its canvas falls back to a system font. The real
app does load Outfit (and Fredoka) through `next/font` in `app/layout.js`. Left
alone, both sides fall back identically, every sheet looks fine, and designs ship
in the wrong typeface — the exact failure `[FONT_MISSING]` exists to catch, and
it does not fire here because the family is set by an inline decorator style
rather than by any shipped CSS.

- `fonts.css` (via `cfg.extraFonts`) ships the repo's Outfit files and sets the
  body stack, matching `.storybook/preview.js` exactly.
- **`patch-sb-reference.mjs` must be re-run after every `storybook build`** — it
  injects the same `@font-face` into `sb-reference/iframe.html` so the oracle
  verifies against the real font. A reference rebuild silently drops it.
- **Fredoka (brand wordmark, HomeTitleChrome) is NOT shipped.** It is not in the
  repo; `next/font` fetches it from Google at build time, and the reference
  Storybook does not load it either. The wordmark therefore renders in the Outfit
  fallback stack on both sides. Sourcing it is a licensing/provenance call for
  the repo owner.

## Preview wrapper — why `cfg.provider` is set

`.storybook/preview.js` sets `layout: "fullscreen"` as a **global** parameter, and
its decorator keys padding off `context.parameters.layout`. The preview harness
does not inherit that global, so the decorator computed `isFullscreen === false`
and added a 2rem pad Storybook never applies. That inset every component and,
worse, pushed bottom-anchored `fixed` content (the HomeTitleChrome game-mode
dock) out of the capture entirely.

`cfg.provider` → `SettleHexRoot` replaces the decorator with an explicit wrapper
carrying the same background, font stack and `settlex-ui-root` class at padding
0. It also fixes a second thing: wrap guidance in the generated README and
`prompt.md` is produced from config only, so decorator-only wrapping would have
shipped a generic "wrap this yourself" note to the design agent.

## [GENERAL] `play()` never runs in previews — expect `close` on interaction stories

`lib/preview-gen-storybook.mjs` composes args, `argTypes.mapping`, render
precedence and decorators, but **never invokes `play`** — `@storybook/*` is
stubbed inert by design. Any story whose visible state is produced by its `play`
function therefore renders in its pre-interaction state, while the reference
storybook shows the post-interaction state.

This is the dominant source of `close` grades here and it is **not fixable**:
these states are component-internal (form validation, submitting, matchmaking
"Finding…", focus rings), not args an owned preview could set. Confirmed on
Dialog (focus ring), HomeTitleChrome (Signed Out Idle), AccountPageView (Missing
Credentials, Email Submitting). Grade such stories `close` with a note naming
`play()` as the cause; do not try to work around it in an owned `.tsx`, and do
not skip the story — the component render itself is faithful.

### Triaging `play()` deltas — read it narrowly

Only `play()` bodies that **type, select, click or focus** a control produce a
pre/post gap. Assertion-only bodies (`waitFor`/`expect` with no interaction)
leave no trace and those stories grade a clean `match` — confirmed across
SearchingModal, PendingFriendChallengeScreen and MatchAlertDialog. When a story
with a `play()` looks identical, it is identical; don't hunt for a delta.

In practice almost every `close` in this repo is a **focus ring** on whichever
element the story's `play()` last touched.

### Not every focus ring is a `play()` delta

`SystemAccountMenu`'s first menu item renders a focus ring in **both** panels —
that is the component's own initial focus, not an artefact. The `play()` ring is
distinguishable because it appears on the storybook side *only*, and it moves the
ring *off* the default element.

A `play()` interaction can also cascade past the ring into derived styling:
`IdentityModal` "Empty Name" clears the name input, so storybook shows an empty
field **and** a disabled CTA while the preview shows the seeded name and an
enabled one.

### Blind spot: `play()` state that renders below the fold

`AccountEntryModal`'s validation message renders as the *last* child of the modal
body, under the provider buttons. The modal is taller than the 900×700 capture,
so that region is clipped on **both** panels — two identical screenshots, a clean
`match`, and the two sides nonetheless semantically in different states. This is
not a preview defect, but **do not read such a `match` as evidence that `play()`
state was reproduced.** Any component whose feedback surface is bottom-anchored
inside an overflowing modal has the same blind spot; raise the capture viewport
(`cfg.overrides.<Name>.viewport`) if it ever needs verifying.

## [GENERAL] Nondeterministic story content — `buildSuggestedGuestIdentity()`

`IdentityModal` "Suggested Identity" passes no args, so the component calls
`buildSuggestedGuestIdentity()` (`app/catana/lobby/playerIdentityStorage.js`),
which is `Math.random`-driven for name, emoji *and* colour. **Both** panels
re-roll on every capture, so an owned `.tsx` cannot fix it — pinning the preview
cannot pin the reference. The story is `cfg.overrides.IdentityModal.skip`ped so
future syncs don't see phantom changes on every recapture.

`AccountEntryModal.js` calls the same builder. Its stories are safe today only
because each captured one passes an explicit `initialName`/identity — **any
future no-args story there will be nondeterministic the same way.**

## [GENERAL] Relative URLs rendered as text

`PendingFriendChallengeScreen` "Inviter" prints an invite link resolved against
`window.location.origin`, so the two panels differ only in the ephemeral capture
server's PORT. Not a delta — grade `match`. Any future story rendering an
absolute URL built from a relative one behaves the same way.

## Story caps

Three cards exceed the default 6-story capture cap: Account Menu (11), Recovery
Surfaces (9), Game Over (7). Their tails were captured and graded with
`--max-stories 11`; keep using that flag, because the Recovery Surfaces tail is
`InterruptedDuelRecovery` — a genuinely distinct sibling component whose variants
would otherwise never be verified.

## Story-title mapping

Titles are three-level (`Composed Surfaces/Account & Identity/Account Page`) and
the last segment is a display name, not an export — hence the large `titleMap`.
`titleParts` scans segments right-to-left for the first that is a bundle export,
and the *preceding* segment becomes the card group.

- Six stories are multi-component "kitchen sink" files. Each is mapped to its
  dominant component (`Recovery Surfaces` → `StatusBanner`, `Components/Overlays`
  → `Dialog`, `Feedback and containers` → `Banner`, `Fields and selectors` →
  `Input`, `Replay Controls` → `ReplayStepControls`), so the card keeps all its
  cells while the name stays a real export. Every sibling component is still
  independently importable from the bundle.
- `Foundations/Visual language` is excluded (`titleMap` → `null`): it renders no
  component, and `[BUNDLE_EXPORT]` is a hard failure for any component name that
  is not a function on the global. Its content is captured in `conventions.md`
  instead, which is the better home for it.

## Observation for the repo owner (not a sync problem)

Several utility classes in the components are silently dead because their opacity
modifiers are not on Tailwind's default scale — `border-lime-200/65` (Button
primary), `bg-white/14` and `border-white/45` (Button subtle/secondary) emit no
CSS, while `/70` and `/75` do. Tailwind 3 needs arbitrary syntax (`/[0.65]`) for
off-scale values. This affects the live product identically, so previews are
faithful; it is a pre-existing repo issue, not a fidelity gap.

## Re-sync risks

- `entry.d.ts` is hand-written and **cannot be regenerated**. Add or change a
  component's props and it drifts silently — nothing checks it against source.
  Re-read the component signatures when a `[DTS]` or prop-shape question arises.
- `entry.js` must gain an export for every newly storied component, or that
  component is dropped at discovery with no error beyond `[TITLE_UNMAPPED]`.
- The Tailwind stylesheet contains only the utilities the repo's own `content`
  globs find. Designs composed from classes SettleHex does not currently use will
  be unstyled. See `conventions.md` for the vocabulary this implies.
- `patch-sb-reference.mjs` is not wired into any build — a reference rebuild
  without it regresses every text-bearing comparison.
- The `next/*` shims approximate Next's runtime. They are sufficient for
  rendering; a component that starts depending on real routing behaviour
  (`useRouter().push` side effects, `usePathname()` values) will look fine in a
  preview while behaving differently in the app.
- Node 23.3.0, pnpm 9.13.2, Storybook 8.6.14, Tailwind 3.3.3 at time of sync.
