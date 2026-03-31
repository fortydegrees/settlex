# Piece Assets Imagegen Plan Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and review the first 9 image-based concept sheets for Catana `settlement`, `road`, and `city` assets using the approved design brief.

**Architecture:** Use the approved spec as the shared contract, generate a controlled `3 x 3` batch through the bundled `imagegen` CLI, and keep the variation isolated to edge treatment and shading mode. Store prompts under `tmp/imagegen/`, write generated outputs under `output/imagegen/`, and judge only for silhouette/family/readability rather than final polish.

**Tech Stack:** OpenAI Image API via `~/.codex/skills/imagegen/scripts/image_gen.py`, JSONL batch input, repo docs under `docs/superpowers/`

---

### Task 1: Prepare The Batch Input

**Files:**
- Modify: `/Users/david/coding/settlex/docs/superpowers/specs/2026-03-18-piece-assets-design.md`
- Create: `/Users/david/coding/settlex/tmp/imagegen/piece-assets-concepts.jsonl`
- Output: `/Users/david/coding/settlex/output/imagegen/piece-assets-concepts/`

- [ ] **Step 1: Confirm the approved source-of-truth brief**

Read:
- `/Users/david/coding/settlex/docs/superpowers/specs/2026-03-18-piece-assets-design.md`

Check for:
- `hybrid soft-edge` baseline
- angled tabletop perspective
- silhouette-first / low-detail rule
- `city` as upgrade of `settlement`
- `3 x 3` matrix of edge treatment and shading mode

- [ ] **Step 2: Write the batch JSONL**

Create:
- `/Users/david/coding/settlex/tmp/imagegen/piece-assets-concepts.jsonl`

Include exactly 9 jobs:
- one per edge-treatment/shading combination
- each job outputs one landscape concept sheet
- each job uses a stable filename like `01-soft-tinted-flat-planes.png`

- [ ] **Step 3: Keep output location stable**

Create directory:

```bash
mkdir -p /Users/david/coding/settlex/output/imagegen/piece-assets-concepts
```

Expected:
- directory exists before the run
- generated concepts will not mix with unrelated outputs

### Task 2: Validate The Batch Definition

**Files:**
- Test: `/Users/david/coding/settlex/tmp/imagegen/piece-assets-concepts.jsonl`

- [ ] **Step 1: Dry-run the batch**

Run:

```bash
python3 /Users/david/.codex/skills/imagegen/scripts/image_gen.py generate-batch \
  --input /Users/david/coding/settlex/tmp/imagegen/piece-assets-concepts.jsonl \
  --out-dir /Users/david/coding/settlex/output/imagegen/piece-assets-concepts \
  --size 1536x1024 \
  --quality high \
  --use-case "stylized-concept" \
  --subject "settlement, road, and city from one visual family; city is a direct upgrade of settlement" \
  --style "clean stylized game asset concept art for later SVG tracing" \
  --composition "centered concept sheet with the three pieces shown separately on a simple neutral background, enough spacing around each piece, no board, no UI chrome" \
  --lighting "bright, clean, playful, modern-flat, cheerful, controlled shading" \
  --palette "single player-color family for the pieces, with readable light/mid/dark shade separation" \
  --constraints "keep a slightly angled tabletop perspective; prioritize silhouette clarity; keep detail low; use broad simple shape language; settlement must read as a house-like piece; city must read as an upgraded settlement; road must feel like a chunky placed game piece; pieces must feel cohesive as one family; designed as tracing reference for SVG; no text; no watermark" \
  --negative "colonist.io bevel style; heavy gloss; photoreal textures; tiny windows; brick seams; ornamental detail; sticker-pack look; mascot style; black outlines; clutter; dramatic shadows" \
  --dry-run
```

Expected:
- 9 generation payloads print successfully
- each payload targets `/v1/images/generations`
- outputs are named and ordered correctly
- no CLI validation errors

- [ ] **Step 2: Review dry-run payloads**

Check:
- the variant sentence for each job is preserved in `prompt`
- `size` is `1536x1024`
- `quality` is `high`
- no accidental board/UI context or extra text slipped into the prompt

### Task 3: Run The Live Batch

**Files:**
- Input: `/Users/david/coding/settlex/tmp/imagegen/piece-assets-concepts.jsonl`
- Output: `/Users/david/coding/settlex/output/imagegen/piece-assets-concepts/`

- [ ] **Step 1: Ensure the environment is ready**

