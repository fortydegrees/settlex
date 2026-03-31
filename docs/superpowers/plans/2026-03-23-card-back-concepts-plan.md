# Hidden Card Back Concepts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate temporary SVG concept sets for resource and dev card backs, then render them at actual opponent-stack size for review without touching the live assets.

**Architecture:** Keep the pass asset-only and exploratory. Build six standalone SVG concepts in a temp folder using a shared card silhouette and flat Catana palette, then raster them at both review size and actual `CardStack` size so the user can compare resource/dev readability before any live replacement.

**Tech Stack:** SVG, existing Catana UI constraints, `rsvg-convert`, ImageMagick, agent docs

---

### Task 1: Lock runtime and visual constraints

**Files:**
- Reference: `docs/superpowers/specs/2026-03-23-card-back-concepts-design.md`
- Reference: `app/catana/components/OpponentPlayerBox.js`
- Reference: `app/catana/components/CardStack.js`
- Reference: `public/svgs/card_rescardback_blank.svg`
- Reference: `public/svgs/card_devcardback_blank.svg`

- [ ] **Step 1: Re-read the approved spec**

Confirm:
- shared family,
- flat printed-card treatment,
- resource question-mark direction,
- dev ceremonial emblem direction,
- no live asset replacement in this pass.

- [ ] **Step 2: Reconfirm runtime size**

Check `CardStack.js` and note:
- `cardWidth = 52`
- `cardHeight = 72`
- the concept pass must be judged primarily at that size.

- [ ] **Step 3: Reconfirm current baseline**

Inspect the current blank/resource/dev backs and keep the new concepts significantly simpler and flatter.

### Task 2: Author the temporary SVG concepts

**Files:**
- Create: `tmp/card-back-concepts/resource-question-hex.svg`
- Create: `tmp/card-back-concepts/resource-question-window.svg`
- Create: `tmp/card-back-concepts/resource-question-bands.svg`
- Create: `tmp/card-back-concepts/dev-seal.svg`
- Create: `tmp/card-back-concepts/dev-forge.svg`
- Create: `tmp/card-back-concepts/dev-banner.svg`

- [ ] **Step 1: Build the shared card template**

For all six concepts:
- keep one rounded-rect silhouette,
- use one shared border/inset-frame language,
- preserve transparent outer background.

- [ ] **Step 2: Differentiate resource concepts**

Build three resource backs with:
- blue/slate palette,
- large question-mark cue,
- simple hex/tile-adjacent center treatment.

- [ ] **Step 3: Differentiate dev concepts**

Build three dev backs with:
- amber/blue/slate palette,
- larger ceremonial seal/hammer emblem,
- slightly more "special" feeling than the resource backs while staying flat.

### Task 3: Render and compare the concepts

**Files:**
- Verify: `tmp/card-back-concepts/*.svg`

- [ ] **Step 1: Validate all SVGs**

Run `xmllint --noout` across the concept files.

- [ ] **Step 2: Render review-size previews**

Render the concepts at a larger preview size for inspection.

- [ ] **Step 3: Render actual stack-size previews**

Render the concepts at `52 x 72` so the user can judge what survives the real opponent-box view.

- [ ] **Step 4: Assemble comparison sheets**

Create one or more sheets grouping resource and dev concepts clearly for side-by-side review.

### Task 4: Update project docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Record the concept pass**

Log:
- the approved family direction,
- the temp SVG location,
- the fact that the live assets remain unchanged.

- [ ] **Step 2: Record the runtime acceptance bar**

Note that `52 x 72` stack-size legibility is the primary review criterion.

- [ ] **Step 3: Record the strongest concepts**

After rendering, note which resource and dev backs appear most promising for a live replacement pass.
