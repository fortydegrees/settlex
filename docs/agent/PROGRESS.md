# PROGRESS

## Status (2026-04-02, Catana chat preview fix pass)
- Fixed `buildChatPreviewEntries(...)` so an explicit `playerID` stays the current speaker even when it is absent from `playerMap`.
- Removed viewport-fixed placement responsibility from `ChatPanel.js`; the panel is now layout-neutral and ready for a parent rail to position later.
- Tightened the chat panel preview copy so the disabled composer reads as preview-only instead of a live input.
- Adjusted the chat-focused contract tests in:
- `app/catana/__tests__/chatPreview.test.js`
- `app/catana/__tests__/ChatPanel.test.js`
- Verification:
- `pnpm exec vitest run app/catana/__tests__/gameText.test.js app/catana/__tests__/chatPreview.test.js app/catana/__tests__/ChatPanel.test.js`

## Status (2026-04-02, Catana chat preview panel shipped)
- Added `formatChatEntry` to `app/catana/utils/gameText.js` so chat entries reuse the existing player token model without resource expansion.
- Added the deterministic preview transcript helper in `app/catana/utils/chatPreview.js`.
- Replaced the `ChatPanel.js` scaffold with a presentational preview panel that renders through `FeedPanel`, maps preview rows through `FeedTokenRow`, and shows disabled glass-style composer chrome with preview-only copy.
- Extended the chat-focused contract tests in:
- `app/catana/__tests__/gameText.test.js`
- `app/catana/__tests__/chatPreview.test.js`
- `app/catana/__tests__/ChatPanel.test.js`
- Verification:
- `pnpm exec vitest run app/catana/__tests__/gameText.test.js app/catana/__tests__/chatPreview.test.js app/catana/__tests__/ChatPanel.test.js`

## Status (2026-04-02, shared feed-shell contract established)
- Extracted the Catana feed shell into shared components in:
- `app/catana/components/FeedPanel.js`
- `app/catana/components/FeedTokenRow.js`
- Added a memoized `ChatPanel.js` scaffold so the perf guard can lock the upcoming chat panel contract.
- Rewired `GameLogPanel.js` to delegate chrome, auto-scroll, and token rendering to the shared feed shell while keeping the existing `game-log-*` CSS aliases for compatibility.
- Updated the contract tests in:
- `app/catana/__tests__/FeedPanel.test.js`
- `app/catana/__tests__/uiNoDragImages.test.js`
- `app/catana/__tests__/renderPerfGuards.test.js`
- Refreshed the `GameLogPanel` source test to reflect the new delegation.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/uiNoDragImages.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/GameLogPanel.test.js`

## Status (2026-03-31, robber placement UX design approved)
- Wrote the approved robber-placement UX spec in:
- `docs/superpowers/specs/2026-03-31-robber-placement-ux-design.md`
- Approved direction for this slice:
- preserve the current robber placement behavior as `minimal`,
- add a `playful` cursor-follow overlay with magnetic target stickiness,
- make `playful` the new desktop default,
- defer any user-facing settings UI while keeping a clean internal motion-mode seam.
- Implementation is intentionally scoped to UI/runtime behavior only:
- no engine or server robber rules should change,
- no 3D tilt in the first pass,
- reduced-motion and coarse-pointer environments should fall back to `minimal`.

## Status (2026-03-28, dev-card icon live tuning)
- Wrote the implementation plan for the approved live pass in:
- `docs/superpowers/plans/2026-03-28-dev-card-icon-tuning-plan.md`
- Updated the live dev-card dock asset in:
- `public/svgs/icon_devcard.svg`
- Applied the approved tuning:
- tighter `viewBox` crop so the icon occupies more of the dock card,
- uneven blue lift with the biggest change in the darkest stop,
- warmer hammer handle / shadow ramps for better disabled-state contrast.
- Kept the existing hammer-disc concept and warm top-half palette intact; this pass is a tuning pass, not a symbol redesign.
- Verification:
- `xmllint --noout public/svgs/icon_devcard.svg`
- `rsvg-convert -w 96 -h 96 public/svgs/icon_devcard.svg > /tmp/devcard-icon-96.png`
- `rsvg-convert -w 64 -h 64 public/svgs/icon_devcard.svg > /tmp/devcard-icon-64.png`

## Status (2026-03-24, resource-card emblem concept pass)
- Wrote the approved emblem-only spec and implementation plan in:
- `docs/superpowers/specs/2026-03-24-resource-card-emblem-design.md`
- `docs/superpowers/plans/2026-03-24-resource-card-emblem-plan.md`
- Created three temporary standalone resource-card emblem SVGs in:
- `tmp/card-back-concepts/resource-emblems/`
- Variant set:
- `hybrid-seal.svg`
- `network-hex.svg`
- `medallion-cluster.svg`
- Shared direction for this pass:
- reuse the Catana tile-style outer hex badge,
- replace the question-mark center idea with a five-hex resource/network emblem,
- keep the work standalone so it can be reviewed before changing `card_rescardback`.
- Rendered review artifacts:
- `/tmp/resource-emblem-renders/contact-sheet.png`
- `/tmp/resource-emblem-renders/contact-sheet-72.png`
- Current read from the concept logic:
- `network-hex` is the most direct `board/resources` read,
- `hybrid-seal` is the best balance if the emblem still wants badge presence,
- `medallion-cluster` is the most ceremonial and the least literal.
- Live `public/svgs/card_rescardback.svg` remains unchanged in this pass.

## Status (2026-03-24, resource-card emblem design approved)
- Wrote the approved standalone resource-card emblem spec in:
- `docs/superpowers/specs/2026-03-24-resource-card-emblem-design.md`
- New direction replaces the question-mark center symbol exploration with a Catana-native hex-network emblem:
- tile-style outer hex badge,
- five connected inner hexes,
- warm cream / amber structure,
- restrained tile-like radial lift.
- This spec is intentionally scoped to the emblem only, not a full `card_rescardback` replacement yet.
- No live SVG assets were changed in this step.

## Status (2026-03-23, dev-card icon variation set)
- Wrote the approved development-card icon exploration spec and plan in:
- `docs/superpowers/specs/2026-03-23-dev-card-icon-variations-design.md`
- `docs/superpowers/plans/2026-03-23-dev-card-icon-variations-plan.md`
- Created four Catana-native candidate SVGs derived from the recreated split-medallion symbol, all in:
- `tmp/devcard-icon-variants/`
- Variant set:
- `forge-stamp.svg`
- `makers-mark.svg`
- `struck-seal.svg`
- `guild-token.svg`
- Shared direction:
- keep the medallion/seal read,
- shift the palette and proportions away from a direct official clone,
- add a simplified hammer cue instead of reusing the current Colonist-derived full card-back art.
- Rendered review artifacts:
- `/tmp/devcard-icon-renders/contact-sheet.png`
- `/tmp/devcard-icon-renders/contact-sheet-38.png`
- Quick read from the dock-scale pass:
- `makers-mark` survives `38px` best,
- `forge-stamp` is the safest close second,
- `struck-seal` is the most expressive,
- `guild-token` feels least like a direct clone but gives up some small-size clarity.
- Live `public/svgs/icon_devcard.svg` was intentionally left untouched in this pass.

## Status (2026-03-23, dev-card icon fluent-hammer round 2)
- Downloaded the official Microsoft Fluent Emoji flat hammer source to:
- `tmp/devcard-icon-variants/round2/fluent-hammer-flat.svg`
- Built a second four-icon variant set using that exact hammer geometry as the base, with:
- flat fills only,
- stricter Catana palette alignment,
- no global gradients or glossy lighting.
- Round-2 SVGs:
- `tmp/devcard-icon-variants/round2/forge-stamp-fluent.svg`
- `tmp/devcard-icon-variants/round2/makers-mark-fluent.svg`
- `tmp/devcard-icon-variants/round2/struck-seal-fluent.svg`
- `tmp/devcard-icon-variants/round2/guild-token-fluent.svg`
- Round-2 renders:
- `/tmp/devcard-icon-renders/round2/contact-sheet.png`
- `/tmp/devcard-icon-renders/round2/contact-sheet-38.png`
- Current read from the Fluent-based pass:
- `makers-mark-fluent` is the clearest and most stable at dock size,
- `forge-stamp-fluent` is the best balance if the icon should still feel seal-first,
- `struck-seal-fluent` adds motion but is weaker than the first two,
- `guild-token-fluent` is the most remixed badge but not the strongest small-size read.

## Status (2026-03-23, hidden card-back concept pass)
- Wrote the approved hidden-card-back concept spec and plan in:
- `docs/superpowers/specs/2026-03-23-card-back-concepts-design.md`
- `docs/superpowers/plans/2026-03-23-card-back-concepts-plan.md`
- Created six temporary card-back SVG concepts in:
- `tmp/card-back-concepts/`
- Resource concepts:
- `resource-question-hex.svg`
- `resource-question-window.svg`
- `resource-question-bands.svg`
- Dev concepts:
- `dev-seal.svg`
- `dev-forge.svg`
- `dev-banner.svg`
- Rendered review sheets:
- `/tmp/card-back-concepts-renders/resources-sheet.png`
- `/tmp/card-back-concepts-renders/dev-sheet.png`
- `/tmp/card-back-concepts-renders/stack-size-sheet.png`
- Current read from the real `52 x 72` pass:
- `resource-question-bands` is the clearest resource back,
- `resource-question-window` is the safest polished fallback,
- `dev-seal` is the strongest dev back,
- `dev-forge` is interesting but weaker at small size,
- `dev-banner` feels too nested for the opponent stack view.
- Live `public/svgs/card_rescardback.svg` and `public/svgs/card_devcardback.svg` were intentionally left untouched.

## Status (2026-03-23, hidden card-back radial refinement pass)
- Created a tile-style radial-lighting round on the two strongest card-back concepts:
- `tmp/card-back-concepts/round2/resource-question-bands-tilelift.svg`
- `tmp/card-back-concepts/round2/dev-seal-tilelift.svg`
- The radial treatment follows the board-tile logic:
- slightly lighter center,
- slightly darker edges,
- low contrast,
- emblem shapes kept mostly flat for readability.
- Rendered comparison sheets:
- `/tmp/card-back-concepts-renders/round2/resource-compare.png`
- `/tmp/card-back-concepts-renders/round2/dev-compare.png`
- `/tmp/card-back-concepts-renders/round2/stack-compare.png`
- Current read:
- the radial pass is subtle but better aligned with the Catana tile language,
- it improves overall finish without materially hurting the `52 x 72` stack read,
- the gradient versions now edge out the fully flat versions for both `resource-question-bands` and `dev-seal`.

## Status (2026-03-23, hidden card-back board-fit polish pass)
- Created a second polish round to push the best card backs closer to the current board/UI language:
- `tmp/card-back-concepts/round3/resource-question-bands-boardfit.svg`
- `tmp/card-back-concepts/round3/dev-seal-boardfit.svg`
- Changes in this round:
- creamier outer keyline,
- lighter/more board-like edge treatment,
- softer symbol ink on the resource `?`,
- reduced harsh dark framing.
- Rendered comparison sheets:
- `/tmp/card-back-concepts-renders/round3/resource-compare.png`
- `/tmp/card-back-concepts-renders/round3/dev-compare.png`
- `/tmp/card-back-concepts-renders/round3/stack-compare.png`
- Current read:
- round 3 feels more native to the board/UI styling,
- but it also gives up a little contrast compared with round 2,
- `resource-question-bands-boardfit` is probably the better fit overall,
- `dev-seal-boardfit` is aesthetically closer to the board, but the stronger round-2 version may still win if maximum stack readability is the priority.

## Status (2026-03-23, robber SVG gradient-family pass)
- Reworked `public/svgs/icon_robber.svg` away from many tiny flat gray facets and into a smaller set of broad gradient-shaded masses.
- Current local pass uses:
- head,
- top plane,
- main body,
- side body,
- stem,
- base
- with restrained neutral-gray gradients and a darker rim, aiming to match the general shading model of the settlement/road assets more closely than the earlier cel-shaded trace.
- Current caveat:
- the shading model is closer, but the silhouette has also been simplified and may need another pass if the traced robber shape should be preserved more literally.
- Verification:
- `xmllint --noout public/svgs/icon_robber.svg`
- `rsvg-convert -w 180 -h 180 public/svgs/icon_robber.svg`
- `rsvg-convert -w 96 -h 96 public/svgs/icon_robber.svg`
- `rsvg-convert -w 64 -h 64 public/svgs/icon_robber.svg`

## Status (2026-03-22, robber smooth-gradient concept pass)
- Ran a focused `imagegen` shading pass to reduce the painted/cel-shaded look on the shortlisted robber concepts.
- Used strict edit prompts with `input_fidelity=high` so the form and projection stayed close to the round-2 concepts while the lighting became broader and more linear.
- Outputs are in:
- `output/imagegen/robber-gradient-round1/`
- Best current smooth-shading references:
- `concept2-smooth-1.png`
- `concept2-smooth-2.png`
- Secondary structured options:
- `concept4-smooth-1.png`
- `concept4-smooth-2.png`

## Status (2026-03-22, robber imagegen concept pass)
- Ran live `imagegen` concept exploration for the robber using the bundled CLI and the OpenAI Image API.
- First pass from `icon_robber copy.svg` drifted back toward a generic chess-pawn read.
- Stronger second pass used the current higher-view robber sketch as the edit anchor and produced more traceable concepts in:
- `output/imagegen/robber-projection-round2/`
- Best current references from that pass:
- `robber-concept-2.png`
- `robber-concept-4.png`
- These are concept references for manual SVG redraw, not production assets.

## Status (2026-03-22, robber projection aligned to piece family)
- Refined `public/svgs/icon_robber.svg` to feel closer to the existing settlement/city projection rather than a flatter side-on pawn.
- Applied a shared projection guide instead of chasing a literal camera angle:
- more top-plane visibility on head, body, and base,
- less front-face height,
- minimal side reveal,
- still kept the silhouette chunky enough for small-size readability.
- Verification:
- `xmllint --noout public/svgs/icon_robber.svg`
- `rsvg-convert -w 96 -h 96 public/svgs/icon_robber.svg`
- `rsvg-convert -w 64 -h 64 public/svgs/icon_robber.svg`
- visual family comparison render against `settlement_red.svg`, `city_red.svg`, and `road_red.svg`

## Status (2026-03-22, robber icon redrawn)
- Replaced the old detailed robber art in `public/svgs/icon_robber.svg` with a faceless gray pawn-stack piece.
- The live asset now follows the same board-piece language as the current `road` / `settlement` / `city` family:
- chunky silhouette,
- restrained directional gradients,
- darker rim,
- no character detail or ninja cues.
- Final proportion choice deliberately stayed bolder than the first pass so the icon holds up better at small rendered sizes.
- Verification:
- `rsvg-convert -w 96 -h 96 public/svgs/icon_robber.svg`
- `rsvg-convert -w 64 -h 64 public/svgs/icon_robber.svg`
- visual family comparison render against `settlement_red.svg`, `city_red.svg`, and `road_red.svg`
- no automated tests were needed because this was an asset-only change

## Status (2026-03-22, robber icon design and plan approved)
- Wrote the approved design spec for replacing the current robber art in:
- `docs/superpowers/specs/2026-03-22-robber-icon-design.md`
- Approved direction:
- faceless `pawn stack` blocker piece,
- neutral gray Catana board-piece language,
- restrained directional gradients to match the current `road` / `settlement` / `city` family.
- Added the implementation plan in:
- `docs/superpowers/plans/2026-03-22-robber-icon-plan.md`
- This is design/planning only so far; `public/svgs/icon_robber.svg` has not been redrawn yet in this step.

## Status (2026-03-20, longest-road status icon redrawn)
- Replaced the copied placeholder in `public/svgs/icon_longest_road.svg` with a Catana-native status glyph built from two chunky connected road pieces.
- Kept the icon asset-only and UI-sized for `app/catana/components/PlayerAvatarStats.js`, using a compact `32 x 32` SVG with neutral warm road-piece tones so the adjacent stat number remains the main highlight.
- Captured the approved design and implementation notes in:
- `docs/superpowers/specs/2026-03-20-longest-road-icon-design.md`
- `docs/superpowers/plans/2026-03-20-longest-road-icon-plan.md`
- Verification:
- manual render check with `rsvg-convert -w 28 -h 28 public/svgs/icon_longest_road.svg`
- no automated tests were needed because runtime code did not change

## Status (2026-03-19, settlement PNG prototype support removed)
- Removed the temporary emoji-theme settlement asset override in `app/catana/theme/themes.js`; settlement lookups now resolve through the normal `/svgs/settlement_<color>.svg` path instead of rewriting to `/test_designs/settlement_red.png`.
- Removed the raster-only settlement sizing/alignment branch from:
- `app/catana/Piece.js`
- `app/catana/effects/placePiece.js`
- Focused regression coverage now checks that the runtime no longer carries the PNG-specific settlement path:
- `app/catana/__tests__/themeAssets.test.js`
- `app/catana/__tests__/Piece.test.js`
- `app/catana/__tests__/effects/placePieceWiring.test.js`
- Verification:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Piece.test.js app/catana/__tests__/effects/placePieceWiring.test.js`
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/Moves.placePieceEffects.test.js`

## Status (2026-03-18, first piece asset imagegen pass completed)
- Ran the approved 9-variant `imagegen` concept batch for `settlement`, `road`, and `city`.
- Generated outputs live under:
- `output/imagegen/piece-assets-concepts/`
- Added a side-by-side review sheet at:
- `output/imagegen/piece-assets-concepts/contact-sheet.png`
- Initial shortlist after reviewing the first pass:
- `08-minimal-edge-restrained-gradients.png` — strongest balance of simple silhouette, readable road chunkiness, and a city that still feels like an upgrade rather than a different icon family.
- `03-soft-tinted-hybrid.png` — strongest of the slightly richer/shaded options; more stylized and less austere than `08`, while still feeling traceable into SVG.
- Secondary fallback:
- `09-minimal-edge-hybrid.png` — clean and traceable, but weaker than `08` in family cohesion.
- Clear rejects from pass 1:
- grounded/base-plaque variants (`02`, `04`, `06`) drift too far toward “miniature on a stand” rather than placed board piece,
- `07` introduces glow/background treatment that is unusable for production tracing,
- `05` is too castle-like and detailed for the current MVP target.
- Current recommendation:
- use `08` as the safest tracing reference,
- optionally borrow a little of `03`'s richer color-plane treatment if `08` feels too austere in the next refinement pass.

## Status (2026-03-18, piece asset imagegen batch prepared)
- Added the execution plan for the first concept-generation pass in:
- `docs/superpowers/plans/2026-03-18-piece-assets-imagegen-plan.md`
- Prepared the temporary 9-job image batch input at:
- `tmp/imagegen/piece-assets-concepts.jsonl`
- Output target for the first pass is:
- `output/imagegen/piece-assets-concepts/`
- Dry-ran the bundled image generation CLI successfully with the approved shared prompt contract:
- `python3 /Users/david/.codex/skills/imagegen/scripts/image_gen.py generate-batch ... --dry-run`
- Dry-run validated:
- all 9 jobs parse correctly,
- output filenames are stable and ordered,
- each payload uses `gpt-image-1.5`, `1536x1024`, and `high` quality,
- prompt variation is limited to the intended edge-treatment/shading matrix.
- Current blocker:
- live generation is still blocked in this shell because `OPENAI_API_KEY` is not set.

## Status (2026-03-18, settlement/road/city asset design brief approved)
- Wrote the approved Catana design brief for replacement `settlement`, `road`, and `city` assets in:
- `docs/superpowers/specs/2026-03-18-piece-assets-design.md`
- Locked the MVP direction to a `hybrid soft-edge` piece family:
- angled tabletop perspective,
- silhouette-first forms,
- low detail,
- `city` as a direct upgrade of `settlement`,
- controlled exploration of edge treatment and shading instead of committing to Colonist-style outlines/bevels.
- Defined the concept-generation contract for the first image pass:
- one concept sheet per run containing all three pieces together,
- `3 x 3` matrix across edge treatment (`soft tinted`, `hybrid`, `minimal`) and shading (`flat planes`, `restrained gradients`, `hybrid`),
- output intended as tracing reference for later SVG production, not final art.
- No production SVGs generated in this pass yet; this entry records the approved design and prompt contract only.

## Status (2026-03-16, bottom HUD hitbox narrowed for board panning)
- Fixed the bottom HUD overlay in `app/catana/components/PlayerActionContainer.js` so blank space across the full-width bottom strip no longer intercepts pointer events.
- The fixed bottom container is now `pointer-events-none` by default, while the actual centered dock and right-side dice/end-turn column opt back into `pointer-events-auto`.
- This preserves the existing layout while allowing board pan gestures to start in the empty area around the bottom-right HUD instead of being blocked by the full-width flex wrapper.
- Added focused coverage in:
- `app/catana/__tests__/PlayerActionContainer.hitbox.test.js`
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/GameScreen.interactionGuards.test.js app/catana/__tests__/GameScreen.zoomPan.test.js`

