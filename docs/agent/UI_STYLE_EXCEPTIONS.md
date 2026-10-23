# Owned artwork and geometry contracts

This is a rationale register, not an additional whitelist. The exact file,
property/utility, value and occurrence counts remain in
`scripts/design-system/legacy-styles.json`. The policy fails on either growth or
stale entries. No directory is exempted to make the migration pass.

Product text, controls and panels use the shared foundations. The following
renderers have different coordinate systems or data contracts; their deliberate
values must not be mechanically replaced with product typography or colours.

| Owner | Retained contract | Why product tokens do not apply |
| --- | --- | --- |
| `app/_features/game/board/Tile.js`, `board/Tile.css`, `board/Board.css` | Resource-tile number chips, pips and board marker geometry | Font size, spacing and corners scale with tile/board coordinates, not document headings or controls. |
| `app/_features/game/board/ActionNode.js`, `board/BoardPortChannels.jsx`, `board/BuildPlacementPreview.js`, `board/RobberPlacementPreview.js` | Circular nodes, connector and placement shapes | These are board-positioned graphics, not panels or form controls. |
| `app/_features/game/board/Port.jsx`, `board/Port.css` | Port resource and ratio artwork | Ratio-label fit is part of the small port graphic. |
| `app/_features/game/feed/FeedTokenRow.jsx` | Miniature dice, resource and tile tokens | Feed prose uses normal roles; miniature artwork preserves its source token proportions. |
| `app/catana/components/MiniDiceFace.js`, `app/_features/game/hud/Die.css` | Dice faces and pips | Circular pip geometry and face contrast are graphic marks. |
| `app/_features/theme/playerColors.js` | Player identity palette and contrast decisions | Player colour is game/user data, not interface emphasis. |
| `app/_features/game/dialogs/GameOverModal.js`, `PostgameOverlay.js`, `app/replays/components/ReplayScoreChart.jsx` | Player-derived swatch/chart colours | Results and replay retain the player's identity colour. Surrounding copy, charts and controls use shared recipes. |
| `app/_features/home/HomeTitleChrome.js` | Optional Sx/logo SVG glyph fit | Fixed-coordinate logo artwork, separate from Outfit UI and the opt-in display face. Unused action styling metadata is removed. |
| `app/_features/home/demo/HomeDemoBoardPoster.js`, `HomeDemoBoardPoster.module.css`, `homeDemoSequence.js` | Scaled poster number chips and player-colour data | The fallback must visually match the live board and demo sequence. |
| `app/catana/dev/storybook/*Fixtures.js` | Explicit player-colour fixture data | Identity values are intentionally illustrative, not consumer CSS. |
| `app/opengraph-image.jsx` | Fixed-format social-share composition | Server-rendered image typography, tile scale and canvas coordinates do not inherit browser UI CSS. |
| `app/replays/components/ReplayPanel.jsx`, `replayPanelLayout.js` | Flush drawer edge and perspective-seat clearance | Zero joining corners and responsive board-seat exclusion space are integrated layout contracts. |
| `app/_features/game/cards/AnimatedCount.css` | Unit line height and ±.14em number-roll clip room | These values align and clip animated digits; gain/loss colours use shared aliases. |
| `app/_features/game/cards/DevCardDisplay.css`, `MobileDevCardButton.js`, `MobileDevCardTray.js` | Mini-card corners and fan-bay padding | They fit card artwork and fan anchors; the surrounding bay/control uses role-based corners. |
| `app/_features/theme/hudGlass.css` | Joined nameplate corners and sub-rem connector padding | The plate joins the avatar rather than behaving as an independent product panel. |
| `app/_features/game/hud/MobilePlayerCockpit.js`, `app/_features/game/hud/PlayerAvatarStats.js`, `app/_features/game/hud/StatusBubble.css` | Emoji glyph sizes, circular status marks and phone safe-area expression | Emoji are graphics; viewport safety and board anchoring are not ordinary content spacing. All adjacent copy/counters use complete HUD roles. |
| `app/catana/components/TurnControlCluster.js` | 1.45-unit SVG stroke | The turn-control icon's optical stroke belongs to its vector drawing. |
| `app/catana/dev/effects/DevCardRevealLab.jsx` | 9 reveal-stage lighting, apex, destination-anchor and miniature dock/card sample values | These drawings are the effect comparison under test, not console controls. |
| `app/catana/dev/palette-preview/PaletteBoardPreviewClient.js` | 14 generated number/pip token appearance values | Token artwork must scale with the board; surrounding selectors and prose use shared roles. |
| `app/catana/dev/ui/UiShowcaseClient.js` | 3 decorative canvas/hero/HUD backdrop gradients | These are backdrop demonstrations, not alternative control materials. |
| `app/catana/dev/viewports/ViewportWallClient.js` | 3 comparison-wall backdrop, iframe loading canvas and frame-edge values | The wall preserves explicit viewport comparisons; its labels and scaling controls use shared foundations. |

The approved wordmark-fitting module and global recipe owner are explicit owners
in the checker. Their ownership is not permission to move arbitrary page styling
there. New shared roles/materials need a demonstrated use, catalog example and
rendered verification.

## Review rules

- Review any changed exception against its actual drawing, player-data source or
  joined layout. A variable named “art” does not make ordinary controls exempt.
- Do not normalize board numbers, avatar emoji, card fans or placement anchors as
  though they were body copy, padding or control corners.
- Keep ordinary labels, inputs, menus and buttons in developer tools on the same
  foundations as production. Experimental drawings may preserve their comparison
  geometry; operational control chrome may not use that exception.
- This register does not assert WCAG conformance. In particular, the approved
  bright-lime/white action palette has a known contrast limitation.
