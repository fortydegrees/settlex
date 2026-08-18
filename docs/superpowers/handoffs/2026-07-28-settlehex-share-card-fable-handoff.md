# SettleHex share-card / SEO handoff for Fable

Date: 2026-07-28  
Repository: `/Users/david/coding/settlex`  
Product: SettleHex, an online hex strategy game  
Current state: implementation exists in the working tree, but it has not been deployed to production.

## Paste this brief to Fable

You are reviewing and, if useful, refining the SettleHex social-share and basic SEO implementation in the repository at `/Users/david/coding/settlex`.

Please inspect the real repository and render the current `/opengraph-image` route before proposing changes. Challenge this, not validate it politely: tell me what is genuinely strong, what looks generic or visually weak at Discord preview size, and what you would change. Keep the scope to share metadata, crawl metadata, and the generated social card. Do not redesign the homepage or gameplay UI.

The key product requirement is that a shared SettleHex link should look unmistakably like SettleHex: use the actual shipped board/tile/piece SVGs, the existing Outfit font, and the Catana blue table/glass visual language. Do not replace the real artwork with generic CSS hexagons, stock imagery, a different font, or a dark generic SaaS card.

Preserve these safety rules:

- `/g/:matchID` must remain fetchable by Discord and other preview bots.
- `/g/:matchID` must remain `noindex, nofollow`.
- Do not put player names, scores, credentials, live match state, or private match data into metadata or share artwork.
- Do not add a database call or match-state fetch to the image route.
- Do not add dependencies or change build tooling without explicitly calling that out.
- Do not deploy, commit, reset, or discard existing worktree changes.

If you make a refinement, keep the diff focused, run the verification commands below, and report the exact files changed plus a visual render result. If the current version is already the right trade-off, say so and explain why rather than inventing changes.

## What has already been implemented

### Root metadata

`app/metadata.js` owns the metadata contract:

- Canonical production origin: `https://settlehex.com`
- Root title: `SettleHex — Play a Hex Strategy Game Online`
- Root description: `Play SettleHex, a fast online hex strategy game. Find a match, play a friend, or challenge a bot.`
- Canonical root URL: `/`
- Open Graph type: `website`
- Open Graph/Twitter image: `/opengraph-image`
- Image dimensions: `1200x630`
- Twitter card: `summary_large_image`

`app/layout.js` exports `SITE_METADATA` for the root application.

### Shared-match metadata

`app/g/[matchID]/page.js` exports `generateMetadata()` using `createMatchMetadata()` from `app/metadata.js`.

The shared-match profile is intentionally generic:

- Title: `Join a SettleHex game`
- Description: `Open this link to join a live SettleHex game or watch the replay.`
- Canonical URL: encoded `/g/:matchID`
- Open Graph/Twitter image: `/opengraph-image`
- Robots: `index: false`, `follow: false`

Do not make this metadata dynamic from the match record. The link preview needs a useful description, not private game-state leakage.

### Crawl and install routes

- `app/robots.js` produces `/robots.txt`.
  - Allows `/`, `/g/`, and `/u/`.
  - Disallows `/api/`, `/account`, `/board-editor`, and `/catana/dev/`.
  - Points to `https://settlehex.com/sitemap.xml`.
- `app/sitemap.js` produces `/sitemap.xml` with only `https://settlehex.com/` for the initial public sitemap.
- `app/manifest.js` now uses `/favicon.ico` as its icon instead of the match-alert bell asset.

Do not disallow `/g/` in robots. Preview crawlers still need to fetch those pages even though search indexing is disabled at page level.

## Current share-card implementation

The generated image is `app/opengraph-image.jsx`.

It uses Next `ImageResponse` with:

- `runtime = "nodejs"`
- `alt = "SettleHex — play a hex strategy game online"`
- `size = { width: 1200, height: 630 }`
- `contentType = "image/png"`

The card currently has two visual layers:

1. A light glass panel on the left containing:
   - `ONLINE HEX STRATEGY`
   - `SettleHex`
   - `Build. Trade. Conquer.`
   - `Play with friends or challenge a bot.`
   - `SETTLEHEX.COM`
2. A real mini-board on the right, with the shipped tiles and pieces arranged over the Catana table treatment.

The current visual direction is intentionally light and game-first:

```text
radial-gradient(circle at 23% 12%, rgba(255,255,255,0.38), transparent 23rem),
linear-gradient(135deg, #86d0fb 0%, #55b6ef 36%, #2f75cc 100%)
```

The panel uses a translucent white/sky glass treatment, slate-blue text, rounded corners, soft shadows, and no pure black or heavy texture.

## Real assets that must remain the source of truth

`app/opengraph-assets.js` resolves the same local assets used by Catana rather than duplicating visual definitions.

### Tiles

Emoji-theme resource tiles:

- `public/svgs/palette-themes/emoji/tile_lumber.svg`
- `public/svgs/palette-themes/emoji/tile_wool.svg`
- `public/svgs/palette-themes/emoji/tile_grain.svg`
- `public/svgs/palette-themes/emoji/tile_brick.svg`
- `public/svgs/palette-themes/emoji/tile_ore.svg`
- `public/svgs/palette-themes/emoji/tile_desert.svg`

The board underlay is:

- `public/svgs/board_underlay_standard.svg`

### Player pieces

The current preview uses:

