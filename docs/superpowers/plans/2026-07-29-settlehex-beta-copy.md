# SettleHex Beta Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SettleHex's placeholder positioning copy with one clear beta promise across the homepage, root metadata, and generated social card.

**Architecture:** Keep the canonical beta descriptor and supporting proof in the existing pure `app/metadata.js` module, which already owns shared metadata/share-card copy. Consume the descriptor from the homepage and social-card renderer, while keeping functional lobby copy unchanged and using browser/render verification for presentation-only text.

**Tech Stack:** Next.js 13.5 app router, React, `ImageResponse`, Vitest, ESLint, pnpm.

## Global Constraints

- Primary descriptor: `Free online Catan for quick 1v1 games.`
- Supporting proof: `Balanced boards. Play a friend, find a match, or challenge Puffer.`
- Keep `Find match`, friend-play, and Puffer controls direct; do not rewrite functional game UI for personality alone.
- Remove `Free, open-source hex strategy` and `Build. Trade. Conquer.` from public app surfaces.
- Do not introduce `#1`, `best`, `fastest`, `fairest`, official-affiliation, endorsement, or licensing claims.
- Keep open-source and beta language secondary; do not add a new marketing panel.
- Preserve the existing match-metadata privacy contract, `/g/:matchID` `noindex, nofollow`, robots rules, sitemap, image dimensions, and local artwork/font pipeline.
- Do not add dependencies, change build tooling, alter game rules, or change matchmaking behavior.
- Do not add an exact-copy test for the presentation-only homepage line. Exact root metadata remains a valid runtime contract in `app/__tests__/metadata.test.js`.
- The four-player wording change is out of scope until four-player play is live.

## Execution prerequisite

This plan is a delta on top of the currently uncommitted share-metadata slice,
which owns `app/metadata.js`, `app/__tests__/metadata.test.js`, and
`app/opengraph-image.jsx`. Before executing Task 1:

1. Run `git status --short`.
2. If those files are still untracked or their share-metadata implementation is
   still awaiting review, do not discard, reset, or partially commit them.
3. Resolve that slice first or obtain explicit authorization to include it in
   the same integration commit. A fresh worktree from the current `HEAD` will
   not contain those untracked files.

Once the share-metadata baseline is committed or explicitly included, use the
normal commit steps below.

---

### Task 1: Integrate the approved beta promise

**Files:**
- Modify: `app/metadata.js:4-28`
- Modify: `app/__tests__/metadata.test.js:38-71`
- Modify: `app/catana/home/HomeTableClient.js:1-25,508-523`
- Modify: `app/opengraph-image.jsx:4-10,372-384`

**Interfaces:**
- Produces: `BETA_PRIMARY_DESCRIPTOR: string`
- Produces: `BETA_SUPPORTING_PROOF: string`
- Produces: `ROOT_TITLE: string`
- Produces: `ROOT_DESCRIPTION: string`
- Consumed by: `SITE_METADATA`, `HomeTableBrand`, and the generated Open Graph image.

- [ ] **Step 1: Update the metadata contract test**

Replace the old tagline and category-copy assertions in the first metadata test
with the approved copy contract:

```js
it("describes the beta promise and configures a large social share card", async () => {
  const metadata = await loadMetadata();
  const expectedTitle =
    "SettleHex — Free Online Catan for Quick 1v1 Games";
  const expectedDescription =
    "Free online Catan for quick 1v1 games. Balanced boards. Play a friend, find a match, or challenge Puffer.";

  expect(metadata.loadError).toBeUndefined();
  expect(metadata.BRAND_NAME).toBe("SettleHex");
  expect(metadata.BETA_PRIMARY_DESCRIPTOR).toBe(
    "Free online Catan for quick 1v1 games."
  );
  expect(metadata.BETA_SUPPORTING_PROOF).toBe(
    "Balanced boards. Play a friend, find a match, or challenge Puffer."
  );
  expect(metadata.BRAND_DOMAIN_LABEL).toBe("SETTLEHEX.COM");
  expect(metadata.SHARE_IMAGE_ALT).toBe(
    "SettleHex — Free online Catan for quick 1v1 games."
  );
  expect(metadata.SITE_METADATA).toMatchObject({
    metadataBase: new URL("https://settlehex.com"),
    title: {
      default: expectedTitle,
      template: "%s · SettleHex",
    },
    description: expectedDescription,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: "SettleHex",
      title: expectedTitle,
      description: expectedDescription,
      url: "/",
      images: [
        expect.objectContaining({
          url: "/opengraph-image",
          width: 1200,
          height: 630,
        }),
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: expectedTitle,
      description: expectedDescription,
      images: [expect.objectContaining({ url: "/opengraph-image" })],
    },
  });
});
```