## Status (2026-03-16, zoom/pan bottom-edge fix)
- Fixed board zoom/pan bounds in the local `react-zoom-pan-pinch` fork so bounds now come from the actual transformed content size plus configured extra pan room, instead of treating the extra offsets as the entire scaled bounds.
- This restores enough negative pan range to zoom into the bottom and right edges of the board while keeping the existing extra sea/headroom allowances in `GameScreen`.
- Updated `app/catana/GameScreen.js` to set `disablePadding={true}` on `TransformWrapper`, so wheel zoom no longer overshoots and snaps back on zoom stop.
- Added regression coverage in:
- `react-zoom-pan-pinch/core/bounds/bounds.utils.test.ts`
- `app/catana/__tests__/GameScreen.zoomPan.test.js`
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/GameScreen.audioMute.test.js app/catana/__tests__/GameScreen.cancelBuildAction.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/GameScreen.interactionGuards.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/GameScreen.zoomPan.test.js react-zoom-pan-pinch/core/bounds/bounds.utils.test.ts react-zoom-pan-pinch/core/double-click/double-click.logic.test.ts`
- `pnpm verify`

## Status (2026-03-16, dedicated high-contrast port icons)
- Added a dedicated port-icon asset path in `app/catana/theme/themes.js`:
- `getPortIconPath(themeId, resource)`
- `getClassicPortIconPath(resource)`
- Emoji-theme resource ports now resolve to a separate Fluent `High Contrast` asset family under:
- `public/svgs/palette-themes/emoji/port_icon_wood.svg`
- `public/svgs/palette-themes/emoji/port_icon_brick.svg`
- `public/svgs/palette-themes/emoji/port_icon_sheep.svg`
- `public/svgs/palette-themes/emoji/port_icon_wheat.svg`
- `public/svgs/palette-themes/emoji/port_icon_ore.svg`
- Generic `3:1` ports now use a dedicated question-mark SVG instead of the old three-dot glyph:
- `public/svgs/palette-themes/emoji/port_icon_any.svg`
- `public/svgs/port_icon_any.svg` (classic/non-emoji fallback)
- Follow-up art tuning:
- softened all dedicated port icon ink from hard black `#212121` to lighter sand-brown `#A8986F` so the symbols sit more calmly on the pale port disk.
- replaced the dedicated brick port icon with the same mortar-and-bricks silhouette used by the tile brick icon, restyled into the softer port-ink treatment so tile and port brick shapes now match.
- Updated `app/catana/Port.js` so both specific-resource and generic ports render through the image-based port-icon path and retain classic fallback behavior on image error.
- Tile emoji icons remain the existing Fluent `Flat` assets; only port markers now use the separate higher-contrast set.
- Added focused coverage in:
- `app/catana/__tests__/themeAssets.test.js`
- `app/catana/__tests__/Port.render.test.js`
- `app/catana/__tests__/Port.iconAssets.test.js`
- Verification:
- `pnpm exec vitest run app/catana/__tests__/Port.iconAssets.test.js app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/BoardPortChannels.render.test.js app/catana/__tests__/utils/portLayout.test.js`
- `pnpm lint` (passes with existing unrelated warnings only)

## Status (2026-03-16, port connector test tightened)
- Tightened `app/catana/__tests__/BoardPortChannels.render.test.js` to assert two connector bars per port group, not just total connectors.
- Removed the unused `connector` param from `getConnectorBarStyle` in `app/catana/BoardPortChannels.js`.
- Verification:
- `pnpm vitest app/catana/__tests__/BoardPortChannels.render.test.js`

