# SettleHex Share Metadata Design

## Goal

Make SettleHex links render as clear, branded previews in Discord and similar link unfurlers, while keeping private match routes out of search results and improving the site's basic crawl metadata.

## Scope

- Replace the generic root title/description with clearer SettleHex product metadata.
- Add Open Graph and Twitter card metadata using a generated 1200×630 PNG route.
- Add a generic, privacy-safe metadata profile for `/g/[matchID]` links.
- Add `robots.txt` and `sitemap.xml` app-router routes.
- Keep `/g/[matchID]` fetchable by preview bots but mark it `noindex, nofollow`.
- Use the existing favicon as the manifest icon and preserve the current PWA manifest route.

## Design

`app/metadata.js` will own the canonical site URL, share image path, root metadata, and a pure match-metadata builder. `app/layout.js` will import the root metadata. `app/g/[matchID]/page.js` will export `generateMetadata` from the pure builder without fetching private match state, avoiding player-name or result leakage into social caches and avoiding a duplicate match-data request.

`app/opengraph-image.jsx` will use Next's `ImageResponse` to render a deterministic branded PNG with a dark blue table background, a small hex-board motif, SettleHex wordmark, and a short gameplay descriptor. It will use no new dependency, external URL, user data, or runtime database call.

`app/robots.js` will allow the public homepage, public profiles, and `/g/` so link preview bots can fetch them, while excluding APIs and dev/editor surfaces. Private match routes will rely on page-level `noindex` rather than `robots.txt` disallow rules. `app/sitemap.js` will expose only the homepage because public profile enumeration would require a new database query and match links are not indexable content.

## Testing and verification

- Add behavior tests for root metadata, match metadata, robots rules, and sitemap URLs.
- Run the focused metadata test first to prove the new expectations fail, then implement.
- Run the focused test, lint, `git diff --check`, and a production build.
- Inspect generated response metadata and the local metadata routes after the build.

## Non-goals

- No meta-keywords tag.
- No public indexing of private match IDs.
- No dynamic player names, scores, or match state in social metadata.
- No homepage redesign or unrelated SEO content work.