Required:
- `OPENAI_API_KEY` is exported in the current shell environment
- `python3` is available
- `openai` SDK is available to the interpreter, or use `uv run --with openai`

- [ ] **Step 2: Run the live batch**

Preferred command:

```bash
uv run --with openai python /Users/david/.codex/skills/imagegen/scripts/image_gen.py generate-batch \
  --input /Users/david/coding/settlex/tmp/imagegen/piece-assets-concepts.jsonl \
  --out-dir /Users/david/coding/settlex/output/imagegen/piece-assets-concepts \
  --size 1536x1024 \
  --quality high \
  --use-case "stylized-concept" \
  --subject "settlement, road, and city from one visual family; city is a direct upgrade of settlement" \
  --style "clean stylized game asset concept art for later SVG tracing" \
  --composition "centered concept sheet with the three pieces shown separately on a simple neutral background, enough spacing around each piece, no board, no UI chrome" \
  --lighting "bright, clean, playful, modern-flat, cheerful, controlled shading" \
  --palette "single player-color family for the pieces, with readable light/mid/dark shade separation" \
  --constraints "keep a slightly angled tabletop perspective; prioritize silhouette clarity; keep detail low; use broad simple shape language; settlement must read as a house-like piece; city must read as an upgraded settlement; road must feel like a chunky placed game piece; pieces must feel cohesive as one family; designed as tracing reference for SVG; no text; no watermark" \
  --negative "colonist.io bevel style; heavy gloss; photoreal textures; tiny windows; brick seams; ornamental detail; sticker-pack look; mascot style; black outlines; clutter; dramatic shadows"
```

Fallback if `uv` is unavailable:

```bash
python3 /Users/david/.codex/skills/imagegen/scripts/image_gen.py generate-batch ...
```

- [ ] **Step 3: Confirm files were written**

Expected outputs:
- `/Users/david/coding/settlex/output/imagegen/piece-assets-concepts/01-soft-tinted-flat-planes.png`
- `/Users/david/coding/settlex/output/imagegen/piece-assets-concepts/02-soft-tinted-restrained-gradients.png`
- `/Users/david/coding/settlex/output/imagegen/piece-assets-concepts/03-soft-tinted-hybrid.png`
- `/Users/david/coding/settlex/output/imagegen/piece-assets-concepts/04-hybrid-edge-flat-planes.png`
- `/Users/david/coding/settlex/output/imagegen/piece-assets-concepts/05-hybrid-edge-restrained-gradients.png`
- `/Users/david/coding/settlex/output/imagegen/piece-assets-concepts/06-hybrid-edge-hybrid.png`
- `/Users/david/coding/settlex/output/imagegen/piece-assets-concepts/07-minimal-edge-flat-planes.png`
- `/Users/david/coding/settlex/output/imagegen/piece-assets-concepts/08-minimal-edge-restrained-gradients.png`
- `/Users/david/coding/settlex/output/imagegen/piece-assets-concepts/09-minimal-edge-hybrid.png`

### Task 4: Review And Narrow

**Files:**
- Review: `/Users/david/coding/settlex/output/imagegen/piece-assets-concepts/`
- Update: `/Users/david/coding/settlex/docs/agent/PROGRESS.md`
- Update: `/Users/david/coding/settlex/docs/agent/NOTES.md`

- [ ] **Step 1: Inspect each concept sheet**

Check each image for:
- silhouette clarity
- city-as-upgrade relationship
- road chunkiness and placement feel
- whether gradients help or hurt SVG traceability
- whether edge treatment feels Catana-native

- [ ] **Step 2: Pick 1-2 finalists**

Shortlist:
- one safest readability option
- one more visually interesting option if it still looks traceable

- [ ] **Step 3: Record the outcome**

Update:
- `/Users/david/coding/settlex/docs/agent/PROGRESS.md`
- `/Users/david/coding/settlex/docs/agent/NOTES.md`

Capture:
- winning variant(s)
- why they won
- any prompt adjustments needed for a second pass

### Task 5: Clean Up Temporary Input

**Files:**
- Delete: `/Users/david/coding/settlex/tmp/imagegen/piece-assets-concepts.jsonl`

- [ ] **Step 1: Remove the temp JSONL after the run is complete**

Run:

```bash
rm /Users/david/coding/settlex/tmp/imagegen/piece-assets-concepts.jsonl
```

Expected:
- prompt batch file is not committed as a durable project artifact
- generated outputs remain under `output/imagegen/`