Do not change the shared-match privacy, robots, sitemap, image-response, or
native-asset tests.

- [ ] **Step 2: Run the focused test to verify the new contract fails**

Run:

```bash
pnpm exec vitest run app/__tests__/metadata.test.js --reporter=dot
```

Expected: FAIL because `BETA_PRIMARY_DESCRIPTOR` and
`BETA_SUPPORTING_PROOF` are not exported and the current metadata still says
`hex strategy game`.

- [ ] **Step 3: Define the canonical beta copy**

Replace the shared branding-copy block and root title/description in
`app/metadata.js` with:

```js
export const BRAND_NAME = "SettleHex";
export const BETA_PRIMARY_DESCRIPTOR =
  "Free online Catan for quick 1v1 games.";
export const BETA_SUPPORTING_PROOF =
  "Balanced boards. Play a friend, find a match, or challenge Puffer.";
export const BRAND_DOMAIN_LABEL = "SETTLEHEX.COM";
export const SHARE_IMAGE_ALT = `${BRAND_NAME} — ${BETA_PRIMARY_DESCRIPTOR}`;

export const ROOT_TITLE =
  `${BRAND_NAME} — Free Online Catan for Quick 1v1 Games`;
export const ROOT_DESCRIPTION =
  `${BETA_PRIMARY_DESCRIPTOR} ${BETA_SUPPORTING_PROOF}`;
```

Keep `SITE_URL`, `SHARE_IMAGE_PATH`, the image dimension objects,
`SITE_METADATA`, `createMatchMetadata`, `createRobotsMetadata`, and
`createSitemapEntries` behavior unchanged.

- [ ] **Step 4: Consume the descriptor on the homepage**

Add this import near the other local imports in
`app/catana/home/HomeTableClient.js`:

```js
import { BETA_PRIMARY_DESCRIPTOR } from "../../metadata.js";
```

Replace the placeholder subtitle with:

```jsx
<p className="hidden text-[0.72rem] font-medium leading-none text-[#24506e]/80 sm:block">
  {BETA_PRIMARY_DESCRIPTOR}
</p>
```

Do not add a second marketing paragraph. The existing mode controls already
show the ways to play.

- [ ] **Step 5: Consume the same descriptor on the social card**

Replace the `BRAND_TAGLINE` import in `app/opengraph-image.jsx` with
`BETA_PRIMARY_DESCRIPTOR`:

```js
import {
  BETA_PRIMARY_DESCRIPTOR,
  BRAND_DOMAIN_LABEL,
  BRAND_NAME,
  SHARE_IMAGE_ALT,
} from "./metadata.js";
```

Replace the tagline text block with a fixed-width wrapping descriptor:

```jsx
<div
  style={{
    display: "flex",
    marginTop: 20,
    width: 416,
    color: "#1e5aa8",
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: -0.4,
    lineHeight: 1.08,
  }}
>
  {BETA_PRIMARY_DESCRIPTOR}
</div>
```

Keep the 1200×630 canvas, real board artwork, domain label, fonts, and all
privacy-safe/static rendering behavior unchanged. Do not add the supporting
proof to the card unless the visual verification in Task 2 proves there is
comfortable space; omission is the default.

- [ ] **Step 6: Run the focused automated checks**

Run:

```bash
pnpm exec vitest run app/__tests__/metadata.test.js --reporter=dot
```

Expected: PASS with all metadata/image tests passing.

Run:

```bash
pnpm exec eslint app/metadata.js app/__tests__/metadata.test.js app/catana/home/HomeTableClient.js app/opengraph-image.jsx
```

Expected: PASS with no new warnings.

- [ ] **Step 7: Confirm the placeholder public copy is gone**

Run:

```bash
rg -n 'Free, open-source hex strategy|Build\. Trade\. Conquer\.|fast online hex strategy|hex strategy game' app
```

Expected: no matches. Historical design/plan documents are not part of this
public-source check.

- [ ] **Step 8: Commit the copy integration**

Only perform this step after satisfying the execution prerequisite and
confirming that staging these files will not absorb an unreviewed pre-existing
share-metadata slice.

```bash
git add app/metadata.js app/__tests__/metadata.test.js app/catana/home/HomeTableClient.js app/opengraph-image.jsx
git diff --cached --check
git commit -m "copy: clarify SettleHex beta promise"
```

Expected: one focused commit containing the canonical descriptor, metadata
contract, homepage consumption, and social-card consumption.

---

