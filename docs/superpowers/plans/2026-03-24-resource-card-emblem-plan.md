# Resource Card Emblem Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a temporary standalone SVG concept set for the new resource-card emblem, then render it for review without touching the live card-back asset.

**Architecture:** Keep the pass emblem-only and exploratory. Build three standalone SVG badges in a temp folder using the existing Catana tile-hex language, warm cream/amber framing, and a simplified five-hex network motif, then raster them at both review size and card-back medallion size so the user can compare readability before any integration work.

**Tech Stack:** SVG, existing Catana tile references, `rsvg-convert`, ImageMagick, agent docs

---

### Task 1: Reconfirm the emblem contract

**Files:**
- Reference: `docs/superpowers/specs/2026-03-24-resource-card-emblem-design.md`
- Reference: `tmp/card-back-concepts/round3/resource-question-bands-boardfit.svg`
- Reference: `public/svgs/palette-themes/option-b/tile_lumber.svg`

- [ ] **Step 1: Re-read the approved spec**

Confirm:
- standalone emblem only,
- Catana tile-style outer hex,
- five connected inner hexes,
- restrained radial lift,
- no live asset replacement.

- [ ] **Step 2: Reconfirm the target context**

Keep the new emblem simple enough to later drop into the resource card back and still read at the existing opponent-stack scale.

- [ ] **Step 3: Reconfirm the visual references**

Reuse:
- the broad tile-hex silhouette language,
- warm cream / amber badge framing,
- low-contrast Catana-style center lift rather than ornate line work.

### Task 2: Author the standalone emblem concepts

**Files:**
- Create: `tmp/card-back-concepts/resource-emblems/hybrid-seal.svg`
- Create: `tmp/card-back-concepts/resource-emblems/network-hex.svg`
- Create: `tmp/card-back-concepts/resource-emblems/medallion-cluster.svg`

- [ ] **Step 1: Build the shared hex-badge scaffold**

For all three concepts:
- use one centered hex badge silhouette,
- keep a warm rim + lighter inner field,
- preserve transparent outer background.

- [ ] **Step 2: Build the recommended hybrid concept**

Author `hybrid-seal.svg` with:
- tile-style outer hex,
- soft inner field,
- five-hex cluster using shared-edge or short-join logic,
- the clearest balance of badge and network.

- [ ] **Step 3: Build the more direct network concept**

Author `network-hex.svg` with:
- less medallion treatment,
- more direct hex-network read,
- slightly more geometric interior structure.

- [ ] **Step 4: Build the more ceremonial concept**

Author `medallion-cluster.svg` with:
- a slightly richer inner medallion feel,
- still simple enough for small-size review,
- no ornate knotwork or engraved detail.

### Task 3: Render and compare the concepts

**Files:**
- Verify: `tmp/card-back-concepts/resource-emblems/*.svg`

- [ ] **Step 1: Validate the SVGs**

Run:
```bash
xmllint --noout tmp/card-back-concepts/resource-emblems/*.svg
```

- [ ] **Step 2: Render review-size previews**

Render each emblem at a larger inspection size:
```bash
rsvg-convert -w 180 -h 180 tmp/card-back-concepts/resource-emblems/hybrid-seal.svg > /tmp/resource-emblem-hybrid-180.png
rsvg-convert -w 180 -h 180 tmp/card-back-concepts/resource-emblems/network-hex.svg > /tmp/resource-emblem-network-180.png
rsvg-convert -w 180 -h 180 tmp/card-back-concepts/resource-emblems/medallion-cluster.svg > /tmp/resource-emblem-medallion-180.png
```

- [ ] **Step 3: Render card-back medallion-size previews**

Render each emblem at a likely center-badge size for the hidden card:
```bash
rsvg-convert -w 72 -h 72 tmp/card-back-concepts/resource-emblems/hybrid-seal.svg > /tmp/resource-emblem-hybrid-72.png
rsvg-convert -w 72 -h 72 tmp/card-back-concepts/resource-emblems/network-hex.svg > /tmp/resource-emblem-network-72.png
rsvg-convert -w 72 -h 72 tmp/card-back-concepts/resource-emblems/medallion-cluster.svg > /tmp/resource-emblem-medallion-72.png
```

- [ ] **Step 4: Assemble comparison sheets**

Create a large review sheet and a medallion-scale review sheet:
```bash
mkdir -p /tmp/resource-emblem-renders
magick montage /tmp/resource-emblem-hybrid-180.png /tmp/resource-emblem-network-180.png /tmp/resource-emblem-medallion-180.png -background none -tile 3x1 -geometry +24+0 /tmp/resource-emblem-renders/contact-sheet.png
magick montage /tmp/resource-emblem-hybrid-72.png /tmp/resource-emblem-network-72.png /tmp/resource-emblem-medallion-72.png -background none -tile 3x1 -geometry +24+0 /tmp/resource-emblem-renders/contact-sheet-72.png
```

### Task 4: Update project docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Record the concept pass**

Log:
- the new temp SVG location,
- that the work is emblem-only,
- that the live resource card back remains unchanged.

- [ ] **Step 2: Record the visual read**

After rendering, note which concept best balances:
- board/network communication,
- Catana style fit,
- future integration into the card-back family.

- [ ] **Step 3: Record the preview outputs**

Note the generated review sheets and the size used to judge the emblem pass.