## Status (2026-03-09, runtime-composed port markers implemented)
- Replaced the old literal port asset stack in `app/catana/Port.js` with a runtime-composed marker system.
- Added pure port layout helper:
- `app/catana/utils/portLayout.js`
- Added focused runtime styling:
- `app/catana/Port.css`
- Added focused tests:
- `app/catana/__tests__/utils/portLayout.test.js`
- `app/catana/__tests__/Port.render.test.js`
- Implemented MVP port structure:
- two explicit connector planks,
- one embedded circular harbor marker,
- reused themed resource icon for specific ports,
- bottom-centered rate badge (`2:1` for specific ports, `3:1` for generic ports),
- simple neutral 3-dot glyph for generic `Any` ports.
- Important implementation correction from code review:
- connector anchors are now derived from actual coastal node directions using `getNodeDelta(...)`, not from legacy hand-tuned fractions.
- Follow-up visual tuning:
- port marker footprint was reduced from the first MVP pass,
- connector anchors now start inset from the coastal node centers and terminate sooner so the planks read as shoreline bridges rather than running underneath settlement/city positions.
- Important implementation note:
- `app/catana/Port.js` now uses `React.createElement(...)` instead of JSX because the Vitest/Vite server-render path for this file failed import analysis on JSX in `.js`.
- Residual MVP gap:
- focused tests now prove node-anchored connector geometry for one shoreline direction plus isolated port markup structure,
- but there is still no full live-board visual regression check for all six port directions.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/utils/portLayout.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/themeAssets.test.js`
- `pnpm lint` (passes with existing unrelated warnings only)

## Status (2026-03-09, port marker MVP direction approved)
- Approved a launch-scoped replacement for the current copied/literal Catana port visuals.
- New direction:
- use an embedded abstract shoreline marker instead of scenic harbor art,
- keep the marker mostly map-like with light glass/frosted accents,
- reuse the existing themed resource icons as the center glyph for specific ports,
- render the trade rate as a separate bottom-centered badge (`2:1` / `3:1`),
- render exactly two explicit bridge/causeway connectors to the eligible coastal nodes.
- Decided against both extremes for launch:
- not a literal boat/sign harbor treatment,
- not a fully illustrated mini-island scene,
- not a floating UI chip disconnected from the board.
- Added design doc `docs/plans/2026-03-09-port-marker-mvp-design.md`.
- Added implementation plan `docs/plans/2026-03-09-port-marker-mvp-plan.md`.

## Status (2026-03-08, board theme picker removed and emoji defaulted)
- Removed the in-game theme picker UI from `app/catana/GameScreen.js`.
- Kept theme plumbing intact on the board/game screen:
- `themeId` is still read, stored, and passed into board/HUD/modal components.
- Default/fallback theme resolution now uses `emoji` in `app/catana/theme/themes.js`.
- Preserved classic asset fallback behavior for helper paths like `getClassicSvgPath(...)` so non-emoji fallback rendering still points at `/svgs/*`.
- Updated focused tests:
- `app/catana/__tests__/GameScreen.themeSwitcher.test.js`
- `app/catana/__tests__/themeAssets.test.js`
- Verification:
- `pnpm exec vitest run app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/themeAssets.test.js`
- `pnpm lint` (passes with existing unrelated warnings only)

## Status (2026-03-07, generated standard-board underlay implemented)
- Replaced the superseded hand-shaped `board_island_base_*` approach with a generated standard-board underlay asset:
- `public/svgs/board_underlay_standard.svg`
- Added pure underlay helpers:
- `app/catana/utils/boardUnderlayGeometry.mjs` (+ JS re-export wrapper)
- `app/catana/utils/boardUnderlayLayout.js`
- Added reproducible generator script:
- `scripts/generate-board-underlay.mjs`
- Added runtime underlay component:
- `app/catana/BoardUnderlay.js`
- Updated runtime wiring:
- `app/catana/theme/themes.js` now exposes `getBoardUnderlayPath(themeId)`
- `app/catana/Board.js` now renders `<BoardUnderlay ... />` before `{tiles}`
- Removed superseded files:
- `app/catana/BoardIslandBase.js`
- `app/catana/utils/islandBaseLayout.js`
- `public/svgs/board_island_base_tight.svg`
- `public/svgs/board_island_base_medium.svg`
- `public/svgs/board_island_base_broad.svg`
- Important geometry correction: the true perimeter of the standard 19-land-tile pointy-top board is `30` boundary edges / ordered points, not `18`.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/utils/boardUnderlayGeometry.test.js app/catana/__tests__/utils/boardUnderlayLayout.test.js app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/uiNoDragImages.test.js`
- `pnpm lint` (warnings only; no new underlay-specific lint errors)
- Visual QA:
- desktop board screenshot: `.playwright-cli/page-2026-03-07T11-51-37-369Z.png`
- narrow/mobile board screenshot: `.playwright-cli/page-2026-03-07T11-53-52-707Z.png`
- Known unrelated runtime issue during QA: `/timer/:matchID` still hits an existing localhost CORS problem from `http://localhost:8000`, but the board itself renders and the underlay loads correctly.

## Status (2026-03-07, generated-underlay island direction approved)
- Approved a launch-scoped replacement for the manual Catana island SVG variants.
- New direction:
- keep `game-core` unchanged,
- do not add native water tiles yet,
- do not render per-edge coast pieces,
- instead generate one board-shaped underlay SVG from the actual standard 19-land-tile footprint and check that asset into the repo.
- The generated asset is intended to replace the hand-shaped `board_island_base_*` files and their variant plumbing once implemented.
- The underlay will remain a decorative Catana UI layer rendered behind land tiles, but its shape will be reproducible from board geometry instead of hand-edited silhouettes.
- Added design doc `docs/plans/2026-03-07-generated-island-underlay-design.md`.
- Added implementation plan `docs/plans/2026-03-07-generated-island-underlay-plan.md`.

## Status (2026-03-06, Catana island base manual SVG variants)
- Replaced the old fused-hex island underlay with three hand-drawn layered SVG variants:
- `public/svgs/board_island_base_tight.svg`
- `public/svgs/board_island_base_medium.svg`
- `public/svgs/board_island_base_broad.svg`
- Updated `app/catana/theme/themes.js` so `getBoardIslandBasePath(themeId, variantId?)` resolves explicit `tight / medium / broad` island assets and falls back to `medium`.
- Wired `medium` as the current default asset for the live board while keeping the other two variants available for visual comparison.
- Kept the layout math unchanged in `app/catana/utils/islandBaseLayout.js`; the new pass changes only the SVG art direction, not board geometry.
- Manual design changes in the new SVGs:
- simplified curve-friendly coastline instead of enlarged fused hexes,
- exactly four visible layers: blue outer glow, pale surf ring, sand shell, inner land tint,
- removed texture/pattern details and kept the style flat/vector to match Catana.
- Added a local preview surface at `output/imagegen/island-variants/index.html` plus generated board-overlay assets for comparing the three SVG variants against the current board art.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/BoardIslandBase.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/utils/islandBaseLayout.test.js`
- Current state: `medium` is only a provisional default pending visual sign-off; `tight` and `broad` are available as direct comparison references.

## Status (2026-03-06, medium island base scaled up inside fixed frame)
- Enlarged only the art inside `public/svgs/board_island_base_medium.svg` without changing `app/catana/utils/islandBaseLayout.js`.
- Updated the medium variant layer scales to make the backing plate more visible around the outer ring:
- blue glow: `scale(1.14 1.12)`
- pale surf ring: `scale(1.09 1.075)`
- sand shell: `scale(1.045 1.035)`
- inner land tint: `scale(0.76 0.72)` with slightly reduced opacity
- This keeps the same board-relative frame sizing while fixing the “backing board is too hidden under the tiles” problem.
- Re-verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/BoardIslandBase.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/utils/islandBaseLayout.test.js`
- Live QA: captured a fresh `/catana/lobby/<match>?playerID=0` emoji-theme screenshot after the SVG-only scale change; the plate is now clearly visible around the board perimeter.

## Status (2026-03-06, medium island silhouette redrawn as softened board hex)
- Replaced the `medium` variant path in `public/svgs/board_island_base_medium.svg` with a 12-point softened super-hex silhouette tied to the board footprint.
- The new outline uses six broad side bulges and six major corners, so the backing plate reads as an expanded/smoothed version of the board shape instead of a round island/blob.
- Kept the existing four-layer treatment and the previously enlarged in-SVG scale values; only the `medium` path geometry changed in this pass.
- Added regression coverage in `app/catana/__tests__/themeAssets.test.js` to lock the new softened-hex path signature.
- Re-verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/BoardIslandBase.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/utils/islandBaseLayout.test.js`
- Live QA: fresh emoji-theme board screenshot now shows a curvy/wavy hex underlay rather than the earlier rounder plate.

## Status (2026-03-05, Catana island base underlay)
- Added a shared board underlay asset at `public/svgs/board_island_base.svg` to visually connect the land hexes into one island mass.
- Added `getBoardIslandBasePath(...)` in `app/catana/theme/themes.js` so the island base resolves through the same theme helper layer as other board assets.
- Added `app/catana/utils/islandBaseLayout.js` with `getIslandBaseFrame(...)` to keep the island sizing math pure and testable (`8.9x` width, `8.24x` height, rounded frame output).
- Added `app/catana/BoardIslandBase.js` as a decorative, non-interactive image underlay (`pointerEvents: none`, `aria-hidden`).
- Wired the underlay into `app/catana/Board.js` before `{tiles}` so ports, tokens, pieces, and effect layers still render above it.
- Replaced the initial oversized blob silhouette with a tighter board-shaped shoreline built from enlarged hex footprints, so the coast hugs the outer ring instead of reading like a circular platter.
- Added focused coverage:
- `app/catana/__tests__/themeAssets.test.js`
- `app/catana/__tests__/utils/islandBaseLayout.test.js`
- `app/catana/__tests__/BoardIslandBase.test.js`
- `app/catana/__tests__/Board.layering.test.js`
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/utils/islandBaseLayout.test.js app/catana/__tests__/BoardIslandBase.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/uiNoDragImages.test.js`
- Visual QA:
- Desktop `/catana` spectator view now reads as a single island instead of floating tiles.
- Smaller mobile-style viewport keeps the island readable; unrelated existing issue noted: top HUD is clipped on the narrow viewport.

## Status (2026-03-05, island base design + implementation plan)
- Added design doc `docs/plans/2026-03-05-island-base-design.md` for a flat SVG island underlay behind the Catana land tiles.
- Added implementation plan `docs/plans/2026-03-05-island-base-plan.md`.
- Approved direction is a non-interactive abstract island plate: muted green land mass, thin sand rim, soft outer glow/shadow, rendered below tiles and ports.
- Planned implementation keeps board geometry unchanged and routes the SVG through theme helpers for future overrides.

## Status (2026-03-05, zoom/pan bounds asymmetry fix)
- Fixed asymmetric zoomed-out pan bounds in `react-zoom-pan-pinch/core/bounds/bounds.utils.ts`.
- Root cause: `calculateBounds(...)` used different multipliers for negative vs positive bounds when `scale < 1`, creating one-sided horizontal movement limits and rebound bias.
- Updated bounds scaling to use one shared zoom multiplier on both min/max sides for both axes.
- Added regression coverage in `react-zoom-pan-pinch/core/bounds/bounds.utils.test.ts` to lock symmetric horizontal bounds behavior when limits are symmetric.
- Verified with:
- `pnpm exec vitest run react-zoom-pan-pinch/core/bounds/bounds.utils.test.ts`
- `pnpm verify` (fails in this workspace on unrelated existing expectation drift: `app/catana/__tests__/Moves.gameLog.test.js` expects no `robber:skip` entry)

## Status (2026-03-05, emoji tile icon overlay nudged lower)
- Adjusted emoji-only tile icon vertical placement in `app/catana/Tile.js` to sit a bit lower on the tile face.
- Increased `EMOJI_TILE_ICON_TOP_MULTIPLIER` to `1.16` and applied it only when `themeId === "emoji"` (`size * TILE_ICON_TOP_FACTOR * 1.16`) for an extra downward nudge.
- This keeps non-emoji themes on the existing top alignment.
- Extended `app/catana/__tests__/Tile.iconSizing.test.js` to assert emoji-only top positioning wiring.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/Tile.iconSizing.test.js`

## Status (2026-03-05, emoji tile icon overlay scaled down 15%)
- Updated tile overlay icon sizing in `app/catana/Tile.js` so only the `emoji` theme uses a smaller icon footprint.
- Added `EMOJI_TILE_ICON_SCALE_MULTIPLIER = 0.85`, applied on top of existing `TILE_ICON_SCALE` for tile overlays (`size * 0.68 * 0.85`).
- Non-emoji themes keep current tile icon size behavior unchanged.
- Added coverage in `app/catana/__tests__/Tile.iconSizing.test.js` to lock emoji-only scaling wiring.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/Tile.iconSizing.test.js`

## Status (2026-03-05, emoji icons switched to Fluent flat SVGs)
- Replaced emoji theme icon files with Microsoft Fluent `Flat` SVG assets, preserving local file names and existing theme routing:
- `icon_wood.svg` <- `assets/Wood/Flat/wood_flat.svg`
- `icon_brick.svg` <- `assets/Brick/Flat/brick_flat.svg`
- `icon_sheep.svg` <- `assets/Ewe/Flat/ewe_flat.svg`
- `icon_wheat.svg` <- `assets/Sheaf of rice/Flat/sheaf_of_rice_flat.svg`
- `icon_ore.svg` <- `assets/Rock/Flat/rock_flat.svg`
- `icon_desert.svg` <- `assets/Cactus/Flat/cactus_flat.svg`
- This supersedes the earlier same-day `Color` variant swap for the same six files.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji icons switched to Fluent color SVGs)
- Replaced emoji glyph-based icon wrappers in `public/svgs/palette-themes/emoji/` with Microsoft Fluent `Color` SVG assets, keeping existing local filenames and theme routing intact:
- `icon_wood.svg` <- `assets/Wood/Color/wood_color.svg`
- `icon_brick.svg` <- `assets/Brick/Color/brick_color.svg`
- `icon_sheep.svg` <- `assets/Ewe/Color/ewe_color.svg`
- `icon_wheat.svg` <- `assets/Sheaf of rice/Color/sheaf_of_rice_color.svg`
- `icon_ore.svg` <- `assets/Rock/Color/rock_color.svg`
- `icon_desert.svg` <- `assets/Cactus/Color/cactus_color.svg`
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji desert tone tuning - lighter midpoint)
- Tuned `public/svgs/palette-themes/emoji/tile_desert.svg` to a lighter midpoint between the original bright version and the first dim pass.
- Adjusted border/fill/inner-stroke gradient stops upward and reduced vignette strength (`0.04→0.02` center, `0.24→0.20` edge) to keep the desert subdued but less heavy.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji desert icon routing + SVG dim pass)
- Removed desert cactus marker from tile art and switched to the same overlay icon model used by other tiles:
- Added `public/svgs/palette-themes/emoji/icon_desert.svg` (`🌵`).
- Updated `app/catana/theme/themes.js` so `getResourceIconPath("emoji", "Desert")` returns `/svgs/palette-themes/emoji/icon_desert.svg`, while non-emoji themes still return no desert icon.
- Applied a dimmer desert palette directly in `public/svgs/palette-themes/emoji/tile_desert.svg` (darker/muted gradient stops + stronger vignette) for a permanent subdued desert look.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji desert cactus icon)
- Added cactus emoji icon directly into emoji desert tile art:
- `public/svgs/palette-themes/emoji/tile_desert.svg`
- Desert icon is now part of the SVG (top-centered `🌵`) so it follows the same emoji-theme visual style without changing shared resource-icon path logic.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji desert tile styled + wired)
- Added emoji-specific desert tile override in `app/catana/theme/themes.js`:
- `"tile_desert.svg": "/svgs/palette-themes/emoji/tile_desert.svg"`
- Added new rounded-corner desert tile asset in the same visual language as the edited emoji resource tiles:
- `public/svgs/palette-themes/emoji/tile_desert.svg`
- Desert tile now uses the same inner rounded hex geometry + gradient/stroke/vignette layering approach as the updated emoji tile set.
- Extended `app/catana/__tests__/themeAssets.test.js` to assert `emoji` resolves `tile_desert.svg` through the emoji theme folder.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji rounded-tiles geometry pass 2)
- Reworked emoji rounded tile composition to restore a full tile footprint and reduce “squished” appearance on board.
- Each emoji resource tile now uses:
- a full-size rounded outer hex (border shell close to original tile extents), and
- an inset rounded inner hex (resource fill area) with highlight/vignette overlays.
- Updated files:
- `public/svgs/palette-themes/emoji/tile_brick.svg`
- `public/svgs/palette-themes/emoji/tile_lumber.svg`
- `public/svgs/palette-themes/emoji/tile_wool.svg`
- `public/svgs/palette-themes/emoji/tile_grain.svg`
- `public/svgs/palette-themes/emoji/tile_ore.svg`
- Kept emoji theme fallback behavior from prior fix (`disableBackgroundFallback`) so classic tiles do not bleed through transparent corners.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji rounded-tiles bleed fix + geometry retune)
- Fixed emoji tile rendering bleed-through by disabling layered classic background fallback for the `emoji` theme in `app/catana/theme/themes.js` (`disableBackgroundFallback: true`).
- Root cause was tile background layering (`url(themed), url(classic)`): transparent regions in rounded emoji tiles exposed classic sharp-corner tile art beneath.
- Retuned rounded geometry in all emoji resource tile SVGs to use a fuller board footprint (closer to native tile bounds) while preserving rounded corners:
- `public/svgs/palette-themes/emoji/tile_brick.svg`
- `public/svgs/palette-themes/emoji/tile_lumber.svg`
- `public/svgs/palette-themes/emoji/tile_wool.svg`
- `public/svgs/palette-themes/emoji/tile_grain.svg`
- `public/svgs/palette-themes/emoji/tile_ore.svg`
- Added assertion in `app/catana/__tests__/themeAssets.test.js` that `getBackgroundImageWithFallback("emoji", "tile_ore.svg")` resolves to a single emoji tile URL (no classic layered fallback).
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji theme rounded tile geometry)
- Updated `emoji` theme tile mapping in `app/catana/theme/themes.js` to use emoji-local tile assets instead of Palette B tile files:
- `tile_ore.svg`, `tile_grain.svg`, `tile_wool.svg`, `tile_lumber.svg`, `tile_brick.svg` now resolve to `/svgs/palette-themes/emoji/*`.
- Added rounded-corner tile SVGs for all resource tiles in:
- `public/svgs/palette-themes/emoji/tile_brick.svg`
- `public/svgs/palette-themes/emoji/tile_lumber.svg`
- `public/svgs/palette-themes/emoji/tile_wool.svg`
- `public/svgs/palette-themes/emoji/tile_grain.svg`
- `public/svgs/palette-themes/emoji/tile_ore.svg`
- Each tile keeps the existing theme contract (`346x400` tile artboard) and uses resource-specific fill/border gradients with rounded-corner hex geometry.
- Updated test coverage in `app/catana/__tests__/themeAssets.test.js` to assert emoji tile overrides are used.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-04, emoji theme variant)
- Added a new `emoji` Catana theme in `app/catana/theme/themes.js`.
- `emoji` reuses Palette B tile assets (`option-b`) and only overrides resource icons to:
- `public/svgs/palette-themes/emoji/icon_wood.svg`
- `public/svgs/palette-themes/emoji/icon_brick.svg`
- `public/svgs/palette-themes/emoji/icon_sheep.svg`
- `public/svgs/palette-themes/emoji/icon_wheat.svg`
- `public/svgs/palette-themes/emoji/icon_ore.svg`
- Emoji icons are SVG wrappers containing centered emoji glyphs, so all existing icon consumers (tile overlay, resource bar, game log, trade/discard UI, etc.) continue to work without component-level logic changes.
- Expanded theme asset coverage in `app/catana/__tests__/themeAssets.test.js` to assert emoji theme registration and path resolution contract.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-04, log metadata + identity/color utilities refactor)
- Added shared player identity helper `app/catana/utils/playerIdentity.js` with `sanitizeDisplayName(...)` and reused it across:
- `app/catana/GameScreen.js`
- `app/catana/lobby/LobbyPageClient.js`
- `app/catana/lobby/[matchID]/MatchPageClient.js`
- Added shared player color helper `app/catana/theme/playerColors.js` (`PLAYER_COLOR_OPTIONS`, `getPlayerColorOption`, `getPlayerNameHex`) and reused it across:
- `app/catana/lobby/LobbyPageClient.js`
- `app/catana/components/PlayerAvatarStats.js`
- `app/catana/components/GameLogPanel.js`
- Updated `GameScreen` log metadata assembly to use a stable `seatColorMap` fallback (from seat order) instead of `playerViewMap[id]?.color`, reducing avoidable log-token churn.
- Memoized the log component export with `React.memo` in `app/catana/components/GameLogPanel.js`.
- Existing `[BOT]` prefixes are now sanitized at render time in lobby/match seat labels and in-game name mapping, while newer bots keep clean `Puffer` names from join payloads.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/playerIdentity.test.js app/catana/__tests__/playerColors.test.js`
- `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/MatchPageClient.botFill.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/uiNoDragImages.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/gameText.test.js`

## Status (2026-03-04, bot display-name cleanup)
- Removed the `[BOT]` name prefix in lobby bot join payloads so bot names are cleaner now that emoji-based identity is visible in log/UI.
- Updated:
- `app/catana/lobby/LobbyPageClient.js`
- `app/catana/lobby/[matchID]/MatchPageClient.js`
- Bot names now render as `Puffer <seat>` instead of `[BOT] Puffer <seat>`.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/MatchPageClient.botFill.test.js`

## Status (2026-03-04, game log player avatar + color metadata)
- Updated game-log player token formatting to support player metadata objects (`name`, `emoji`, `color`) in `app/catana/utils/gameText.js` while keeping backward compatibility with plain string name maps.
- Wired `GameScreen` to build and pass `playerMap` into `GameLogPanel`, combining:
- player names from match metadata,
- avatar emoji from match metadata,
- chosen lobby colors from match metadata (`player.data.color`), with seat-color fallback only when missing.
- Updated `GameLogPanel` player rendering to show `{emoji} {name}` and tint the name to the player's chosen avatar color.
- Expanded log tint support for all lobby color IDs (`red`, `blue`, `green`, `orange`, `purple`, `pink`, `cyan`, `amber`).
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/gameText.test.js`
- `pnpm exec vitest run app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/uiNoDragImages.test.js`
- `pnpm exec vitest run app/catana/__tests__/renderPerfGuards.test.js`

## Status (2026-03-04, game log resource icons as full cards)
- Updated game-log resource formatting so resource counts expand into full per-card icon tokens (no `2x` labels and no comma separators).
- This applies across all log events that use resource maps, including `discard`, `resource:gain`, and `trade:maritime`.
- Updated `app/catana/components/GameLogPanel.js` to render resource tokens as icons only (with resource `title` for hover context).
- Added test coverage updates in `app/catana/__tests__/gameText.test.js` to assert icon-per-card token expansion and comma removal.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/gameText.test.js`
- `pnpm exec vitest run app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/uiNoDragImages.test.js`
- Note: `pnpm exec vitest run app/catana/__tests__/Moves.gameLog.test.js` currently fails in this workspace from an unrelated expectation drift (`robber:skip` extra entry).

## Status (2026-03-02, robber no-valid-tile skip flow)
- Added a guarded robber fallback in `app/catana/Moves.js` so when there are zero legal robber tiles, gameplay does not stall.
- New helper flow now logs `robber:skip`, keeps robber position unchanged, and advances to the correct return stage (`preRoll` or `postRoll`) as if robber resolution completed.
- Wired the skip path into all robber entry points:
- `rollDice` when a 7 enters robber flow with no candidates,
- `discardResources` when pending discards finish into robber flow,
- `playDevCardStart` for knight-triggered robber flow,
- `autoMoveRobber` timeout fallback when no candidate tile exists.
- Added log text support in `app/catana/utils/gameText.js` for `robber:skip` ("had no valid tile for robber movement").
- Added/updated coverage in:
- `app/catana/__tests__/Moves.robber.test.js` (7-roll skip path + auto-timeout skip path),
- `app/catana/__tests__/Moves.devCards.test.js` (knight-triggered skip path + existing moveRobber path with legal tiles),
- `app/catana/__tests__/gameText.test.js` (`robber:skip` formatting).
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/gameText.test.js`

## Status (2026-03-02, game log timeout copy cleanup)
- Updated game-log text rendering in `app/catana/utils/gameText.js` to hide all internal `forced:*` marker entries from the UI.
- Forced player actions now render with ` (timeout)` instead of ` (auto)` (for example: `Player placed a settlement (timeout)`).
- This keeps bot usernames/actions unchanged in normal play while making timeout-forced moves explicit and readable.
- Added/updated coverage in `app/catana/__tests__/gameText.test.js` for:
- hiding all `forced:*` entry types,
- preserving no timeout suffix for roll/resource gain,
- adding timeout suffix for forced player actions.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/gameText.test.js`
- `pnpm exec vitest run app/catana/__tests__/Moves.gameLog.test.js`

## Status (2026-03-02, Option B icon normalization pass)
- Normalized the active Option B resource icon assets to a shared canonical artboard (`256x256`, `viewBox="0 0 256 256"`):
- `public/svgs/palette-themes/option-b/icon_wood.svg`
- `public/svgs/palette-themes/option-b/icon_brick.svg`
- `public/svgs/palette-themes/option-b/icon_sheep.svg`
- `public/svgs/palette-themes/option-b/icon_wheat.svg`
- `public/svgs/palette-themes/option-b/icon_ore.svg`
- Each icon now uses an explicit normalization transform (`<g id="icon-artwork" transform="...">`) so rendering comes from one consistent coordinate contract instead of mixed source viewBoxes.
- Re-tuned tile icon placement in `app/catana/Tile.js` for normalized assets:
- `TILE_ICON_TOP_FACTOR` `0.186`,
- `TILE_ICON_SCALE` `0.58`,
- retained only small per-resource optical deltas in `TILE_ICON_SCALE_BY_RESOURCE` and `TILE_ICON_TOP_NUDGE_BY_RESOURCE`.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/uiNoDragImages.test.js`

## Status (2026-02-23, road blocking at opponent intersections)
- Fixed normal-play road legality in `game-core/src/rules/buildability.ts`.
- `buildableEdges(...)` now excludes road-endpoint nodes occupied by opponent settlements/cities when deriving expansion candidates.
- This enforces the Catan rule that roads cannot be extended through an opponent-owned intersection.
- Added regression coverage in `game-core/src/rules/buildability.test.ts`:
- `does not allow extending a road through an opponent settlement`.
- Verified with:
- `pnpm -C game-core test -- src/rules/buildability.test.ts`
- `pnpm -C game-core test`

## Status (2026-02-23, canonical resource icon template)
- Added a canonical square resource icon template at `public/svgs/concepts/resource_icon_template_256.svg`.
- Template establishes the shared icon contract:
- `256x256` artboard with root `viewBox="0 0 256 256"`,
- centered crosshair/anchor guides,
- `192x192` safe area for visible art,
- optional tile top-band guide for in-tile readability checks.
- Added design spec at `docs/plans/2026-02-23-resource-icon-canonical-template-spec.md` with migration strategy (keep current nudges until all icons are normalized, then collapse to shared tile icon positioning).

## Status (2026-02-23, icon scale normalization pass)
- Added per-resource tile icon scale tuning in `app/catana/Tile.js` (`TILE_ICON_SCALE_BY_RESOURCE`) to account for different icon viewBox/aspect ratios.
- Applied smaller in-tile icon scales for wood/wheat (`Wood 0.56`, `Wheat 0.54`) while keeping others at `0.62`.
- Shifted all tile icons slightly lower again (`TILE_ICON_TOP_FACTOR 0.165`) with updated per-resource downward nudges (sheep still lowest).
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-23, per-resource tile icon nudge)
- Further adjusted tile icon overlay placement in `app/catana/Tile.js` by introducing per-resource vertical nudges:
- global top factor raised to `0.155`,
- per-resource offsets via `TILE_ICON_TOP_NUDGE_BY_RESOURCE`,
- sheep intentionally pushed lower than wood/tree (`Sheep: +0.03`, `Wood: +0.00`).
- Kept shared icon scale at `0.62` and preserved theme-aware icon fallback behavior.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-23, tile icon alignment tuning)
- Adjusted in-tile resource icon overlay sizing/placement in `app/catana/Tile.js` to better match classic embedded icon composition:
- icon scale reduced from `0.72 * size` to `0.62 * size`,
- icon top offset moved from `0.10 * size` to `0.14 * size`.
- Added named constants (`TILE_ICON_TOP_FACTOR`, `TILE_ICON_SCALE`) for quick visual iteration.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-23, palette-b focus + tile icons)
- Simplified in-game theme options in `app/catana/theme/themes.js` to `Classic` + `Palette B` (removed other palette variants and removed `custom` from the theme registry).
- Kept palette overrides focused on `option-b` and expanded `palette-b` overrides to include shared resource icons:
- `icon_wood.svg`, `icon_brick.svg`, `icon_sheep.svg`, `icon_wheat.svg`, `icon_ore.svg`.
- Copied current canonical icon SVGs into `public/svgs/palette-themes/option-b/` so Palette B now owns an editable icon set without breaking Classic.
- Added tile-level resource icon overlay in `app/catana/Tile.js` (theme-aware icon path + classic fallback), positioned near top-center of the hex so tile art and shared icon language stay aligned.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-22, oreDirectional defaults synced)
- Replaced the temporary subtle-flat bake and synchronized all in-game palette SVG sets to the saved gradient-lab defaults from `resource-palette-preview.html`:
- preset `Ore Directional`,
- body depth `170%`,
- ring depth `72%`,
- ring direction `Vertical (dark bottom)`,
- edge shadow lift `12%`,
- stripes `off`.
- Applied this profile across all palette folders under `public/svgs/palette-themes/` (`option-a`, `option-b`, `option-c`, `option-d`, `option-c-rich`, `option-d-rich`) while preserving each tile's base/highlight/shadow/ink colors.
- Profile parity matches the preview math, including ring-shadow color lift and separator-shadow softening/opacity derived from `edge shadow lift`.

## Status (2026-02-22, resource distribution zoom size normalization)
- Updated resource-card distribution sizing to respect board zoom at spawn and normalize during travel in `app/catana/effects/resourceDistribution.js`.
- Card pop/settle scale now multiplies by current board viewport scale, preserving tile-relative size at origin.
- Travel animation now interpolates scale back to HUD baseline (`scale: 1`) so cards land at a consistent UI size.
- Added focused coverage in `app/catana/__tests__/effects/resourceDistribution.test.js` for board-space scaling + HUD normalization.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
- `pnpm exec vitest run app/catana/__tests__/effects`

## Status (2026-02-22, resource distribution zoom spawn fix)
- Fixed resource-card distribution spawn origin under board zoom in `app/catana/effects/resourceDistribution.js`.
- Root cause was mixed coordinate spaces: tile positions were board-local while board origin used viewport coordinates (`getBoundingClientRect`) without applying current zoom scale.
- Added explicit viewport-scale conversion (`getBoardViewportScale`) and zoom-aware tile start mapping (`getTileCardStartPosition`) before GSAP spawn.
- Added focused unit coverage in `app/catana/__tests__/effects/resourceDistribution.test.js` for scaled start-position math.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
- `pnpm exec vitest run app/catana/__tests__/effects`

## Status (2026-02-22, subtle-flat pass)
- Converted all in-game palette tile SVG sets under `public/svgs/palette-themes/` to the `Subtle Flat` gradient profile (including rich variants) to reduce glossy/washed-out ring behavior.
- Applied subtle-flat geometry/stops consistently for body and ring gradients:
- body lift: lighter, flatter radial (`cx 158, cy 130, r 224`; `0.2 -> 0.08 -> 0`)
- body shade: restrained depth (`cx 182, cy 244, r 244`; `0 -> 0.08 -> 0.18`)
- ring gradients: simple vertical highlight-to-shadow ramps (removed mid-ring extra highlight stop)
- Verified there is no board-wide saturation/brightness CSS filter affecting all tiles; tile-level filter in `app/catana/Tile.js` only applies during robber hover/placement states.
- Verified theme wiring/tests remain green:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-22, rich variants)
- Added richer in-game palette variants to the dev `Theme` selector: `Palette C Rich` (`palette-c-rich`) and `Palette D Rich` (`palette-d-rich`).
- Added tile-only override asset sets at:
- `public/svgs/palette-themes/option-c-rich/`
- `public/svgs/palette-themes/option-d-rich/`
- Rich variants are tuned to reduce washout by lowering highlight opacity and increasing shadow/vignette depth while preserving the same hue families.
- Updated `app/catana/theme/themes.js` theme registry with the two new IDs and override mappings.
- Extended `app/catana/__tests__/themeAssets.test.js` for new theme registration, ID resolution, and rich-variant path mapping.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-22)
- Added in-game palette theme options to the dev `Theme` selector via `app/catana/theme/themes.js`: `Palette C`, `Palette B`, `Palette A`, `Palette D` (theme IDs: `palette-c`, `palette-b`, `palette-a`, `palette-d`).
- Kept non-tile assets on classic paths for these palettes and added per-file tile overrides for:
- `tile_ore.svg`, `tile_grain.svg`, `tile_wool.svg`, `tile_lumber.svg`, `tile_brick.svg`,
- mapped to `public/svgs/palette-themes/option-{c,b,a,d}/...`.
- This avoids breakage for assets that do not exist in palette folders (e.g. robber/building icons) while still swapping resource tile art on-board.
- Extended theme asset tests in `app/catana/__tests__/themeAssets.test.js` to cover:
- palette theme registration,
- tile override path resolution,
- non-overridden asset fallback to classic base paths.
- Verified with targeted test runs:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js`
- `pnpm exec vitest run app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-20)
- Disabled debug UI surfaces on gameplay screens:
- Removed `DebugPanel` render/import from `app/catana/GameScreen.js`.
- Set `debug: false` on boardgame.io clients in `app/catana/page.js` and `app/catana/lobby/[matchID]/MatchPageClient.js` to suppress the built-in debug overlay.
- Added coverage in `app/catana/__tests__/DebugUiVisibility.test.js`.
- Added subtle game-log feed motion polish in `app/catana/components/GameLogPanel.js` and `app/globals.css`.
- New log rows now get a short fade/slide-in via `game-log-entry` so incoming events feel more alive without heavy animation.
- Added a top-edge fade mask (`game-log-fade`) on the scroll region so older entries soften as they move out of focus.
- Updated log autoscroll to use smooth scrolling when motion is allowed and preserve instant scrolling for reduced-motion users.
- Added test coverage in `app/catana/__tests__/GameLogPanel.test.js` for the new feed animation hooks.

## Status (2026-02-16)
- Added a dev-only in-game `Theme` dropdown in `app/catana/GameScreen.js` that switches visual assets live without refreshing.
- Added lightweight theme infrastructure at `app/catana/theme/themes.js`:
- `classic` theme base: `/svgs`
- `custom` theme base: `/svgs-custom`
- helper APIs for asset path resolution + fallback
- localStorage persistence key `catana:themeId`
- Wired `themeId` through board/HUD rendering paths so these update live:
- tiles (`Tile.js`)
- ports (`Port.js`)
- robber icon (`Tile.js`)
- settlements/cities/roads (`Node.js`, `Edge.js`, `ActionNode.js`, `Piece.js`)
- resource icons (`PlayerActionContainer.js`, `TradeDiscardModal.js`, `GameLogPanel.js`, `resourceDistribution.js`, `DebugPanel.js`, `Card.js`)
- Updated placement effect visuals (`app/catana/effects/placePiece.js`) to use current theme assets for settlement/city/road animation overlays.
- Added focused tests:
- `app/catana/__tests__/themeAssets.test.js` (theme helper behavior)
- `app/catana/__tests__/GameScreen.themeSwitcher.test.js` (dev switcher wiring/persistence hooks)
- Updated `app/catana/__tests__/uiNoDragImages.test.js` for new resource-icon path helper usage.

## Status (2026-02-15)
- Added a Next dev route for palette iteration at `app/catana/dev/palette-preview/page.js` (URL: `/catana/dev/palette-preview`).
- Route is development-only and calls `notFound()` outside development mode.
- Added `app/catana/dev/palette-preview/PaletteBoardPreviewClient.js` with:
- palette selector (`Option C`/`Option D`),
- global number-token toggle,
- selected-resource-row preview,
- full board preview (3-4-5-4-3 / 19 hexes).
- Updated token rendering in this route to use board-editor parity math (same chip sizing and offset rules as `app/board-editor/Tile.js`) so board-context reads match in-game sizing better.
- Fixed layout regression on this route by hard-constraining SVG tiles to parent bounds (`width/height: 100%` + explicit board tile dimensions) and replacing var-driven grid sizing with a stable flex row layout to prevent giant/overlapping tiles.
- Adjusted token vertical placement for this route's overlay context: replaced large margin-based shift with a small transform offset so number chips render on the tile face instead of below tiles.
- Fine-tuned token placement again by nudging the overlay upward (`translateY(size * -0.04)`) so chips sit closer to the visual center of the tile face.
- Fixed root cause of off-tile token rendering in some browsers by anchoring the token overlay with explicit bounds (`top/right/bottom/left: 0`, `width/height: 100%`) and resetting token transform to neutral.
- Fixed remaining token-below-tile bug by moving tile frame/svg/token overlay layout from parent `styled-jsx` selectors into inline styles in `TileFrame` (child component), avoiding scoped-style boundary issues across component boundaries.
- Updated token sizing/placement model in the dev palette route to match in-game behavior:
- token `size` now auto-derives from each tile's rendered height (`height / 2`) via `ResizeObserver` in `TileFrame`,
- token vertical placement uses the same in-game offset math (`marginTop: size / 1.66`),
- this naturally makes top-row chips larger/lower than board-preview chips when tile sizes differ.
- Retuned wheat palette in `/catana/dev/palette-preview` to a cleaner amber ramp inspired by the provided reference:
- `base #fbbf24` (amber-400),
- `highlight #fcd34d` (amber-300),
- `shadow #f59e0b` (amber-500),
- applied consistently to both Option C and Option D while leaving gradient structure unchanged.
- Second wheat brightness pass to better match the bright top reference look (while still no special-case sheen):
- `base #fbbf24` (unchanged),
- `highlight #fde68a` (lighter top pop),
- `shadow #eab308` (less brown/dark than prior orange shadow),
- applied to both Option C and Option D.
- Reintroduced pre-SVG wheat baselines as selectable options in `/catana/dev/palette-preview`:
- `Option A` = legacy pre-SVG C (`#f4bd1f / #ffe682 / #a85500`),
- `Option B` = legacy pre-SVG D (`#ffd43b / #ffed8e / #c26a06`),
- `Option C` = current lighter wheat experiment (`#fbbf24 / #fde68a / #eab308`).
- Updated palette selector and helper copy to A/B/C and defaulted selection to Option C for ongoing wheat tuning.
- Retuned Option C wheat again because A vs C still read too similar in the tile body:
- moved to a stronger bright-gold body set (`base #fcd34d`, `highlight #fef08a`, `shadow #f59e0b`) and warmer vignette tint (`ink #b45309`) so the center/base reads visibly lighter, not only the ring.
- Slightly increased Option C filter to `saturate(1.2) contrast(1.05)` for clearer separation against A.
- Applied the same updated Option C bright-gold wheat set to `public/svgs/concepts/resource-palette-preview.html`:
- Option C wheat now matches the dev-route values (`#fcd34d`, `#fef08a`, `#f59e0b`, `ink #b45309`) with `tileFilter` aligned to `saturate(1.2) contrast(1.05)` for parity while iterating ring highlight/seam controls.
- Applied the same wheat set to rows A, D, and E in `public/svgs/concepts/resource-palette-preview.html` and restored row B.
- Current row order on that page is now `Option C`, `Option B`, `Option A`, `Option D`, `Option E`.
- Applied the same bright-gold wheat set to row B as well, so all rendered rows (C/B/A/D/E) now share wheat colors while ring/seam tuning is compared.
- Saved new default gradient-lab preset values in `public/svgs/concepts/resource-palette-preview.html`:
- style `Ore Directional`,
- body depth `170%`,
- ring depth `72%`,
- ring direction `Vertical (dark bottom)`,
- edge shadow lift `12%`,
- stripes `off`.
- Kept wheat locked for cross-row ring/highlight comparison and updated the lock-note copy to reflect all current rows (`A/B/C/D/E`).
- Updated `/catana/dev/palette-preview` dropdown to include all five palette rows for parity with the HTML concept page:
- options now `C, B, A, D, E` (in that order),
- row palettes mirror the current concept-page set, including shared bright-gold wheat across rows,
- Option E note clarifies that accessibility pattern overlays are not rendered in this board-preview route.

## Status (2026-02-14)
- Added RL experiment tooling for blog/eval reporting:
- `ai/pufferlib/python/settlex_puffer/eval_curve.py` evaluates all `model_*.pt` checkpoints in a run directory and appends seeded win-rate summaries to CSV (supports resume and `--watch` polling mode).
- `ai/pufferlib/python/settlex_puffer/plot_curve.py` plots one or more eval-curve CSVs to PNG (with optional CI band).
- Added package entrypoints in `ai/pufferlib/python/pyproject.toml`:
- `settlex-puffer-eval-curve`, `settlex-puffer-plot-curve`.
- Updated `ai/pufferlib/README.md` with commands for collecting and plotting checkpoint performance curves for blog posts.
- Added a shared 4-part roadmap doc for synchronized blog + engineering planning:
- `docs/plans/2026-02-14-puffer-4-part-roadmap.md`.
- Linked the roadmap from `ai/pufferlib/README.md` under Writeups.
- Added v3 planning capture doc focused on imitation-learning warm start:
- `ai/pufferlib/writeup-v3-notes.md` (timing decision, data-size estimates in games/actions, opening-only ROI, risks, open questions, and candidate experiment recipe).
- Updated roadmap sequencing so v3 is imitation/sample-efficiency and v4 combines performance + scale.
- Linked v3 notes from `ai/pufferlib/README.md`.
- Added Intel-mac torch compatibility shim in `ai/pufferlib/python/settlex_puffer/train.py`:
- if `torch.uint64` is missing (observed on older x86 macOS wheels), alias it to `torch.int64` before importing PufferLib, preventing startup crash in `pufferlib.pytorch`.

## Status (2026-02-13)
- Added `public/svgs/concepts/resource-palette-preview.html` to visually compare resource color palette options using classic seam-strong tile geometry.
- Preview now renders five rows, including new `Slate Ore / Split Greens` and `Accessibility Patterns` options in addition to the existing pop variants.
- Added row-level SVG vibrance controls (`saturate`/`contrast`) for the pop-focused options so saturation differences are visibly stronger in side-by-side review.
- Refined tile body shading to match the flatter `tile_ore.svg` feel: body now renders as a flat base color with very low-opacity radial lift/shade overlays instead of a strong radial ramp.
- Added an interactive gradient lab in the preview page with style presets (`Subtle Flat`, `Ore Directional`, `Striped Mid Band`) plus sliders for body depth, ring depth, and stripe strength.
- Added ring-gradient experimentation controls (`Ring Direction` and `Edge Shadow Lift`) so the darkest lower edge can be softened and gradient direction can be flipped/rotated away from simple bottom-dark shading.
- Set gradient lab defaults to `Ore Directional` with `Body Depth 100%`, `Ring Depth 100%`, `Ring Direction Diagonal TR->BL`, `Edge Shadow Lift 62%`, and stripes disabled.
- Retuned the new bright-wheat row to avoid washout by replacing near-white wheat highlights with more saturated yellow-gold stops.
- Removed the wheat-only sheen treatment and switched back to pure color tuning only, per feedback to avoid special-case rendering.
- Tuned Option B wheat to be brighter without washout (`base #ffd43b`, `highlight #ffed8e`) and softened the dark read by lifting shadow (`#c26a06`) and reducing row contrast (`1.05`).
- Added data-driven resource pattern overlays (6-10% opacity) for accessibility experiments: ore speckle/facets, wheat grain lines, sheep dots, lumber vertical lines, and brick staggered rectangles.
- Added an interactive wheat color tuner for Option D/E: base color picker plus auto-derived highlight/shadow via sliders (highlight lift, shadow drop, saturation shift, hue nudge).
- Added `public/svgs/concepts/resource-palette-board-preview.html` as a focused C/D palette preview page with a dropdown selector and a `Show number tokens` checkbox.
- Added a full 19-hex board preview to the new page (3-4-5-4-3 rows) so palette changes can be judged in board context, not only per-resource tiles.
- Updated that page's number token rendering to match `app/board-editor/Tile.js` proportions/offset behavior (rounded square chip, size ratio, and pip layout) instead of the earlier circular placeholder.
- Fixed token scale on the board preview by switching to a viewBox-based SVG token overlay so number/pip sizing stays visually consistent with tile scaling.
- Kept the outer tile border fixed at `#fbbf24` across all previews and varied only inner gradients/seam separators to match the requested comparison constraints.

## Status (2026-02-13)
- Added `public/svgs/concepts/tile_lumber_final.svg` as a new forest/lumber concept tile matching the `tile_ore_final.svg` hex geometry and cream border style.
- Built the inner art from layered green triangular facets to mirror the provided mountain-forest reference image.
- Added `public/svgs/concepts/tile_template.svg` as a first-pass canonical tile template (`346x400` viewBox) with a hard-edge border, shared inner hex clip, and replaceable layered facet placeholders for resource-specific variants.

## Status (2026-02-12)
- Added smooth width transitions for opponent resource/dev card stacks in `app/catana/components/OpponentPlayerBox.js` to prevent jumpy growth when counts change.
- Added regression coverage in `app/catana/__tests__/OpponentPlayerBox.test.js` to lock the transition class usage.

## Status (2026-02-12)
- Added game-log award events for Longest Road and Largest Army ownership changes in `app/catana/Moves.js`.
- Added log text formatting for `award:longestRoad` and `award:largestArmy` in `app/catana/utils/gameText.js`.
- Added/updated app tests for award log wiring and text formatting.
- Checked off the completed double-click zoom toggle item in `TODOS.txt`.

## Status (2026-02-12)
- Added `doubleClick` toggle mode support in the local `react-zoom-pan-pinch` copy so double-click can zoom in from base scale and reset back to initial scale when already zoomed in.
- Enabled `doubleClick={{ mode: "toggle" }}` on Catana `GameScreen` and board-editor `TransformWrapper` instances.
- Added unit coverage for the new mode resolver in `react-zoom-pan-pinch/core/double-click/double-click.logic.test.ts`.

## Status (2026-01-08)
- Phase 0: added AI harness files (`AGENTS.md`, `game-core/AGENTS.md`, `docs/agent/*`).
- Phase 1: created pnpm workspace + `game-core` scaffold, added Vitest config, and moved core types/spec/board generation into `game-core`.
- Fixed Next import/export issue for `@settlex/game-core`, removed duplicate `PlayerColor` export, and updated board generation RNG to use boardgame.io `random.Number()`; `/catana` now renders.
- Added deterministic RNG helper and board-generation invariant tests in `game-core`.
- Added core topology/state scaffolding and buildability rule tests (setup + normal placement).
- Migrated placement moves to core `GameState`.
- Updated `Board.js` to render settlements/roads/actions from core state via render maps (no `G.nodes`/`G.edges`).
- Added trading rules to `game-core` (maritime + player trades), including port eligibility and trade-rate enforcement.
- Added victory/awards helpers in `game-core` (Longest Road, Largest Army, VP calculation) with tests and recompute hooks.
- Added ruleset specs/factory and minimal validation enforced in `createEmptyState`.
- Added a board preset resolver (`standard-random`) and switched UI setup to use random board generation with a stored `boardPresetId`.
- Migrated UI to read from `G.core` (player views, roads/settlements, build actions) and routed moves through core rules for a minimal playable loop.

## Next
- Expand `game-core` tests beyond buildability (robber, resource distribution, longest road).
- Clean up legacy duplicates in `app/catana/game`, `spec/`, `strategy/`, `utils/`.
- Address React list key warnings in `app/catana/Board.js`.
- Add discard/robber-steal UI to avoid stalling when 7s require discards.

## Notes
- Keep Next as the UI shell; multiplayer runs in the separate boardgame.io server.

## Status (2026-01-09)
- Added `applyEndTurn` core logic in `game-core/src/rules/turnFlow.ts` with coverage for turn resets and guardrails.
- Wired `endTurn` move in `app/catana/Moves.js` to `applyEndTurn` and synced boardgame.io turn order.
- Added app-level Vitest config (`vitest.config.ts`) and tests for end-turn wiring plus robber flow stage transitions.
- Updated `rollDice` to send 7s to `moveRobber` stage; `moveRobber` now advances the core turn phase back to post-roll.

## Status (2026-01-12)
- Polished the dev-card UI container to match the bottom bar (sizing, spacing, and grouping order), with a pop-in animation and smooth width changes as cards are added.
- Tweaked dev-card spacing/alignment and anchored the dice/end-turn controls to the bottom-right.
- Adjusted right-side padding for the dice/end-turn stack and added VP card stacking with count badges.
- Added a future-notes doc for dev-card box UX experiments and open questions.
- Smoothed action-dock enable transitions by keeping DockCard animated state consistent on enable/disable.
- Enabled dev-card play UI: clickable playable cards with active/disabled styling and stage gating.
- Reused the trade/discard modal for Year of Plenty and Monopoly selection flows with confirm/cancel wiring.
- Added future testing notes for dev-card play UI coverage in `docs/future_plans/dev-card-play-tests.md`.
- Added a design doc for cancelling normal build actions via outside clicks.
- Added resource-bar click shortcut to open maritime trade with a preselected give resource when tradable.
- Added a UI helper + test to compute per-resource maritime trade eligibility for quick-open.
- Fixed quick-trade modal open handler scope and gated resource cursor to tradable resources only.
- Added a design doc for core-owned game-end handling (immediate win on active player threshold in normal phase).
- Added core game-over state and win checks; main phase now ends when `G.core.gameOver` is set.
- Implemented outside-click cancellation for normal build actions with action-circle hit testing and UI wiring/tests.

## Status (2026-01-13)
- Added a shared `CardStack` helper/component with tests and reused it in the dev-card display.
- Extracted `PlayerAvatarStats` with a VP display helper and preserved local hand counts.
- Added `OpponentPlayerBox` with resource/dev card-back stacks and hooked it up in `GameScreen`.
- Logged design + plan docs for the opponent player box UI.
- Added a max-width cap for card stacks (default 90px) so piles tighten spacing as counts grow.
- Updated opponent stacks to render all card backs (no maxVisible limit) while still capping width.
- Highlighted opponent resource badge in red when over discard limit.
- Nudged opponent bar down to avoid VP clipping and centered the avatar+action dock pill.
- Fixed bottom action dock container positioning by moving the centering wrapper under a fixed parent.
- Softened the opponent discard-limit badge styling to match the player warning tone.
- Moved player hand counts out of the avatar stats and into resource/dev-card badges.
- Hid player hand badges behind a local flag and switched badge placement to the outside corner.
- Disabled text selection/context menus on the main game UI with an opt-in attribute for log/chat/status.

## Status (2026-01-14)
- Fixed dev-card play gating so older copies remain playable after buying another copy in the same turn.
- Added game-core test coverage for mixed-age dev cards of the same type.
- Added core helper for playable dev-card counts and updated the UI to enable only that many copies per type.
- Added a future-plan note on a potential player-view model and a small UI test to guard dev-card gating.
- Added fixed dev-card ordering with stacked per-type rendering and a small grouping helper/test.
- Switched dev-card disabled styling to a non-transparent filter and added configurable badge thresholds for stacks.
- Added a Space-bar shortcut on the main game screen to roll or end turn when eligible, with UI gating synced to core/ctx checks.
- Logged a server-enforced turn-timer design doc with stage timers and auto-move handling.
- Added server-side TimerManager + pubSub hook for turn/stage timers and turn-time bonuses.
- Added auto-timeout moves (auto roll/place/discard/robber/etc.) and wired them into stage move lists.
- Extended server stage timers to cover placement, robber movement, and road-building dev card flow.
- Switched the game server to native ESM (local `type: module`) and updated `pnpm serve` to drop the `esm` loader.
- Updated server imports to use `boardgame.io/dist/cjs/*` so Node ESM can resolve them without directory imports.
- Updated the Catana game config to import `boardgame.io` core from `dist/cjs` for Node ESM compatibility.
- Updated Catana effects plugin import to the explicit `bgio-effects/dist/plugin.js` entry for Node ESM resolution.
- Removed the stale `initialiseGraph` import from `app/catana/Game.js` to satisfy ESM named export checks.
- Replaced `react-hexgrid` usage in core board utils with an internal hexagon generator to keep server-side ESM compatible, and fixed the `jsnetworkx` default import; `pnpm serve` now runs without experimental flags.
- Added a local Next image wrapper for Catana UI components to normalize default imports under ESM.

## Status (2026-01-15)
- Added a server timer snapshot endpoint and a bottom-right UI countdown pill.
- Timer snapshots now attach to state updates; the UI uses them with a one-time seed fetch for initial sync.
- Added a preGame phase with ready-up + 15s auto-start before placement begins.
- TimerManager now handles the preGame stage and delays post-roll timers by the roll-animation buffer.
- Auto-move robber now filters legal tiles under friendly-robber rules.
- Timer UI hides during preGame and uses floor seconds to avoid early auto-roll visuals.
- Auto-move dispatch now includes player credentials from match metadata so server-side timers can act on behalf of authenticated players.
- TimerManager now detects robberDiscard via core turn state and auto-dispatches discards for every pending player.

## Status (2026-01-16)
- Logged a GSAP-based effects + audio system design with a cue-driven event bus and centralized AudioManager.

## Status (2026-01-16)
- Added an Effects layer (EffectBus, GameEffects, EffectLayer) with GSAP-based resource distribution and cue-driven audio wiring.
- Centralized board layout helpers and passed board refs for effect positioning.

## Status (2026-01-16)
- Fixed initial placement resource distribution gating to use per-player remaining settlements (no extra resources on first placement).

## Status (2026-01-16)
- Moved initial placement resource grants into game-core with new tests, and wired Moves to forward core distributions only.

## Status (2026-01-17)
- Added per-cue hidden-tab audio policy and wired turn-start + dice-roll cues to the effects bus.

## Status (2026-01-18)
- Added pop/overshoot + jitter to resource distribution card animations for a more "alive" feel.

## Status (2026-01-19)
- Added a dev-only Effects Lab route with deterministic replays for animation tuning.
- Fixed Effects Lab hydration by deferring the EffectLayer portal until client mount.
- Added an effects registry + dropdown selector in the lab and wired an audio toggle via the effect bus.
- Wrote an implementation plan for the game log panel and structured log entries.

## Status (2026-01-19)
- Implemented a public game log in `G.gameLog` with structured entries and forced-action logging.
- Centralized status/log copy in `app/catana/utils/gameText.js` and added a token formatter.
- Added a left-side Game Log panel with scrollable entries and resource icons.
- Added app-level tests for log helper/init, log entry formatting, and log panel wiring.
- Refined the log UI height/z-index and added placement turn dividers plus a main-phase separator.
- Suppressed auto tags for resource gains and styled the log scrollbar for a cohesive UI.
- Added auto-scroll to the log panel and a placement-phase divider entry.
- Paused autoscroll on manual scroll and added a delayed resume on mouse leave.
- Smoothed log autoscroll behavior (wheel-only) and moved placement divider logging to phase start.
- Increased header contrast with a stronger background + divider line.
- Hid the log scrollbar until hover to match default OS behavior.
- Inset the scroll area to keep the scrollbar away from rounded corners.
- Logged a design doc for the game log panel, structured log entries, and shared text templates.

## Status (2026-01-19)
- Logged a board-generation config + official spiral placement design doc to guide strategy refactors.

## Status (2026-01-19)
- Added board spec/config registries and official spiral utilities for deterministic placement.
- Refactored board generation to accept a BoardConfig and apply terrain/number/port strategies.
- Updated Catana setup/tests to use board configs and removed the old board preset module.

## Status (2026-01-19)
- Removed the placement-phase start log entry so the game log begins empty.
- Skipped the placement turn divider on the final placement road so only the main-phase divider remains.
- Added a placement log regression test for the final-divider behavior.
- Added top padding to the log list and refined autoscroll to pause on hover and only jump on new entries after idle.

## Status (2026-01-19)
- Disabled default dragging across Catana UI images (resource bar, dock, log icons, trade modal, dev cards via `NextImage`) and added a UI test to guard non-draggable images.

## Status (2026-01-19)
- Added an effects/audio quick reference to `AGENTS.md` and linked it from agent notes for future sessions.
- Swapped resource distribution audio to the pop-out cue (`resource:pop:start`) mapped to `ui-pop-resource-out.mp3`.

## Status (2026-01-19)
- Synced resource distribution travel to start after all pops, with a tiny travel stagger and a single travel cue mapped to `card_woosh.mp3`.

## Status (2026-01-19)
- Added a 20ms lead for the resource travel cue so the woosh aligns with motion.

## Status (2026-01-20)
- Added a top-left mute toggle that persists audio mute state in localStorage and uses Howler global mute.
- Moved the Game Log panel anchor to the bottom-left of the screen.

## Status (2026-01-20)
- Added placement drop + dust animations for settlement/road builds with a shared sound cue.

## Status (2026-01-20)
- Added a Piece Placement entry to the Effects Lab with full tuning controls.
- Reworked the Piece Placement lab layout to use a side-by-side control panel and preview.
- Widened the Effects Lab container and constrained the preview canvas to avoid horizontal scrolling.
- Updated placement defaults (longer drop, no squish) and split shadow vs. dust burst visuals.

## Status (2026-01-20)
- Logged a placement animation design doc for settlement/road drop + dust effects with a shared cue.

## Status (2026-01-20)
- Derived placement effect duration from shared defaults to keep state updates aligned with the animation.
- Attached a board-scoped placement layer and added board-space rendering in the placement runner.
- Wrapped animated roads so drop translation doesn't disturb rotated road placement.

## Status (2026-01-20)
- Suppressed build action highlights immediately after a placement click and restored them once board state advances.

## Status (2026-01-20)
- Added a small post-hold to placement animations to avoid single-frame flicker before state updates.

## Status (2026-01-20)
- Kept the post-hold out of the effect duration so the animation overlaps the state update and avoids lingering flicker.

## Status (2026-01-20)
- Effects Lab audio now defaults on and supports a per-effect custom sound override with delay tuning.

## Status (2026-01-20)
- Added audio format passthrough for custom Effects Lab uploads so blob URLs play reliably.

## Status (2026-01-20)
- Split placement audio cues so settlements and roads use distinct sounds.

## Status (2026-01-21)
- Logged a design doc for dice roll audio variants with shuffle-bag selection and subtle jitter.

## Status (2026-01-21)
- Dice roll audio now uses 5 shuffled variants with subtle pitch/volume jitter.
- Moved dice roll mp3 assets to `public/sounds/` for `/sounds/*` serving.
## Status (2026-01-21)
- Improved city upgrade hover/placement animation + sound.
- Cleared city hover immediately on placement click to avoid double-ghosting during the drop.
- City upgrade overlap suppression now keys off active `placePiece` effects to avoid showing a city/settlement under the drop.
- City placement overlay now renders above roads during the drop animation.
- Added placement-start turn-start cue logic with tests to avoid double-dings on snake turns.
- Split placement layers so road drops stay behind buildings while city drops stay above roads.

## Status (2026-01-22)
- Added game-over log formatting plus a one-time `game:over` log entry from moves.
- Added game-over modal + postgame overlay scaffolding and wired GameScreen to show them on win.
- Added game-over audio cues (win/lose) and guarded `ctx.activePlayers` access in Board.
- Revealed full player state when `G.core.gameOver` is set so final VP/dev-card scores display correctly for all players.
- Restyled game-over modal/postgame overlay to the blue/glass theme and added winner confetti via canvas-confetti.

## Status (2026-01-28)
- Added a failing test guard to require a "Results" label in the game-over screen source.
- Added a reusable glass pill button and top-right Results control to reopen the game-over modal.

## Status (2026-02-04)
- Added a Catana-styled lobby UI under `app/catana/lobby/` with room list + join/create flows.
- Added a Catana frontend design skill doc at `docs/agent/skills/catana-brand/SKILL.md` to codify the sky+glass visual recipes for new pages (lobby/blog/marketing).

## Status (2026-02-06)
- Gated `DEBUG_*` moves in `app/catana/Game.js` so they are only exposed when `NODE_ENV !== "production"`.
- Added `app/catana/__tests__/Game.debugMoves.test.js` to assert debug moves are hidden in production and available in non-production.
- Removed legacy `app/catana/game/*` files, moved active exports to `app/catana/types.js`, and updated Catana imports to the new path.
- Removed the stale deleted-file include from `tsconfig.json`.
- Fixed `app/catana/__tests__/Game.placementPhase.test.js` by passing `{ G }` into `turnOrder.playOrder(...)`; full root Vitest now passes (71 files / 267 tests).
- Updated root `verify` script to run full repo tests via `pnpm exec vitest run` (instead of only `game-core` tests) before lint.
- Fixed stale build-placement UI state after turn handoff: `GameScreen` now clears local `playerAction` when the viewer is no longer eligible to build (phase/stage/player mismatch).
- Added `app/catana/utils/playerAction.js` + `app/catana/__tests__/playerAction.test.js` to codify reset rules (including turn-end while placing road/city).
- Spacebar end-turn now mirrors the button path by clearing local build intent before calling `moves.endTurn()`.

## Status (2026-02-06)
- Added a standalone Settlex RL harness under `ai/pufferlib/` that uses `game-core` as-is (no engine code changes required).
- Added `ai/pufferlib/js/settlexEnv.cjs`, a deterministic self-play env with fixed discrete action space and per-step action masking over placement/main/robber flows.
- Added `ai/pufferlib/js/engine_host.cjs`, a JSONL stdio bridge so Python can step/reset/spec the JS engine wrapper.
- Added JS tests: `ai/pufferlib/js/__tests__/settlexEnv.test.js` and `ai/pufferlib/js/__tests__/engineHost.test.js`.
- Added Python integration in `ai/pufferlib/python/settlex_puffer/`:
  - Gym wrapper (`env.py`) + host client (`bridge.py`)
  - masked policy (`policy.py`) that enforces legal-action logits
  - smoke runner (`smoke.py`) and PufferLib train entrypoint (`train.py`)
- Added packaging + docs: `ai/pufferlib/python/pyproject.toml` and `ai/pufferlib/README.md`.
- Verified end-to-end:
  - JS tests pass for env/host
  - random-policy smoke rollout runs
  - short CPU PufferLib train run completes and writes checkpoints to a run directory

## Status (2026-02-06)
- Expanded RL action space with explicit dev-card play actions in `ai/pufferlib/js/settlexEnv.cjs`:
  - `playDev:knight`
  - `playDev:roadBuilding`
  - `playDev:monopoly:<resource>`
  - `playDev:yearOfPlenty:<resource>+<resource>`
- Added dev-card flow tests in `ai/pufferlib/js/__tests__/settlexEnv.devCards.test.js` covering mask exposure and phase transitions.
- Added checkpoint evaluation script `ai/pufferlib/python/settlex_puffer/evaluate.py` and CLI entrypoint `settlex-puffer-eval` for win-rate tracking vs random opponents.
- Re-verified smoke + short CPU training run after dev-card action expansion.

## Status (2026-02-06)
- Updated Puffer trainer defaults in `ai/pufferlib/python/settlex_puffer/train.py` to avoid common startup failures (`minibatch_size` now defaults to `128`).
- Added a guard that clamps `minibatch_size` when `batch_size=auto` so short/local runs do not trip `batch_size < minibatch_size` errors.
- Re-verified short CPU training run and checkpoint evaluation after the trainer config fix.

## Status (2026-02-06)
- Added server-side Puffer bot adapter plumbing:
  - `server/bots/pufferStateAdapter.js` maps live `G/ctx` -> policy observation/mask and maps policy actions -> boardgame move payloads.
  - `server/bots/PufferPolicyClient.js` runs a persistent Python JSONL inference worker.
  - `server/bots/pufferBotManager.js` manages bot seat detection, policy inference, and random/legal fallback.
- Added Python inference worker `ai/pufferlib/python/settlex_puffer/infer_server.py` and script entrypoint `settlex-puffer-infer`.
- Integrated bot dispatch path in `server/server.js` with multi-step move support (`buildAutoMoveAction` now accepts args) and bot-seat caching from lobby metadata.
- Extended `TimerManager` to schedule fast `autoBot` ticks for bot-controlled stages and to re-schedule when state updates in the same turn/stage.
- Added lobby UX to fill open seats with bots in `app/catana/lobby/[matchID]/MatchPageClient.js` using `data.bot = "puffer"`.
- Added tests:
  - `server/__tests__/pufferStateAdapter.test.js`
  - `server/__tests__/pufferBotManager.test.js`
  - `app/catana/__tests__/MatchPageClient.botFill.test.js`
  - updates in `server/__tests__/dispatchUtils.test.js` and `server/__tests__/TimerManager.test.js`

## Status (2026-02-06)
- Added a direct main lobby CTA in `app/catana/lobby/LobbyPageClient.js`: **Play Against Bot**.
- New flow creates a 2-player match, joins the human to seat `0`, auto-joins seat `1` as `[BOT] Puffer` with `data.bot = "puffer"`, and routes to the match page.
- Added source-level regression test `app/catana/__tests__/LobbyPageClient.playVsBot.test.js`.

## Status (2026-02-06)
- Enabled duel rules by default for 2-player games in `app/catana/Game.js`:
  - `victoryPointsToWin = 15`
  - `discardLimit = 9`
- Added explicit ruleset resolution in setup with optional `setupData.rulesetId` override (`"duel"` or `"standard"`).
- 3+ player games continue to default to standard rules (`10 VP`, discard limit `7`).
- Added setup coverage in `app/catana/__tests__/Game.boardConfig.test.js` for both 2-player duel default and 3+ player standard default.

## Status (2026-02-11)
- Added explicit server-only game config at `server/serverGame.js` (`ServerCatan`) with debug moves and effects plugin disabled.
- Refactored `app/catana/Game.js` to export `createCatanGame(...)` and keep `Catan` as the client/default config.
- Removed global mutable `STATIC_GRAPH` usage from `app/catana/Game.js` setup flow.
- Added dispatch extraction `server/dispatch/dispatchMatchUpdate.js` with top-level error handling and reduced DB reads (initial + final sync fetch instead of per planned move).
- Added server regression tests:
  - `server/__tests__/serverGameConfig.test.js`
  - `server/__tests__/dispatchMatchUpdate.test.js`
- Added shared board wiring helpers in `game-core/src/board/hexWiring.ts` and reused them in:
  - `game-core/src/board/generateBoard.ts`
  - `game-core/src/board/generateBoardClass.ts`
- Added board wiring tests in `game-core/src/board/hexWiring.test.ts`.
- Added render performance guards and updates:
  - `app/catana/GameScreen.js`: memoized player-view map + timer ticker only when timer is visible.
  - `app/catana/components/PlayerActionContainer.js`: precomputed resource counts (removed repeated per-resource filters).
  - `app/catana/components/GameLogPanel.js`: memoized formatted log entries.
  - `app/catana/__tests__/renderPerfGuards.test.js`.
- Expanded `game-core` rule coverage for critical failure paths:
  - `game-core/src/rules/turnFlow.test.ts`
  - `game-core/src/rules/trading.test.ts`
  - `game-core/src/rules/devCards.test.ts`

## Status (2026-02-11, hotfix)
- Fixed server crash during second placement settlement when resource distribution effects emitted:
  - `server/serverGame.js` now keeps effects plugin enabled (`includeEffects: true`) so move contexts include `effects`.
  - `app/catana/Moves.js` now treats effect emits as optional (`effects?.roll?.(...)`, `effects?.distributeCardsFromTile?.(...)`) to prevent hard crashes if plugin wiring is absent.
- Added regression coverage:
  - `app/catana/__tests__/Moves.resourceDistribution.test.js` now verifies `placeSettlement` does not throw when `effects` is missing.
  - `server/__tests__/serverGameConfig.test.js` now asserts server config retains plugin wiring while still hiding debug moves.

## Status (2026-02-11, puffer 1v1 alignment)
- Fixed Puffer bot stage/mode mismatch that could cause illegal `rollDice` attempts during robber resolution after knight play:
  - `server/bots/pufferStateAdapter.js` now infers a mode override from boardgame stages and maps `main:moveRobber` -> `robberMove` and `main:robberDiscard` -> `robberDiscard`.
  - Regression test added in `server/__tests__/pufferStateAdapter.test.js` to lock behavior when `ctx.activePlayers[currentPlayer] === "moveRobber"` while `G.core.turn.phase === "preRoll"`.
- Updated RL env ruleset selection in `ai/pufferlib/js/settlexEnv.cjs`:
  - Added `rulesetId` option (`"auto" | "duel" | "standard"`).
  - Default `rulesetId: "auto"` now picks duel rules for 2-player (`15 VP`, discard `9`) and standard for 3-4 players.
  - Env spec now surfaces resolved `rulesetId`.
- Added RL env regression coverage in `ai/pufferlib/js/__tests__/settlexEnv.test.js`:
  - 2-player defaults to duel rules.
  - explicit `rulesetId: "standard"` keeps standard rules in 2-player env.
- Fixed placement actor inference in `server/bots/pufferStateAdapter.js` for lobbies where placement starts with an offset `ctx.turn`:
  - Adapter now anchors placement index to `ctx.currentPlayer` and uses turn proximity only as a tie-break.
  - Prevents immediate fallback `autoPlaceSettlement/autoPlaceRoad` on the bot’s second placement turn.
  - Regression test added in `server/__tests__/pufferStateAdapter.test.js`.

## Status (2026-02-11, puffer docs)
- Expanded `ai/pufferlib/writeup.md` with per-section “Why this / Tradeoffs / Alternatives” callouts to make the blogpost draft explain decision-making, not just the implementation steps.

## Status (2026-02-11, puffer encoder + search upgrade)
- Upgraded RL observation schema to `v2` in `ai/pufferlib/js/settlexEnv.cjs` with explicit board-layout features:
  - Per-land-tile: resource one-hot, number one-hot, pip weight, robber flag.
  - Per-node: port one-hot, adjacent pip-by-resource totals, total pips, settlement/city occupancy one-hots.
  - Per-edge: ownership one-hot (unowned + per-player owner).
- Added schema/action metadata in env spec:
  - `observationLayout`
  - `observationSchemaHash`
  - `actionSpaceHash`
  - propagated through `server/bots/pufferStateAdapter.js` so serving uses the exact same schema contract.
- Added factorized relational policy `ai/pufferlib/python/settlex_puffer/policy_factorized.py` and wired it into:
  - training (`ai/pufferlib/python/settlex_puffer/train.py`)
  - checkpoint evaluation (`ai/pufferlib/python/settlex_puffer/evaluate.py`)
  - inference worker (`ai/pufferlib/python/settlex_puffer/infer_server.py`)
- Added inference modes for search support:
  - `score_actions` (masked logits + value)
  - `eval_batch` (value-only batched scoring)
- Added optional expectimax-style action search for live bots:
  - new module `server/bots/pufferSearch.js`
  - manager wiring + env vars in `server/bots/pufferBotManager.js`:
    - `SETTLEX_PUFFER_SEARCH`
    - `SETTLEX_PUFFER_SEARCH_BUDGET_MS`
    - `SETTLEX_PUFFER_SEARCH_TOPK`
    - `SETTLEX_PUFFER_SEARCH_MAX_DEPTH`
- Fixed a factorized-policy indexing bug (duplicate settlement/city node labels could overflow node token indices) and added regression coverage in `ai/pufferlib/python/tests/test_policy_factorized.py`.
- Verification:
  - `pnpm exec vitest run ai/pufferlib/js/__tests__/settlexEnv.test.js server/__tests__/pufferStateAdapter.test.js server/__tests__/pufferBotManager.test.js`
  - `python -m unittest discover -s ai/pufferlib/python/tests -p 'test_policy_factorized.py'`
  - short smoke train/eval on factorized policy path completed successfully.

## Status (2026-02-11, puffer writeup v2)
- Added a follow-up blogpost-style writeup capturing the V2 changes and learnings:
  - `ai/pufferlib/writeup-v2.md`

## Status (2026-02-12, bot pregame + avatar polish)
- Fixed bot pregame readiness delay for bot-controlled seats:
  - `server/timers/TimerManager.js` now schedules `autoBot` for unready bot players during `preGame:waiting` (not only `ctx.currentPlayer`), so bot seats auto-submit `readyUp`.
  - `server/bots/pufferBotManager.js` now returns `readyUp` during `preGame:waiting`.
- Updated bot avatar metadata to robot emoji:
  - `app/catana/lobby/LobbyPageClient.js` (`Play Against Bot` flow) now joins bot seat with `emoji: "🤖"`.
  - `app/catana/lobby/[matchID]/MatchPageClient.js` (`Fill Open Seats With Bots`) now joins bot seats with `emoji: "🤖"`.
- Added/updated regression coverage:
  - `server/__tests__/TimerManager.test.js`
  - `server/__tests__/pufferBotManager.test.js`
  - `app/catana/__tests__/LobbyPageClient.playVsBot.test.js`
  - `app/catana/__tests__/MatchPageClient.botFill.test.js`

## Status (2026-02-12, puffer placement fallback fix)
- Fixed search-time mutation bug that caused bot policy fallback to random legal actions during placement with errors like:
  - `TypeError: Cannot add property <edgeId>, object is not extensible`
- Root cause:
  - `server/bots/pufferStateAdapter.js` hydrated `env.state` with direct `G.core` reference.
  - In expectimax search, env simulation mutates state (`roadsByEdgeId`, buildings, etc.), but boardgame-provided state objects can be frozen/non-extensible.
- Fix:
  - `server/bots/pufferStateAdapter.js` now clones `G.core` when hydrating adapter env state.
- Regression coverage:
  - `server/__tests__/pufferStateAdapter.test.js` adds `hydrates a mutable core clone for search simulation`.

## Status (2026-02-13, tile template base)
- Added canonical base tile template at `public/svgs/concepts/tile_template_base.svg`:
  - fixed dimensions `width="346" height="400" viewBox="0 0 346 400"`.
  - hard-edged hex border ring with solid flat fill `#fbbf24` (no border gradient).
  - reusable inner clip contract via `tileInnerHex`, `tileInnerClip`, and clipped `tileArt`.
- Added spec note `docs/plans/2026-02-13-tile-template-base-spec.md` documenting:
  - border thickness decision,
  - border color rationale with alternatives,
  - inner clip geometry contract,
  - Catana style fit rationale.

## Status (2026-02-13, classic tileset shell concept)
- Added a competitor-inspired but Catana-tuned classic tileset shell:
  - `public/svgs/concepts/tile_template_classic.svg`
  - keeps canonical `346x400` geometry and shared flat amber outer mould (`#fbbf24`),
  - adds per-tileset inner surface stack (base radial fill + two inner ring bands + vignette),
  - includes centered badge container with replaceable `tileBadgeIcon` group.
- Added a concrete ore example built on the same shell:
  - `public/svgs/concepts/tile_ore_classic.svg`
  - silver body/ring palette and simple geometric rock badge icon.
- Adjusted classic badge placement upward (translate Y `-48`) in both files so the bottom-middle area stays clear for number tokens.
- Refined ore classic tile per feedback:
  - removed circular badge plate (fill ring + stroke ring + highlight ellipse),
  - kept only the raised ore icon group so the mark sits directly on tile art.
- Added ore badge readability variants for review (same tile body, different icon separation treatments):
  - `public/svgs/concepts/tile_ore_classic_v2_stroke.svg` (bold dark silhouette outline + light edge),
  - `public/svgs/concepts/tile_ore_classic_v3_keyline.svg` (subtle shadow + light keyline),
  - `public/svgs/concepts/tile_ore_classic_v4_plate.svg` (angular non-circular backplate + stroke).
- Added ring seam-separator mockups on the keyline ore variant to test border articulation:
  - `public/svgs/concepts/tile_ore_classic_v3_keyline_seam_soft.svg` (subtle seam),
  - `public/svgs/concepts/tile_ore_classic_v3_keyline_seam_strong.svg` (high-contrast seam).
- Added first classic non-badge resource set using the strong seam treatment:
  - `public/svgs/concepts/tile_wheat_classic_v1_seam_strong.svg`
  - `public/svgs/concepts/tile_sheep_classic_v1_seam_strong.svg`
  - `public/svgs/concepts/tile_lumber_classic_v1_seam_strong.svg`
  - `public/svgs/concepts/tile_brick_classic_v1_seam_strong.svg`
- Each tile keeps the shared outer mould (`#fbbf24`), removes the centered badge/emblem group, and uses resource-specific body/ring/seam palettes.

## Status (2026-02-14, puffer blog roadmap restructure)
- Reworked `docs/plans/2026-02-14-puffer-4-part-roadmap.md` from a fixed 4-part framing to an expanded series roadmap with a clearer narrative arc:
  - Part 1 baseline,
  - Part 2 representation upgrade,
  - Part 3 evaluation discipline,
  - Part 4 reward + episode control,
  - Part 5 imitation warm-start,
  - Part 6 search-augmented inference,
  - Part 7 local throughput,
  - Part 8 cloud scaling,
  - Part 9 native simulator decision.
- Added an explicit "Narrative Rule" to track progress by one primary metric per post (strength, reliability, sample efficiency, SPS, or cost), so posts remain empirical even when win-rate gains are not immediate.
- Added a `Narrative Handoff (Open -> Close)` section with concrete opening problem and closing lead-in lines for Parts 1-9 to make post-to-post transitions explicit during writing.
- Refined Part 1 -> Part 2 framing to avoid unsupported "plateau" claims:
  - Part 1 should close on observed qualitative representation limits (e.g., weak placement intuition), unless quantitative plateau evidence exists.

## Status (2026-02-23, wheat icon shading variants)
- Added two shading-variant copies of the working wheat resource icon for visual comparison without changing base silhouette:
  - `design/working_draft/wheat_icon_shading_subtle.svg`
  - `design/working_draft/wheat_icon_shading_rich.svg`
- Both variants keep the same shape and experiment with local grain/lobe accent fills (two-tone look), with:
  - `subtle`: lower-opacity accents and minimal extra detail,
  - `rich`: stronger accents plus a central stem highlight strip.

## Status (2026-02-23, resource icon outsourcing guide)
- Added an authoritative Catana resource icon handoff guide:
  - `docs/agent/skills/catana-brand/RESOURCE_ICON_STYLE_GUIDE.md`
- Guide captures:
  - brand-aligned icon style pillars,
  - canonical 256 template and safe-area contract,
  - per-resource silhouette briefs (wood/brick/sheep/wheat/ore),
  - tokenized color strategy, no-sticker/no-heavy-gloss constraints,
  - acceptance checklist for small-size/in-game legibility.
- Added discoverability link from:
  - `docs/agent/skills/catana-brand/SKILL.md`

## Status (2026-03-04, tile icon transform normalization)
- Updated tile resource-icon placement in `app/catana/Tile.js` to use one uniform transform for all resources.
- Removed per-resource scale and top-offset overrides so icon redesign can proceed on a single canonical placement.
- Set the global transform to the previous Sheep baseline:
  - top factor: `0.204`
  - scale: `0.68`

## Status (2026-03-05, emoji settlement PNG preview override)
- Added a temporary emoji-theme asset override in `app/catana/theme/themes.js` so all settlement piece files (`settlement_<color>.svg`) resolve to:
  - `/test_designs/settlement_red.png`
- Purpose: quick in-game visual testing of a PNG settlement concept without modifying piece placement/rendering logic.
- Added test coverage in `app/catana/__tests__/themeAssets.test.js` for emoji settlement override resolution.

## Status (2026-03-05, raster prototype auto-fit for pieces)
- Updated piece rendering to auto-detect raster assets (`.png/.jpg/.webp/.gif`) and apply raster-friendly placement:
  - `app/catana/Piece.js`
  - `app/catana/effects/placePiece.js`
- Raster assets now render with:
  - `background-size: contain` (instead of `cover`)
  - `background-position: center bottom`
  - slightly adjusted vertical anchor (`0.59` vs SVG `0.63`)
- SVG assets keep existing behavior unchanged.
- Added helper and test coverage:
  - `isRasterAssetPath(...)` in `app/catana/theme/themes.js`
  - assertions in `app/catana/__tests__/themeAssets.test.js`

## Status (2026-03-05, settlement PNG prototype size tuning)
- Tuned settlement prototype rendering to appear smaller when the themed settlement asset is raster:
  - `app/catana/Piece.js`
  - `app/catana/effects/placePiece.js`
- Added a settlement-only raster render scale constant (`0.88`) so PNG mockups stay closer to previous SVG visual footprint on board.
- Non-raster/SVG settlement assets and city/road rendering remain unchanged.

## Status (2026-03-05, settlement PNG vertical alignment nudge)
- Added a settlement-only raster Y lift (`5px`) to better align the temporary PNG prototype on board nodes.
- Applied consistently to both static board rendering and placement animation rendering:
  - `app/catana/Piece.js`
  - `app/catana/effects/placePiece.js`

## Status (2026-03-04, resource bar icon legibility)
- Increased resource bar icon display sizes in `app/catana/components/PlayerActionContainer.js`:
  - Brick/Ore icons from `h-6` -> `h-9`
  - Sheep icon from `h-7` -> `h-10`
  - Wood/Wheat icons from `h-8` -> `h-10`
- Increased resource count text size in the same component from `text-3xl` -> `text-4xl` and widened count slot (`w-6` -> `w-8`) for clearer readability.
- Added a UI guard test in `app/catana/__tests__/uiNoDragImages.test.js` to ensure larger icon classes remain in place.

## Status (2026-03-04, resource bar spacing + count stability)
- Tightened count-to-icon spacing in `app/catana/components/PlayerActionContainer.js` (`mr-2` -> `mr-1`) so rows feel less spread out.
- Reduced count size (`text-4xl` -> `text-3xl`) while keeping legibility.
- Added number stability helpers to reduce visual shift between digits:
  - fixed count slot width `w-7`,
  - centered text `text-center`,
  - compact line box `leading-none`.
- Removed `tabular-nums` so the resource count uses default font rendering.

## Status (2026-03-04, resource bar icon style normalization)
- Replaced per-resource icon sizing branches in `app/catana/components/PlayerActionContainer.js` with one shared icon style for all resources.
- Resource icons now render with a uniform fixed slot/class:
  - `h-10 w-10 object-contain`
- This ensures consistent count-to-icon spacing regardless of individual SVG intrinsic width/padding differences.
- Updated UI guard test in `app/catana/__tests__/uiNoDragImages.test.js` to assert the shared class and no longer expect mixed `h-9`/`h-10` sizing.

## Status (2026-03-09, port connector visual targeting)
- Replaced the experimental free-angle connector geometry with the original fixed six-way bridge transform system from the older port implementation.
- `app/catana/utils/portLayout.js` now uses:
  - the legacy connector direction map,
  - fixed `0 / ±60deg` rotations,
  - the legacy `port_pier.svg` bridge asset for consistent shoreline alignment.
- This restores the previously proven coast/port bridge angles instead of continuously solving connector vectors.
- Follow-up fix: bridge placement is now anchored from the actual connected node coordinates rather than the old hardcoded per-direction offsets, so the restored legacy angles line up with the current curved board geometry.
- Final fix: port connectors now resolve from the same `nodeRenderById` render-map entries used by `ActionNode` and settlement placement.
  - `app/catana/Board.js` passes `nodeRenderById` into each `Port`.
  - `app/catana/Port.js` resolves `tile.nodes` through that map and hands the exact render nodes to `getPortRenderModel(...)`.
  - `app/catana/utils/portLayout.js` computes each bridge from the real rendered node tile-coordinate + node-direction pair, including ports whose two coastal nodes come from different land tiles.
- Added focused regression coverage in `app/catana/__tests__/utils/portLayout.test.js` for east and southeast ports using actual node-anchored connector expectations.

## Status (2026-03-10, port connector rollback for manual tuning)
- Rolled back the latest node-render-driven bridge placement change while keeping the new port marker/icon system intact.
- `app/catana/Board.js` no longer passes `nodeRenderById` into `Port`.
- `app/catana/Port.js` again asks `getPortRenderModel(...)` for direction-based connector placement only.
- `app/catana/utils/portLayout.js` is back on the simpler legacy direction map for bridges (`0 / ±60deg` rotations from the port tile direction).
- Follow-up correction: the rollback now restores the original hand-tuned diagonal bridge offsets as well, not the intermediate node-centered variant.
- This leaves the new port icons/badge system in place while restoring the older bridge positioning so manual tweaking can continue from that baseline.

## Status (2026-03-10, port connector concept SVGs)
- Added three standalone connector concept assets for design exploration in `public/svgs/concepts/`:
  - `port_connector_sandbar.svg`
  - `port_connector_frosted.svg`
  - `port_connector_hybrid.svg`
- All three use the existing `80x240` pier footprint so they can be swapped into the current port connector slot without changing layout math.

## Status (2026-03-10, port bridge layering)
- Wrapped each port’s marker/connector/badge in a dedicated low-z `.portLayer` stacking context in `app/catana/Port.js` / `app/catana/Port.css`.
- Port internal z-order is now:
  - marker: `z-index: 1`
  - connector/pier: `z-index: 2`
  - rate badge: `z-index: 3`
- Because the board still renders `{tiles}` before `{buildings}`, placed settlements/cities/roads remain above the full port layer while the connector now sits on top of the circular port marker.

## Status (2026-03-10, smaller port icon footprint)
- Reduced the port marker icon footprint in `app/catana/Port.css`:
  - resource icon: `52%` -> `46%`
  - generic "3 dots" glyph: `44% x 22%` -> `40% x 20%`
- Added a regression in `app/catana/__tests__/Port.render.test.js` so future styling changes keep the smaller icon sizing.

## Status (2026-03-12, board-level port channels)
- Replaced the visible old per-port bridge treatment with a board-level `BoardPortChannels` SVG layer in `app/catana/BoardPortChannels.js`.
- `app/catana/Board.js` now renders that layer between `BoardUnderlay` and `{tiles}`, so the channels read as part of the map while the circular port markers still sit on top.
- `app/catana/Port.js` no longer renders the old `port-connector` divs; the port component is back to marker + badge only.
- The current channel art direction is:
  - one tapered channel per port,
  - warm sand outer band using the shared board sand `#E5D08A`,
  - pale blue inner lane,
  - curved path geometry rather than rotated pier assets.
- The current tuning pass widened the coast-side end of the channels and switched from straight polygons to curved SVG paths to better match the softer underlay silhouette.
- Added coverage in:
  - `app/catana/__tests__/BoardPortChannels.render.test.js`
  - `app/catana/__tests__/Board.layering.test.js`
  - `app/catana/__tests__/Port.render.test.js`

## Status (2026-03-16, simple port connectors)
- Simplified the board-level port connection treatment in `app/catana/BoardPortChannels.js` from one heavier merged shoreline channel per port to two short sandy connector bars per port.
- Kept the existing layer slot unchanged:
  - `BoardUnderlay`
  - `BoardPortChannels`
  - `{tiles}` / port token
  - placed pieces
- Preserved the existing correct connector targeting by reusing `getPortRenderModel(...).connectors` from `app/catana/utils/portLayout.js` rather than introducing new geometry logic.
- Updated `app/catana/__tests__/BoardPortChannels.render.test.js` to assert:
  - one channel group per port,
  - two connector bars per port,
  - no old merged channel markup.
- Design outcome:
  - lighter than the board-channel experiment,
  - keeps the important “these two nodes access this port” signal,
  - easier to tune visually than the merged coastline-extension treatment.

## Status (2026-03-16, node-anchored simple port connectors)
- Refined the simple connector pass so the visible sandy bars are now anchored near the real coastal node circles instead of being centered inside the old legacy connector shells.
- `app/catana/utils/portLayout.js` now exposes `nodeDirection` on each connector so the render layer can place bars from actual node-facing geometry.
- `app/catana/BoardPortChannels.js` now computes each bar from:
  - the port tile center,
  - `getNodeDelta(...)` for the correct coastal vertex,
  - the current port marker center,
  - a short clamped length that stops before the token.
- This keeps the lighter “two separate sandy markers” direction while fixing the mid-water floating/undersized look from the first simple-bar attempt.

## Status (2026-03-19, settlement piece reference iteration)
- Switched the piece-asset exploration loop from broad `imagegen` variation batches to one-at-a-time reference-driven edits.
- Built a two-image reference pack under `tmp/imagegen/refs/`:
  - `board-style-ref.png` cropped from the current board look to anchor gradients/softness,
  - `settlement-ref.png` rasterized from the existing settlement SVG as a loose projection/detail reference.
- Learned from the first reference edit that using the rendered settlement directly as the primary image over-constrains the model and tends to preserve too much of the old shape while reintroducing glow.
- Created `settlement-silhouette-ref.png` as a simplified silhouette anchor, then used that plus the board crop to produce a materially better flat/front settlement direction at:
  - `output/imagegen/piece-settlement-iterative/02-silhouette-anchor.png`
  - `output/imagegen/piece-settlement-iterative/03-house-read.png`
- Current best direction:
  - `02-silhouette-anchor.png` for overall projection/rendering language fit,
  - `03-house-read.png` if we want the same base but with a clearer settlement/house read.
- Follow-up settlement branch from `03-house-read.png`:
  - `04-more-piece-like.png` is the most useful refinement so far; it keeps the good flat board-piece read while making the roof/body relationship feel more like a placed game piece.
  - `05-broader-stable.png` regressed by inventing a base/plinth and should not be reused.
  - `06-cleaner-flatter.png` stayed too close to `03-house-read.png` to justify the branch.
  - `07-inset-door-shadow.png` is a light cleanup pass on `04`; the change is subtle but keeps the same direction viable.
- Roof-forward exploration from `04-more-piece-like.png`:
  - `08-roof-forward-subtle.png`, `09-roof-forward-stronger.png`, and `10-roof-overhang.png` all preserve the same style and slightly increase roof dominance/top-down read.
  - The differences are intentionally small:
    - `08` is the gentlest push,
    - `09` is the strongest “bigger roof / higher perspective” read,
    - `10` is close to `09` but with a touch more overhang flavor.
  - None of these broke the established flat board-piece language, which means the roof-forward direction is safe to continue if preferred.

## Status (2026-03-19, user-SVG transform test)
- Took the user-provided settlement SVG markup and saved it as `tmp/imagegen/refs/settlement-user-start.svg`, then rasterized it to `settlement-user-start.png` for edit-mode use.
- Ran a reference-driven `imagegen` edit using:
  - the user SVG raster as the primary geometry anchor,
  - the existing Colonist settlement raster as a proportion cue only,
  - the board crop as the Catana rendering/style cue.
- Outputs:
  - `output/imagegen/piece-settlement-iterative/11-user-svg-proportion-shift.png`
  - `output/imagegen/piece-settlement-iterative/12-user-svg-stronger-roof.png`
- Result:
  - this workflow preserved the user’s cleaned-up settlement family more faithfully than earlier freeform generations,
  - `12-user-svg-stronger-roof.png` is the stronger and more useful result for the desired “bigger roof / smaller visible face / higher perspective” proportion shift.

## Status (2026-03-19, Colonist-geometry style transfer test)
- Switched to a stricter style-transfer workflow:
  - `settlement-colonist-whitebg.png` as the exact settlement geometry/proportion anchor,
  - `04-more-piece-like.png` as the newer Catana settlement style cue,
  - `board-style-ref.png` as the board softness/gradient cue.
- Outputs:
  - `output/imagegen/piece-settlement-iterative/13-colonist-restyle-conservative.png`
  - `output/imagegen/piece-settlement-iterative/14-colonist-restyle-softer.png`
- Result:
  - this branch preserves the familiar Colonist silhouette/proportions better than the roof/body proportion experiments,
  - `14-colonist-restyle-softer.png` is the cleaner of the two and currently the best “same geometry, newer Catana treatment” direction.

## Status (2026-03-19, true Colonist redraw branch)
- Corrected the anchor to the real source file: `public/svgs/settlement_red_colonist.svg`.
- First reran strict style-transfer against the true anchor:
  - `15-true-colonist-restyle-conservative.png`
  - `16-true-colonist-restyle-softer.png`
- Those still read too much like softened repaints, so the prompt was loosened from “preserve exact geometry” to “preserve roof-first recognizability, but redraw in Catana style.”
- New outputs:
  - `17-colonist-rebuild-highfid.png`
  - `18-colonist-rebuild-lowfid.png`
- Result:
  - `17` is the first useful “new piece based on Colonist perspective” direction,
  - `18` over-drifts and gets too narrow/awkward.

## Status (2026-03-19, exact outline-guide test)
- Replaced the approximate silhouette guide with the user-provided exact outline SVG at `tmp/imagegen/refs/settlement-outline-user.svg`.
- Rasterized that to `settlement-outline-user.png` and used it as the sole geometry guide in a `sketch-to-render` pass:
  - `output/imagegen/piece-settlement-iterative/20-user-outline-render.png`
- Result:
  - the model still rounds the lower face back into a generic house shape instead of respecting the exact flat-bottom + obtuse-angle guide,
  - this is the clearest evidence so far that `imagegen` is not reliable enough to solve the final settlement geometry.

## Status (2026-03-19, manual settlement SVG rebuild)
- Rebuilt `public/svgs/settlement_red.svg` by hand instead of continuing prompt iteration.
- Geometry source:
  - preserved the Colonist settlement silhouette / roof-face line structure,
  - used the exact same roof/body/door angle language from `public/svgs/settlement_red_colonist.svg` and `public/svgs/settlement_colonist_outline.svg`.
- Style source:
  - applied the softer Catana orange gradient family from the newer traced settlement direction,
  - removed the hard Colonist magenta/black outline treatment in favor of tonal plane separation and a darker orange shell.
- Validation:
  - SVG passes `xmllint --noout`,
  - raster preview generated at `tmp/settlement-preview/settlement_red.png`,
  - side-by-side comparison generated at `tmp/settlement-preview/settlement_comparison_white.png`.
- Result:
  - the settlement now keeps the exact face/roof geometry the user wanted,
  - the rendering language is materially closer to the Catana board than the old Colonist asset,
  - remaining tradeoff is intentional: readability now comes from color-plane contrast rather than a hard perimeter stroke.

## Status (2026-03-19, red palette alignment pass)
- Kept the user-authored settlement geometry in `public/svgs/settlement_red.svg` and retuned only the color ramp.
- New red pass is anchored loosely to the existing Catana player red family in `app/catana/theme/playerColors.js`:
  - darker shell / outline tone moved from orange to a warm red-brown,
  - roof and face gradients shifted from orange/coral to a warmer red/coral ramp,
  - door darkened into a deeper red shadow tone.
- Verification:
  - `xmllint --noout public/svgs/settlement_red.svg`
  - raster preview generated at `tmp/settlement-preview/settlement_red_warm.png`
- Result:
  - the piece now reads as red rather than orange,
  - it still stays slightly warmer/softer than the avatar red, which should make it fit the board language better than a literal Tailwind red clone.
  - Follow-up micro-iteration selected `05-richer-right-roof` as the current live red:
    - right roof / darker planes got a small saturation and contrast bump,
    - light planes stayed warm so the asset does not drift back toward Colonist harshness.

## Status (2026-03-19, road SVG direction set)
- Drew three actual red road SVG candidates under `tmp/road-svg-exploration/` instead of continuing with prose-only direction discussion:
  - `road_red_variant_classic.svg`
  - `road_red_variant_ridge.svg`
  - `road_red_variant_chunky.svg`
- All three respect the current runtime constraints in `app/catana/Edge.js` / `app/catana/effects/placePiece.js`:
  - straight horizontal asset,
  - shallow strip proportions,
  - runtime rotation still handles direction on the board.
- Generated white-background previews plus a comparison sheet at:
  - `tmp/road-svg-exploration/road_variants_comparison.png`
- Current read:
  - `classic` is the safest baseline,
  - `ridge` is the strongest “match the settlement roof-plane language” option,
  - `chunky` is the most toy-like / bold but may be a little too stubby.

## Status (2026-03-19, softer road pass)
- Replaced the angular road exploration with a softer silhouette pass that fits Catana better.
- New SVG candidates:
  - `tmp/road-svg-exploration/road_red_variant_soft_capsule.svg`
  - `tmp/road-svg-exploration/road_red_variant_soft_chamfer.svg`
  - `tmp/road-svg-exploration/road_red_variant_soft_ribbon.svg`
- Generated a white-background comparison sheet at:
  - `tmp/road-svg-exploration/road_variants_soft_comparison.png`
- Current read:
  - `soft_capsule` is friendliest but risks feeling too generic/mobile,
  - `soft_chamfer` is the strongest balance between “piece” and “Catana softness,”
  - `soft_ribbon` is the safest / simplest if we want almost no shape personality.

## Status (2026-03-19, road gradient-only pass)
- Kept the preferred `soft_capsule` silhouette and explored gradient-led rendering instead of the inset two-tone panel treatment.
- New SVG candidates:
  - `tmp/road-svg-exploration/road_red_variant_soft_capsule_gradient_plain.svg`
  - `tmp/road-svg-exploration/road_red_variant_soft_capsule_gradient_sheen.svg`
  - `tmp/road-svg-exploration/road_red_variant_soft_capsule_gradient_edge.svg`
- Comparison sheet generated at:
  - `tmp/road-svg-exploration/road_variants_soft_capsule_gradient_comparison.png`
- Current read:
  - `gradient_plain` is the cleanest and most board-native,
  - `gradient_sheen` adds softness but risks reading a little glossy,
  - `gradient_edge` keeps more piece definition and is the strongest if we want a slightly richer token.

## Status (2026-03-19, road taper variants)
- Took the `gradient_plain` capsule road and tested subtle pointed/tapered ends instead of a pure capsule.
- New candidates:
  - `tmp/road-svg-exploration/road_red_variant_soft_taper_subtle.svg`
  - `tmp/road-svg-exploration/road_red_variant_soft_taper_mid.svg`
  - `tmp/road-svg-exploration/road_red_variant_soft_taper_strong.svg`
- Comparison sheet:
  - `tmp/road-svg-exploration/road_variants_taper_comparison.png`
- Current read:
  - `taper_subtle` is the only one that adds useful piece identity without becoming too classic/stylized,
  - `taper_mid` and `taper_strong` start reading more like tokens/badges than a soft Catana road.

## Status (2026-03-19, rounded-hex road pass)
- Tested a new road direction based on the placeholder’s hex-corner logic, but rounded/softened.
- New candidates:
  - `tmp/road-svg-exploration/road_red_variant_hex_round_soft.svg`
  - `tmp/road-svg-exploration/road_red_variant_hex_round_balanced.svg`
  - `tmp/road-svg-exploration/road_red_variant_hex_round_strong.svg`
- Comparison sheet:
  - `tmp/road-svg-exploration/road_variants_hex_round_comparison.png`
- Current read:
  - `hex_round_balanced` is the strongest bridge between the old placeholder silhouette and the newer Catana softness,
  - `hex_round_soft` is probably too close to the capsule,
  - `hex_round_strong` starts tipping back toward a harder token silhouette.

## Status (2026-03-19, rounded-hex road shell thinning)
- Compared the original `hex_round_balanced` road against thinner-shell follow-ups:
  - `tmp/road-svg-exploration/road_red_variant_hex_round_balanced_thin.svg`
  - `tmp/road-svg-exploration/road_red_variant_hex_round_balanced_ultrathin.svg`
- Comparison sheet:
  - `tmp/road-svg-exploration/road_variants_hex_round_thin_comparison.png`
- Current read:
  - `balanced_thin` is the best fit so far,
  - `balanced_ultrathin` starts losing too much token definition,
  - original `balanced` confirms the earlier concern that the shell/border read too heavy against the live settlement.

## Status (2026-03-19, rounded-hex road shorter ends)
- Shortened the end caps on the current `balanced_thin` road to reduce the stretched placeholder feel.
- New candidates:
  - `tmp/road-svg-exploration/road_red_variant_hex_round_balanced_short_ends.svg`
  - `tmp/road-svg-exploration/road_red_variant_hex_round_balanced_tight_ends.svg`
- Comparison sheet:
  - `tmp/road-svg-exploration/road_variants_hex_round_short_ends_comparison.png`
- Current read:
  - `balanced_short_ends` is the strongest refinement,
  - `balanced_tight_ends` starts getting too compressed/rounded and loses some of the nice road-piece tension.

## Status (2026-03-19, red road asset applied)
- Replaced the copied placeholder in `public/svgs/road_red.svg` with the chosen `balanced_thin` rounded-hex road.
- This keeps:
  - the softer rounded-hex silhouette,
  - the thinner perimeter shell,
  - the gradient-led red treatment that matches the new settlement better than the old hard outlined road.
- Verification:
  - `xmllint --noout public/svgs/road_red.svg`
  - rendered preview at `tmp/road-preview/road_red_applied.png`

## Status (2026-03-19, road same-box rounded reset)
- Confirmed the core constraint:
  - the road must keep the old blue template box/footprint,
  - but should still use the softer rounded Catana design language rather than the hard old placeholder silhouette.
- `public/svgs/road_red.svg` now keeps the exact same viewBox as `public/svgs/road_blue.svg`:
  - `-70.835 76.935 193.57 39.71`
- Within that same box, red road geometry was redrawn into a rounded capsule-like Catana piece instead of reusing the blue road’s hard-edged polygon.
- Verification:
  - `xmllint --noout public/svgs/road_red.svg`
  - confirmed matching viewBox values for `road_blue.svg` and `road_red.svg`
  - isolated render: `tmp/road-preview/road_red_rounded_same_box.png`
  - board-context mock: `tmp/road-preview/road_red_rounded_same_box_board_mock.png`

## Status (2026-03-19, road native-stroke pass)
- Replaced the road’s fake outer shell layer with a native SVG `stroke` on the rounded body path.
- Reason:
  - the shell-layer approach was making the perimeter feel too chunky and dumb on the board,
  - the road is simple enough that a real stroke is a better fit than the settlement’s manual shell construction.
- Current implementation:
  - same rounded path,
  - `stroke="#a4221a"`,
  - `stroke-width="3.25"`,
  - `stroke-linejoin="round"`,
  - `paint-order="stroke fill"` so the fill sits inside the rim more cleanly.
- Verification:
  - `xmllint --noout public/svgs/road_red.svg`
  - isolated render: `tmp/road-preview/road_red_stroke_white.png`
  - board-context mock: `tmp/road-preview/road_red_stroke_board_mock.png`

## Status (2026-03-19, road cross-gradient correction)
- Corrected the road gradient interpretation:
  - the user wanted the tonal change to run across the road thickness,
  - not along the road length.
- Updated the `body` gradient in `public/svgs/road_red.svg` so the road now has:
  - lighter top/bottom edges,
  - darker middle band through the center.
- No geometry or stroke changes in this pass.
- Verification:
  - `xmllint --noout public/svgs/road_red.svg`
  - isolated render: `tmp/road-preview/road_red_stroke_cross_gradient_white.png`
  - board-context mock: `tmp/road-preview/road_red_stroke_cross_gradient_board_mock.png`

## Status (2026-03-19, blue road parity pass)
- Applied the current live red-road treatment to `public/svgs/road_blue.svg`.
- Blue road now matches red road in:
  - geometry,
  - shared template viewBox,
  - native stroke approach,
  - cross-road gradient structure.
- Only the palette changed to a blue player-color ramp and darker blue rim.
- Verification:
  - `xmllint --noout public/svgs/road_blue.svg`
  - isolated render: `tmp/road-preview/road_blue_new_white.png`
  - board-context mock: `tmp/road-preview/road_blue_new_board_mock.png`

## Status (2026-03-19, blue settlement parity pass)
- Replaced the old Colonist-style `public/svgs/settlement_blue.svg` with the current live red-settlement geometry and a blue palette translation.
- Blue settlement now matches red settlement in:
  - silhouette,
  - perspective,
  - shading structure,
  - overall Catana rendering language.
- Only the color ramp changed, keyed to the blue player family and the new blue road.
- Verification:
  - `xmllint --noout public/svgs/settlement_blue.svg`
  - isolated render: `tmp/settlement-preview/settlement_blue_new.png`
  - red/blue comparison: `tmp/settlement-preview/settlement_red_blue_comparison.png`

## Status (2026-03-19, slight road length increase)
- Made the live red and blue roads a little longer without touching layout code.
- Implementation detail:
  - kept the same `viewBox` and renderer footprint,
  - stretched the road path occupancy inside the box by moving the start/end from `-53.5 / 104` to `-57 / 107.5`.
- This is the correct low-risk fix for tighter visual road connections:
  - it reduces the visible gap between adjacent roads,
  - while preserving board placement math and rotation behavior.
- Verification:
  - `xmllint --noout public/svgs/road_red.svg public/svgs/road_blue.svg`
  - renders:
    - `tmp/road-preview/road_red_longer.png`
    - `tmp/road-preview/road_blue_longer.png`
    - `tmp/road-preview/road_red_blue_longer_comparison.png`

## Status (2026-03-19, road end clipping fix)
- After the slight length increase, the road ends started clipping on-board.
- Root cause investigation showed the rendered road pixels were touching the horizontal edges of the SVG image:
  - before fix: high-res blue road render bounds were `0 .. 1999`
  - so the issue was real SVG/image clipping, not board placement math.
- Fixed by adding a tiny shared horizontal pad to the road `viewBox`:
  - old: `-70.835 76.935 193.57 39.71`
  - new: `-73.835 76.935 199.57 39.71`
- This preserves the longer road shape while giving the tips enough image-space margin to avoid being chopped.
- Verification:
  - `xmllint --noout public/svgs/road_red.svg public/svgs/road_blue.svg`
  - high-res blue render bounds after fix: `2 .. 1983` (no edge touch)
  - render: `tmp/road-preview/road_blue_no_clip_white.png`

## Status (2026-03-19, city red stretch pass 1)
- Replaced the old Colonist-style `public/svgs/city_red.svg` with a first settlement-derived city pass.
- This first pass intentionally keeps the city conservative:
  - same roof silhouette and roof-plane treatment as the live settlement,
  - taller front body overlay,
  - lowered/taller door,
  - one centered upper window,
  - no annex yet.
- Verification:
  - `xmllint --noout public/svgs/city_red.svg`
  - isolated render: `tmp/city-preview/city_red_stretch_pass1.png`
  - settlement/city comparison: `tmp/city-preview/settlement_city_red_comparison.png`

## Status (2026-03-22, city red palette alignment)
- Tuned the live `public/svgs/city_red.svg` colors so the rear/right city mass sits closer to the established red settlement palette.
- Kept geometry untouched and only adjusted rear gradient stops:
  - removed the overly dark top reds in the rear roof/body gradients,
  - moved the rear cap/body fills back toward the same warm coral-red family used by `public/svgs/settlement_red.svg`,
  - left the front house colors alone.
- Result:
  - the city now reads more like the same red asset family as the settlement,
  - the rear section no longer punches darker/harsher than the main house.
- Verification:
  - `xmllint --noout public/svgs/city_red.svg`
  - isolated render: `tmp/city-preview/city_red_live_palette_check_tuned.png`
  - settlement/city comparison: `tmp/city-preview/settlement_city_red_palette_comparison_tuned.png`

## Status (2026-03-22, city blue palette transfer)
- Replaced the old Colonist-style `public/svgs/city_blue.svg` with the same live city structure now used by `public/svgs/city_red.svg`.
- This was a straight palette transfer, following the same pattern used earlier for the settlement assets:
  - kept the city geometry/style aligned to the live red city,
  - swapped shell, door, face, roof, and rear-mass colors into the established blue family from `public/svgs/settlement_blue.svg`,
  - kept the rear/right city mass in the same relative palette relationship as the tuned red city.
- Result:
  - blue city now reads as the same asset family as both the red city and blue settlement,
  - and no longer uses the old black-stroked Colonist city treatment.
- Verification:
  - `xmllint --noout public/svgs/city_blue.svg`
  - isolated render: `tmp/city-preview/city_blue_new.png`
  - red/blue city comparison: `tmp/city-preview/city_red_blue_comparison.png`
  - blue settlement/city comparison: `tmp/city-preview/settlement_city_blue_comparison.png`

## Status (2026-03-22, city blue rear-roof softening)
- Softened the blue city’s small rear roof/body transition after it read a bit harsher than the rest of the asset family.
- Kept geometry untouched and made the smallest possible palette change:
  - darkened the lightest stop of the rear body gradient from `#82d8ff` to `#6fc3ff`,
  - leaving the rest of the city blue palette intact.
- Result:
  - the rear roof/body seam reads less abrupt,
  - while still keeping the lower rear block a bit more side-on than the main house.
- Verification:
  - `xmllint --noout public/svgs/city_blue.svg`
  - softened render: `tmp/city-preview/city_blue_softened.png`
  - before/after comparison: `tmp/city-preview/city_blue_softened_comparison.png`

## Status (2026-03-28, dev-only scenario tooling)
- Added a dev-only Catana scenario path that avoids the old brittle mid-match `ctx` hot-load.
- `app/api/scenarios/route.js` now normalizes legacy scenario files and saves new files as `{ state: <G> }` instead of raw `{ G, ctx }` snapshots.
- `app/catana/Game.js` now accepts `setupData.devScenarioState` outside production and seeds boardgame.io `ctx` from the saved Catana turn/phase so a match can boot straight into the saved point.
- Reintroduced a cleaned-up `DebugPanel` in `app/catana/GameScreen.js`, gated by `NODE_ENV !== "production"`:
  - player selector,
  - give resource buttons,
  - give dev-card buttons,
  - save current state as a named scenario via an authoritative debug snapshot capture,
  - no in-match scenario load button.
- Added dev-only lobby support in `app/catana/lobby/LobbyPageClient.js`:
  - fetches saved scenarios from `/api/scenarios`,
  - shows a `Start from scenario` control in the custom-game area,
  - creates matches with `setupData.devScenarioState`.
- Added a new debug move `DEBUG_takeDevCards` and coverage for:
  - scenario API normalization,
  - setup-time scenario boot,
  - debug move exposure,
  - dev-card grant behavior,
  - scenario snapshot capture/clear behavior,
  - dev-only UI wiring in lobby/game screen.
- Tuned the new resource card-back asset in `public/svgs/resource_back.svg` to the approved `B` palette direction:
  - lighter Catana-leaning blue ramp and frame,
  - subtle cream gradients on the outer card stock and center hex face,
  - structure and gold linework otherwise preserved.
- Finalized the resource card-back divider treatment in `public/svgs/resource_back.svg`:
  - replaced the full horizontal band with split `15px` side bars,
  - kept the mid-card anchor while making the center medallion feel less boxed in.
- Locked in the alternate hex-emblem resource-back concept in `public/svgs/resource_back_hex_design.svg`:
  - kept the five-hex center motif,
  - switched it to the approved uniform debossed `balanced` treatment so all inner hexes share the same local shading,
  - slightly enlarged/repositioned the inner motif for better read inside the main badge.
- Refined the dev-card back draft in `public/svgs/devback_design.svg`:
  - kept the same overall card shell as the resource-back family,
  - softened the orange field toward a calmer amber-clay gradient,
  - gave the enlarged circular seal a subtle cream gradient,
  - slightly reduced the center treatment and shortened the side stubs for better spacing.
- Revised the dev-card back field in `public/svgs/devback_design.svg` after comparing it against the live board palette:
  - replaced the muddier amber-clay field with a brighter board-orange gradient,
  - kept the approved cream shell, enlarged circular seal, and shorter side stubs unchanged,
  - anchored the new orange closer to the existing Catana brick/dev-card warm palette so it contrasts more cleanly with the blue resource back.
- Promoted the approved card-back designs into the live board asset filenames:
  - `public/svgs/card_rescardback.svg` now uses the approved `resource_back_hex_design.svg` art,
  - `public/svgs/card_devcardback.svg` now uses the approved `devback-seal-flat-rim.svg` art,
  - kept the existing opponent stack sizing unchanged because the new backs preserve the old portrait aspect ratio and render cleanly at the current `52x72` board size.
- Reverted the live resource back to the simpler hex version after board-scale review:
  - `public/svgs/card_rescardback.svg` now mirrors `public/svgs/resource_back.svg` instead of the busier five-hex badge concept,
  - kept `public/svgs/card_devcardback.svg` unchanged,
  - left the hidden-card board sizing untouched because the simpler replacement keeps the same portrait footprint.
- Finalized a small board-scale polish pass on the live dev back:
  - slightly increased the central seal in `public/svgs/card_devcardback.svg`,
  - lengthened and lightened the middle stubs so they remain visible on the orange field,
  - mirrored the same tweak into `public/svgs/devback-seal-flat-rim.svg` so the source concept stays aligned with the live asset.
- Updated the non-production dev-card icon copy to match the newer card-back seal treatment:
  - edited `public/svgs/icon_devcard_.svg` only, leaving `public/svgs/icon_devcard.svg` untouched,
  - swapped the old gray/glossy outer rim for the flatter cream seal used on `public/svgs/card_devcardback.svg`,
  - removed the separate glossy rim stroke so the copy icon reads like the same badge family as the live dev-card back.
- Added a restrained depth pass to the `Year of Plenty` dev-card front in `public/svgs/year_of_plenty.svg`:
  - introduced soft warm drop shadows on the two overlapping resource-card backs,
  - added a much lighter matching shadow to the `+2` text,
  - kept the stronger between-card shadow layer so the cards still separate clearly without making the text feel embossed.
- Tuned the `Year of Plenty` card shadows one more step after review:
  - increased only the two card-back drop shadows,
  - left the `+2` text shadow unchanged,
  - landed on a slightly stronger read that still stays soft and Catana-flat.
- Normalized `public/svgs/year_of_plenty.svg` back onto the standard card canvas:
  - replaced the accidental multi-million-unit root `viewBox`/`width`/`height`,
  - set it to the same `1256 x 1750` card coordinate system used by the other card assets,
  - so it opens and frames correctly in tools like Inkscape without the art disappearing onto a huge page.
- Fixed `public/svgs/year_of_plenty.svg` to be fully self-contained for editor compatibility:
  - removed broken `softShadow` / `hexShadow` filter references from the copied resource-card groups,
  - replaced stale unresolved gradient IDs like `outerCream` / `faceCream` / `topWarm` with local IDs or `none`,
  - so Inkscape no longer drops the card artwork and only shows the clipped shadow layer.
- Replaced `feDropShadow` usage in `public/svgs/year_of_plenty.svg` with explicit blur/composite filter chains:
  - kept the same card/text shadow intent,
  - but switched to a more conservative SVG filter structure that should be more compatible with Inkscape’s renderer.
- Tuned the road piece inside `public/svgs/roadbuilding.svg` to match the Catana road-family shading in a dev-card material palette:
  - kept the same three-stop road gradient structure used by `public/svgs/road_red.svg` and `public/svgs/road_blue.svg`,
  - replaced the dull gray-beige middle band with a warmer sand-gold center,
  - shifted the road outline to a darker gold-brown so it reads like dev-card trim rather than player paint.
- Added a separate warm receiver/player bust asset for Monopoly/front-card concept work:
  - kept the original dark `public/svgs/bust_in_silhouette_color.svg` untouched for “other player” use,
  - created `public/svgs/bust_in_silhouette_warm.svg` from the same geometry,
  - remapped its gradients into a muted honey/peach version of the smiling-face palette so it reads friendlier without turning into a literal emoji face.
- Polished the Monopoly dev-card working composition in `public/svgs/monopoly_working.svg`:
  - replaced the neon-green arrow fill with a cream-to-gold gradient that matches the card border/material system,
  - reduced the visual weight of the top dark-bust row by shrinking and lifting the giver groups,
  - enlarged and raised the warm receiving bust so the destination player reads more clearly in the lower half.
- Ran a follow-up alignment pass on `public/svgs/monopoly_working.svg` after manual drag edits:
  - re-centered the middle card on the main card axis,
  - leveled the left/right cards so they sit at matching heights,
  - and evenly spaced the three arrows on a shared horizontal row with the center arrow aligned to the main centerline.
- Ported the robber placement UX from the separate `codex/robber-placement-ux` worktree back into the live root branch:
  - restored the `playful` robber follower as the default root-branch behavior while preserving the `minimal` path behind `resolveRobberPlacementMotionMode`,
  - merged the board/tile integration, portal preview, magnetic target logic, head-led lean, origin-robber dimming, and board-only landing shadow into the branch that also carries the current graphics work,
  - and verified the focused robber-placement Vitest slice plus targeted ESLint pass in the root repo after the port.
