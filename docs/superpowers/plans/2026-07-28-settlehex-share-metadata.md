# SettleHex Share Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship branded, privacy-aware metadata and crawl routes for SettleHex sharing and basic SEO.

**Architecture:** Keep metadata values in a pure `app/metadata.js` helper consumed by the root layout and `/g/[matchID]` route. Generate the share image at `/opengraph-image` with Next `ImageResponse`, and add app-router `robots.txt`/`sitemap.xml` routes without adding dependencies or touching gameplay.

**Tech Stack:** Next.js 13.5 app router, React, Vitest, pnpm.

## Global Constraints

- Preserve the unrelated existing modification to `release/release-notes.json`.
- Use the production canonical origin `https://settlehex.com`.
- Keep `/g/[matchID]` previewable but `noindex, nofollow`.
- Do not include player names, credentials, scores, or private match state in metadata or share art.
- Do not add dependencies or change build tooling.

### Task 1: Metadata contract tests

**Files:**
- Create: `app/__tests__/metadata.test.js`
- Create: `app/metadata.js`

**Interfaces:**
- Produces `SITE_METADATA`, `createMatchMetadata(matchID)`, `createRobotsMetadata()`, and `createSitemapEntries()` for route consumers and tests.

- [ ] **Step 1: Write the failing tests**

Add tests asserting that root metadata has the SettleHex title, descriptive copy, canonical origin, Open Graph/Twitter image configuration, and that match metadata uses `/g/:matchID` with `noindex`/`nofollow`. Add tests asserting robots excludes `/api/` and dev/editor surfaces while allowing `/g/`, and sitemap contains only `https://settlehex.com/`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm exec vitest run app/__tests__/metadata.test.js --reporter=dot`

Expected: FAIL because `app/metadata.js` does not exist yet.

- [ ] **Step 3: Implement the pure metadata helper**

Create the shared constants and builders with no database or request dependencies. Use `encodeURIComponent` for the match ID when building its URL.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm exec vitest run app/__tests__/metadata.test.js --reporter=dot`

Expected: PASS.

- [ ] **Step 5: Commit**

Do not commit during this user-authorized inline pass; leave the focused diff available for review alongside the existing dirty worktree.

### Task 2: Wire app-router metadata and crawl routes

**Files:**
- Modify: `app/layout.js:1-11`
- Modify: `app/g/[matchID]/page.js:1-4`
- Create: `app/robots.js`
- Create: `app/sitemap.js`
- Modify: `app/manifest.js:1-17`

**Interfaces:**
- Consumes the helpers from `app/metadata.js`.
- Produces HTML head metadata for `/` and `/g/[matchID]`, `/robots.txt`, `/sitemap.xml`, and a branded manifest icon reference.

- [ ] **Step 1: Add root and match metadata exports**

Import `SITE_METADATA` into the root layout and export `generateMetadata` from the match route using `createMatchMetadata(params?.matchID)`.

- [ ] **Step 2: Add robots and sitemap route modules**

Export the helper-produced robots object and sitemap entries through Next's app-router file conventions.

- [ ] **Step 3: Update the manifest icon**

Use `/favicon.ico` rather than the match-alert bell as the install icon, while preserving the current manifest shape and route.

- [ ] **Step 4: Run focused tests and static checks**

Run: `pnpm exec vitest run app/__tests__/metadata.test.js --reporter=dot`

Expected: PASS.

Run: `pnpm exec eslint app/layout.js app/g/[matchID]/page.js app/metadata.js app/robots.js app/sitemap.js app/manifest.js app/__tests__/metadata.test.js`

Expected: PASS with no new warnings.

### Task 3: Add the generated share image and verify production output

**Files:**
- Create: `app/opengraph-image.jsx`

**Interfaces:**
- Produces a deterministic PNG response at `/opengraph-image` for Open Graph and Twitter card consumers.

- [ ] **Step 1: Write the image route**

Use `ImageResponse` from `next/server` with `alt`, `size`, and `contentType` exports. Render only supported inline styles and local text/shapes; do not fetch external fonts or assets.

- [ ] **Step 2: Run the focused tests and build**

Run: `pnpm exec vitest run app/__tests__/metadata.test.js --reporter=dot && pnpm exec eslint app/opengraph-image.jsx`

Expected: PASS.

Run: `pnpm build`

Expected: PASS with routes for `/opengraph-image`, `/robots.txt`, `/sitemap.xml`, and `/manifest.webmanifest` present in the build output.

- [ ] **Step 3: Inspect the generated routes**

Run: `git diff --check`

Expected: no whitespace errors.

Start the production server with `pnpm start` after the build and request `/`, `/g/example`, `/opengraph-image`, `/robots.txt`, `/sitemap.xml`, and `/manifest.webmanifest`. Confirm the home and match HTML contain the expected metadata, the match HTML contains `noindex`, the image is `image/png`, and the text routes return their expected content.