- `public/svgs/pieces/settlement_coral.svg`
- `public/svgs/pieces/city_sky.svg`
- `public/svgs/pieces/road_gold.svg`

The canonical path helper is `app/catana/theme/pieceAssets.js`. Use it if changing piece selection rather than rebuilding paths by hand.

### Typography

The product font is Outfit. The normal application uses `next/font/google` in `app/layout.js`, but the standalone `ImageResponse` route does not inherit that page font class. The image route therefore loads renderer-safe static faces from:

- `public/fonts/Outfit-Medium.ttf`
- `public/fonts/Outfit-Bold.ttf`
- `public/fonts/Outfit-Black.ttf`

The variable Outfit TTF was not used directly because the installed OG renderer could not parse it reliably. Keep the static-font approach unless a verified renderer-compatible alternative is found.

## Important implementation constraints

### Satori / ImageResponse

The image route is rendered by Satori through Next `ImageResponse`, not by a normal browser. Keep styles conservative:

- Use fixed numeric dimensions for the 1200x630 canvas and positioned artwork.
- Avoid intrinsic values such as `fit-content`; an earlier version returned HTTP 200 with an empty body because of this.
- Prefer local data-URI embedding for SVGs and fonts. Do not depend on an external network fetch at image-render time.
- After any visual change, render the actual PNG and inspect it. A route that imports successfully is not enough.

### Server/runtime

`app/opengraph-assets.js` reads the checked-in public SVG/font assets using Node `fs` and converts them to data URIs/array buffers. That is why the image route uses `runtime = "nodejs"` rather than `edge`.

Do not move this back to Edge unless the asset-loading and font-rendering path is tested in a production build.

### Privacy and indexing

The image is deliberately generic and identical for the homepage and match links. Do not add match-specific artwork, player names, scores, or replay state without revisiting the privacy and cache implications.

## Suggested review questions for Fable

Please answer these directly after inspecting the current render:

1. Does the card still read clearly when reduced to a small Discord/Slack preview?
2. Does the right-side board look like SettleHex’s actual game, or does it feel like decorative noise?
3. Is the left panel’s hierarchy strong enough without becoming a generic landing-page hero?
4. Are the current copy, cropping, and tile density the right balance for a friend share?
5. Are there any metadata, canonical, robots, or privacy problems in the existing implementation?
6. Is the Node-runtime/data-URI approach acceptable for this Next deployment, or is there a safer verified alternative?
7. What is the smallest worthwhile refinement, if any?

## Curated files to inspect

Start with these files, in this order:

1. `app/opengraph-image.jsx`
2. `app/opengraph-assets.js`
3. `app/metadata.js`
4. `app/__tests__/metadata.test.js`
5. `app/layout.js`
6. `app/g/[matchID]/page.js`
7. `app/robots.js`
8. `app/sitemap.js`
9. `app/manifest.js`
10. `app/catana/theme/backgrounds.js`
11. `app/catana/theme/themes.js`
12. `app/catana/theme/pieceAssets.js`
13. `app/catana/types.js`
14. `docs/agent/UI_CONTEXT.md`
15. `docs/agent/skills/catana-brand/SKILL.md`
16. `docs/agent/NOTES.md` — search for `Share metadata boundary` and the current homepage/logo decisions.

## Verification commands

Run from `/Users/david/coding/settlex`.

Focused behavior/image contract:

```bash
pnpm exec vitest run app/__tests__/metadata.test.js --reporter=dot
```

Focused lint:

```bash
pnpm exec eslint \
  app/opengraph-assets.js \
  app/opengraph-image.jsx \
  app/__tests__/metadata.test.js
```

Production build:

```bash
BETTER_AUTH_SECRET=settlex-local-build-secret \
DATABASE_URL=postgres://settlehex:settlehex@localhost:55432/settlehex \
pnpm build
```

The build should include these routes:

- `/opengraph-image`
- `/robots.txt`
- `/sitemap.xml`
- `/manifest.webmanifest`

To inspect the actual production image after building:

```bash
BETTER_AUTH_SECRET=settlex-local-build-secret \
DATABASE_URL=postgres://settlehex:settlehex@localhost:55432/settlehex \
PORT=3100 pnpm start

curl -fsS http://localhost:3100/opengraph-image \
  -o /tmp/settlehex-opengraph.png
file /tmp/settlehex-opengraph.png
```

Expected image result: PNG, `1200 x 630`, non-empty response. Visually inspect the PNG rather than relying only on the HTTP status.

## Current verification evidence

The current implementation has been verified with:

- Focused metadata/image suite: 6 tests passed.
- Focused ESLint: passed.
- Production `pnpm build`: passed with the metadata/image/crawl routes listed above.
- Local production fetch: returned a non-empty `1200 x 630` PNG.
- Visual inspection: real resource hexes, real player pieces, Outfit typography, and Catana blue/glass treatment all rendered.

## Definition of done for a Fable refinement

A refinement is worthwhile only if it improves the actual share-preview experience while keeping the existing contract:

- Real SettleHex/Catana artwork remains visible and correctly sourced.
- The card is legible and recognisable at small preview size.
- The metadata remains correct and privacy-safe.
- `/g/:matchID` remains previewable but not indexable.
- No new dependency or production deployment is introduced.
- The focused tests, lint, and production build pass.
- The final response names the changed files, shows the rendered image or its path, and calls out any remaining uncertainty.