### Task 2: Render, inspect, and record the copy pass

**Files:**
- Modify: `docs/agent/NOTES.md`
- Modify: `docs/agent/PROGRESS.md`

**Interfaces:**
- Consumes: the Task 1 root metadata and generated `ImageResponse` route.
- Produces: visual evidence at canonical desktop/mobile sizes and a durable
  repository record of the approved copy hierarchy.

- [ ] **Step 1: Build the production app**

Run:

```bash
pnpm build
```

Expected: PASS with `/`, `/g/[matchID]`, and `/opengraph-image` present in the
route output.

- [ ] **Step 2: Inspect the homepage at canonical viewports**

Start the built application on an unused local port:

```bash
pnpm start -- -p 3100
```

Open `http://127.0.0.1:3100/` and inspect:

- desktop at 1440×900: the full descriptor is readable beneath the wordmark,
  remains visually secondary to SettleHex, and does not collide with status
  chrome;
- mobile at 390×844: the existing mobile-hidden subtitle behavior remains
  intact and the wordmark, board, account control, and mode dock do not move or
  collide;
- the homepage still reads as a title/table surface, not a marketing page.

Expected: no layout change beyond the longer desktop subtitle.

- [ ] **Step 3: Render and inspect the actual social card**

With the production server still running:

```bash
curl -fsS http://127.0.0.1:3100/opengraph-image \
  -o /tmp/settlehex-beta-copy-og.png
file /tmp/settlehex-beta-copy-og.png
sips -g pixelWidth -g pixelHeight /tmp/settlehex-beta-copy-og.png
```

Expected:

- `file` reports a PNG image;
- `sips` reports `pixelWidth: 1200` and `pixelHeight: 630`;
- visual inspection shows the full descriptor on no more than two lines;
- the descriptor is not clipped and does not crowd the wordmark or domain;
- the actual Catana board remains the dominant product evidence.

If the line is clipped, reduce only the descriptor `fontSize` in
`app/opengraph-image.jsx` from `34` to `32`, then rebuild and repeat this step.
Do not shorten the approved copy or restructure the card without user review.

- [ ] **Step 4: Inspect the emitted root metadata**

Run:

```bash
curl -fsS http://127.0.0.1:3100/ \
  | rg -o 'SettleHex — Free Online Catan for Quick 1v1 Games|Free online Catan for quick 1v1 games\.|Balanced boards\. Play a friend, find a match, or challenge Puffer\.'
```

Expected: all three approved strings appear in the rendered HTML metadata.

- [ ] **Step 5: Record the durable copy rule**

Append this note to `docs/agent/NOTES.md`:

```markdown

- Beta product-copy direction:
  - Lead with the current player benefit: `Free online Catan for quick 1v1 games.`
  - Supporting proof is `Balanced boards. Play a friend, find a match, or challenge Puffer.`
  - Keep open-source and beta status as secondary trust/context, not the homepage pitch.
  - Homepage, root metadata, and social-card copy should consume the shared values from `app/metadata.js`; do not reintroduce generic trailer slogans or unsupported rankings.
  - When four-player play is live, broaden the primary descriptor to `Free online Catan for quick games with friends.` and keep balanced-board language attached to 1v1.
```

Append this status entry to `docs/agent/PROGRESS.md`:

```markdown

## Status (2026-07-29, beta product copy)

- Replaced the placeholder homepage/share positioning with `Free online Catan for quick 1v1 games.`
- Updated root search/social metadata with the balanced-board proof and the friend, matchmaking, and Puffer play paths.
- Kept open-source/beta language secondary and left functional lobby copy unchanged.
- Verified the focused metadata/image tests, targeted ESLint, production build, canonical desktop/mobile homepage views, and an actual 1200×630 social-card render.
```

- [ ] **Step 6: Run final checks**

Run:

```bash
pnpm exec vitest run app/__tests__/metadata.test.js --reporter=dot
pnpm exec eslint app/metadata.js app/__tests__/metadata.test.js app/catana/home/HomeTableClient.js app/opengraph-image.jsx
git diff --check
git status --short
```

Expected:

- all focused tests pass;
- ESLint reports no new warnings;
- `git diff --check` reports no whitespace errors;
- status contains only the expected Task 2 documentation changes plus any
  explicitly preserved unrelated worktree changes.

- [ ] **Step 7: Commit the repository record**

```bash
git add docs/agent/NOTES.md docs/agent/PROGRESS.md
git diff --cached --check
git commit -m "docs: record SettleHex beta copy direction"
```

Expected: one documentation-only commit that records the implemented and
visually verified copy hierarchy.
