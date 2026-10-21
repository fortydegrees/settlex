# Left Meta Rail Utility Dock Redesign

Date: 2026-04-25
Scope: Catana in-game left meta rail for Game Log, Chat, and future support panels
Status: Approved for implementation planning

## Goal

Redesign the Catana left meta rail as a stable utility dock with independently open docked panels.

The rail exists to help players understand and coordinate around the game without taking over the board. `Game Log` and `Chat` should be visible by default on desktop, but players should be able to minimize either panel when they want more board space.

This redesign should use the new Settlex standard UI direction where it helps, while preserving the rail as game HUD support UI rather than a generic page sidebar.

## User-Approved Direction

Use a launcher rail plus independent docked cards.

The approved model is:

- a compact vertical rail of launcher buttons,
- each launcher controls its own panel,
- multiple panels can be open at the same time,
- desktop defaults to both `Game Log` and `Chat` open,
- open and width preferences persist locally,
- future support panels can join the rail without reworking the layout,
- the visual join between a launcher and its panel should be simple and stable,
- the panel body should be a normal Settlex glass card, not part of one large custom SVG shell.

## Non-Goals

- Do not redesign `GameLogPanel` or `ChatPanel` content behavior.
- Do not move primary gameplay controls into this rail.
- Do not change game rules, chat transport, or log data flow.
- Do not force a new mobile multi-open interaction in this slice.
- Do not add a new UI library or styling system.
- Do not revive the prior complex unified side-tab SVG shell as the main architecture.

## UX Problem

The log and chat are supporting HUD surfaces:

- the game log helps players recover context and understand recent events,
- chat helps players coordinate,
- both are useful enough to show by default,
- both can become visual noise or board obstruction once a player has enough context.

The rail should therefore be persistent but low-interference. It should make support surfaces easy to reveal, minimize, and revisit without hiding large portions of the board when closed.

## Component Definition

This is a utility dock, not a classic sidebar.

It is not:

- a tabstrip, because tabs usually imply one active panel,
- a navigation menu, because these controls do not navigate pages,
- a drawer, because desktop panels should stay open while players interact with the board,
- a generic accordion, because the launcher rail and docked card relationship matters.

It is:

- a vertical support toolbar,
- a set of independently controlled collapsible docked panels,
- a floating game HUD element over the board.

## Architecture

`LeftMetaRail` remains the production entry point mounted by `GameScreen`.

Suggested internal structure:

- `LeftMetaRail`
  - owns desktop/mobile split,
  - receives log/chat data and passes content props through,
  - delegates desktop layout to `DesktopMetaDock`,
  - keeps mobile behavior separate.
- `DesktopMetaDock`
  - owns desktop open state,
  - owns shared desktop width,
  - owns local persistence,
  - renders the rail and the docked panel rows from panel metadata.
- `RailButton`
  - stable icon-only launcher button,
  - accessible label,
  - active/minimized visual state,
  - no panel layout ownership.
- `DockedMetaPanel`
  - normal rounded glass panel positioned beside the launcher rail,
  - optional compact header with title and close/minimize control,
  - content slot for `GameLogPanel`, `ChatPanel`, or future support panels.
- `RailTabBridge`
  - small visual bridge between an active launcher and its panel,
  - simple CSS geometry,
  - no large morphing path or generalized attachment system.

`GameLogPanel` and `ChatPanel` remain content payloads. They may receive class overrides for shell size, scroll viewport, header, and footer, but they should not own dock layout or persistence.

## Standard UI Primitive Mapping

Use existing and near-term Settlex primitives where they fit:

- current `app/ui/IconButton.js` for rail launchers, or a rail-specific wrapper over it,
- current `app/ui/Panel.js` for docked panel card chrome,
- future `Tooltip` for icon labels,
- future `ScrollArea` for log/chat scroll containers,
- a controlled `Collapsible` behavior wrapper for independent panel open/close.

External references reviewed:

- Base UI Toolbar: rail semantics as a grouped set of controls.
  - https://base-ui.com/react/components/toolbar
- Base UI Collapsible: controlled independent open/closed panel behavior.
  - https://base-ui.com/react/components/collapsible
- Base UI Accordion: relevant only for the `multiple` open-panels behavior, but not the primary visual model.
  - https://base-ui.com/react/components/accordion
- Base UI Popover: useful for small future transient surfaces, but not for persistent log/chat panels.
  - https://base-ui.com/react/components/popover

The implementation should not copy external visual styling. It should translate the behavior into the Settlex/Catana light glass system.

## Desktop Behavior

Initial desktop behavior:

- first load defaults to `openPanels = ["log", "chat"]`,
- if valid saved preferences exist, saved open state wins,
- saved width wins after clamping to safe desktop bounds.

Panel behavior:

- clicking `Log` toggles only the log panel,
- clicking `Chat` toggles only the chat panel,
- both panels may be open at once,
- either panel may be closed independently,
- board clicks do not auto-close open panels,
- closed panels do not reserve or block a large invisible board area.

Persistence:

- persist `openPanels`,
- persist shared `panelWidth`,
- keep the existing reserved `panelHeights` shape if present, but do not implement height resizing in this redesign unless explicitly planned later.

