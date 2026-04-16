# Left Meta Rail Side-Tab Ribbon Production Design

Date: 2026-04-16
Scope: Production desktop `LeftMetaRail` integration of the approved side-tab ribbon treatment from `/catana/dev/sidebar-connection`
Status: Approved for implementation planning

## Goal

Bring the approved side-tab ribbon design into the real Catana game screen by replacing the current desktop `LeftMetaRail` shell/chrome with the ribbon treatment proven in the dev study, while keeping the existing production content and behavior intact.

For this slice:

- desktop production adopts the `Side-Tab Ribbon` treatment,
- `Game Log` and `Chat` remain open by default on desktop,
- both panels remain independently toggleable,
- rows still flow downward naturally when open,
- `GameLogPanel` and `ChatPanel` remain the real panel content implementations,
- mobile behavior is intentionally out of scope unless the desktop refactor requires a tiny shared helper.

## Non-goals

- No redesign of `GameLogPanel` or `ChatPanel` internals unless a tiny parent-driven styling seam requires a new prop.
- No product behavior changes for desktop open/close rules.
- No gameplay, chat, or log data-flow changes.
- No dedicated mobile redesign in this slice.
- No second experimental sidebar system in production.

## Approved Direction

Treat this as a production shell/layout replacement inside `LeftMetaRail`, not as a new sidebar architecture.

The design direction is:

- keep `GameScreen -> LeftMetaRail` integration unchanged,
- keep `LeftMetaRail` as the owner of panel order and open state,
- replace the current desktop dock connector and panel shell with the side-tab ribbon geometry,
- keep the real production `GameLogPanel` and `ChatPanel` mounted inside that shell,
- keep the dev study available as the visual proving ground for geometry refinements.

This means production should visually and behaviorally match the approved dev ribbon as closely as practical, while still using the real production content payloads.

## Architecture

### Production ownership

`LeftMetaRail` remains the production entry point mounted by `GameScreen`.

Within `LeftMetaRail`:

- desktop keeps owning:
  - panel order,
  - default-open state,
  - toggle behavior,
  - row-by-row rendering,
  - panel content selection.
- the desktop row renderer becomes responsible for:
  - fixed dock button placement,
  - SVG side-tab shell,
  - lifted header/tab geometry,
  - both-open row spacing,
  - panel clipping/chrome,
  - production-sized panel shell styling.

### Content reuse

`GameLogPanel` and `ChatPanel` stay as the real content bodies.

Preferred implementation order:

1. Reuse them with parent-provided class overrides only.
2. Add a small prop only if the ribbon shell exposes a real mismatch.
3. Avoid forking or duplicating panel content for the ribbon layout.

The integration should not collapse layout logic into the content panels.

## Geometry And Behavior Rules

The production desktop ribbon should preserve the geometry rules proven in the dev route:

- the clicked button remains fixed in the dock stack,
- the open shell rises above the button so the header reads as attached,
- consecutive open rows reserve full occupied panel height plus the configured inter-panel gap,
- the panel content clips to the same rounded shell corners,
- both-open remains the only state that expands the vertical distance between buttons.

The production implementation does not need to copy the dev file wholesale, but it should preserve the same visual rules and interaction model.

## File-Level Direction

Primary files:

- `app/catana/components/LeftMetaRail.js`
- `app/catana/components/GameLogPanel.js`
- `app/catana/components/ChatPanel.js`
- `app/catana/__tests__/LeftMetaRail.test.js`

Supporting reference:

- `app/catana/dev/sidebar-connection/SidebarConnectionClient.js`
- `app/catana/__tests__/SidebarConnectionStudy.source.test.js`

Expected implementation shape:

- migrate the current desktop `LeftMetaRail` connector/button/panel shell to the side-tab ribbon treatment,
- keep `MobileMetaRail` unchanged unless a tiny shared helper naturally improves the desktop implementation,
- preserve parent-provided content overrides for log/chat panels,
- update tests so production now asserts the side-tab ribbon structure rather than the old connector silhouette.

## Verification

Automated verification should cover:

- desktop still renders both rows open by default,
- desktop still renders independent `log` and `chat` rows,
- desktop source/render output reflects the side-tab ribbon structure rather than the old connector shell,
- mobile rail still renders and is not accidentally removed or broken by the desktop refactor.

Manual verification should cover the real game screen:

- both-open desktop state,
- log-only state,
- chat-only state,
- fixed button stack feel during toggles,
- no overlap/clipping in the real board context,
- chat composer still usable,
- production desktop ribbon visually aligned with the dev study.

## Risks

- Pulling too much mockup-only code into production could tangle production behavior with dev-route concerns.
- Over-customizing `GameLogPanel` / `ChatPanel` for the ribbon shell could blur layout/content responsibilities.
- If the production board context has tighter spatial constraints than the dev study, some sizing/chrome tokens may need small follow-up adjustments after first integration.

## Recommendation

Implement this as a focused desktop `LeftMetaRail` shell replacement. Keep the real content panels intact, preserve production behavior, and use the dev study as the visual reference rather than as a file to be copied verbatim.