Width:

- preserve one shared desktop width for all docked panels,
- keep the current subtle invisible right-edge resize affordance if the existing behavior remains useful,
- clamp width so the rail cannot cover too much of the board.

## Keyboard And Accessibility

Rail buttons should be normal accessible buttons with:

- `aria-label`,
- `aria-expanded`,
- `aria-controls`,
- focus-visible treatment,
- stable keyboard activation.

The vertical rail can follow toolbar-style semantics if that does not complicate the implementation. If `Toolbar` adds friction or conflicts with the existing game surface, plain grouped buttons with correct labels and focus states are acceptable for the first implementation.

Escape behavior should be local:

- pressing `Escape` while focus is inside a docked panel may close that panel,
- pressing `Escape` on a focused rail button may close its panel if open,
- pressing `Escape` while the player is interacting with the board should not globally collapse the whole rail.

Reduced motion must be respected.

## Mobile Behavior

Keep the current simpler mobile rail/drawer behavior unless a separate mobile redesign is approved.

Mobile can remain one active panel at a time for now because:

- viewport constraints are different,
- multi-open is a desktop-first requirement,
- preserving mobile avoids expanding this redesign into a second independent project.

The desktop component split should not make mobile worse or remove the current mobile path.

## Future Panels

Future rail items should be added through metadata rather than custom layout branches.

Suggested metadata shape:

```js
{
  id: "log",
  label: "Game Log",
  shortLabel: "Log",
  ariaLabel: "Toggle game log panel",
  icon: LogIcon,
  defaultOpenDesktop: true,
  desktopHeight: 286,
  renderPanel: renderGameLogPanel,
}
```

Good future candidates:

- help,
- settings,
- match info,
- trade history,
- player notes,
- event filters.

Do not add primary turn/build/resource controls here. Those remain gameplay controls.

## Visual Direction

The rail should feel like quiet Catana HUD chrome:

- light, frosted, and rounded,
- compact enough to avoid dominating the board,
- active state visible but not loud,
- no dark sidebar aesthetic,
- no heavy decorative connector,
- no large bouncy routine animation.

Rail:

- slim frosted vertical rail,
- 56-64px icon buttons,
- active button uses stronger glass and a small amber accent,
- inactive buttons remain readable but subdued.

Panels:

- normal Settlex glass cards,
- compact panel headers,
- dense readable feed bodies,
- chat composer stays practical and full-width inside chat,
- panel content clips to rounded card corners.

Bridge:

- small tab or overlap piece beside active button,
- built with simple CSS boxes/radii,
- visually connects button to card without owning the whole card outline.

Motion:

- 180-220ms standard UI transition,
- standard ease or `power3.out`,
- zero duration under reduced motion,
- no spring/bounce for routine rail open/close.

## Implementation Strategy

Implement as a focused production redesign of `app/catana/components/LeftMetaRail.js`.

Recommended sequence:

1. Add or prepare missing shared primitives if needed:
   - `Tooltip`,
   - `ScrollArea`,
   - a small controlled collapsible wrapper if it removes duplication.
2. Refactor desktop rail internals into simple composable pieces:
   - `RailButton`,
   - `RailTabBridge`,
   - `DockedMetaPanel`.
3. Replace the desktop custom side-tab shell with the composable docked-card layout.
4. Keep `GameLogPanel` and `ChatPanel` as content components with class overrides.
5. Preserve persisted desktop `openPanels` and `panelWidth`.
6. Keep mobile behavior unchanged.
7. Update agent docs after meaningful implementation changes.

## Testing

Automated coverage should include:

- desktop default open state includes both `log` and `chat`,
- panel toggles are independent,
- multiple panels can remain open,
- closed panels do not render panel-sized hitboxes,
- rail metadata includes `Game Log` before `Chat`,
- persisted open state normalizes invalid panel IDs,
- persisted width clamps to allowed bounds,
- mobile rail still exists.

Manual browser checks should use `/catana/dev/sandbox`:

- first desktop load shows both `Game Log` and `Chat`,
- log-only state works,
- chat-only state works,
- both-open state works,
- closing panels leaves only compact rail controls,
- board panning/dragging is not blocked by closed panel regions,
- width resize still feels subtle if retained,
- chat composer remains usable,
- reduced-motion setting removes rail transition motion.

## Risks

The main risks are:

- over-generalizing the rail into another abstract geometry system,
- losing the stable multi-open behavior by using tab semantics,
- breaking mobile while improving desktop,
- letting closed panels keep invisible overlay areas,
- duplicating `GameLogPanel` or `ChatPanel` instead of reusing content components.

Mitigation:

- use explicit composable pieces,
- keep panel metadata simple,
- keep content and dock layout separate,
- verify in the real sandbox, not only with source tests.

## Recommendation

Proceed with the launcher rail plus independent docked cards architecture.

This direction keeps the user-approved multi-open behavior, improves maintainability over the current custom side-tab shell, and gives the new Settlex standard UI system a clear role without forcing the game HUD into a generic web sidebar pattern.
