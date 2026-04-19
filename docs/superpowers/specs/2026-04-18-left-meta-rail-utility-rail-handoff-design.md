# Left Meta Rail Utility Rail Handoff Design

Date: 2026-04-18
Scope: Desktop `LeftMetaRail` product direction and handoff notes for future implementation/refinement
Status: Handoff design doc

## Purpose

This document is for handing the Catana desktop left meta rail work to another agent.

It consolidates:

- what kind of component this actually is,
- the user's preferred interaction and visual model,
- what earlier specs got right,
- what proved fragile in implementation,
- and the recommended architecture for future work.

This is intentionally more of a design-and-ownership handoff than a narrow implementation spec.

## Related Docs

These earlier docs remain useful as historical context:

- `docs/superpowers/specs/2026-04-16-sidebar-connection-overlap-and-lift-design.md`
- `docs/superpowers/specs/2026-04-16-left-meta-rail-side-tab-ribbon-production-design.md`
- `docs/superpowers/specs/2026-04-16-left-meta-rail-attachment-band-design.md`
- `docs/superpowers/specs/2026-04-16-left-meta-rail-anchor-modes-design.md`
- `docs/superpowers/specs/2026-04-17-left-meta-rail-width-resize-design.md`

Use those for implementation history. Use this document for the current product understanding and recommended mental model.

## High-Level Component Definition

This is **not** a classic tab component.

It is better understood as a:

- `utility rail`
- `launcher rail`
- or `game HUD dock with attached panels`

Core behavior:

- a fixed vertical stack of launcher buttons
- each button controls its own panel
- any combination of panels may be open
- panels are visually associated with their button
- the whole system floats over a primary game canvas

The best external analogies are:

- VS Code activity bar + side views
- floating utility/inspector panels in design tools
- Intercom-style launchers, but with multiple independent launchers
- game HUD overlay docks rather than page-layout sidebars

It is explicitly **not**:

- a tabstrip
- an accordion
- a single sidebar with one active section
- a standard drawer

## User-Validated Product Direction

### What the user wants

The user consistently wants the left meta rail to feel like a polished game utility dock, not a generic web widget.

Important product rules:

- the button stack is the stable anchor of the component
- multiple panels can be open at once
- open/close actions should feel local to the clicked button
- the system should interfere with board dragging/panning as little as possible
- width resizing is desirable and should persist
- open/closed state should also persist

### Visual rules the user clearly prefers

- the visible panel can just be a normal rounded card
- the button's open state should read as a stable rounded tab shape
- the join should feel smooth and intentional
- the component should use simple, visually consistent rules rather than clever geometry
- small spacing and silhouette details matter a lot

### Interaction rules the user clearly prefers

- the button stack should stay compact when possible
- closing a panel should not leave a large invisible hitbox blocking board interaction
- resize affordance should be subtle:
  - invisible edge handle is good
  - cursor change is enough
  - no explicit permanent resize glyph
- desktop positioning should behave like a floating HUD element, not a layout column

## Core Insight From The Iteration

The main implementation mistake was treating the desktop rail as one giant morphing shell.

That unified shell tried to encode all of the following in one geometry system:

- the button shape
- the connector shape
- the panel shell
- attachment mode
- row spacing implications
- animated transitions

This created a brittle system where a small change in one place broke several states elsewhere.

The user repeatedly preferred simpler visual rules over preserving the generalized geometry system.

## What The Component Should Be Built From

The recommended architecture is three simple pieces:

1. `RailButton`
2. `OpenButtonTab` or equivalent open-state tab extension
3. `DockedPanelCard`

Recommended mental model:

- the button is one thing
- the panel card is a separate thing
- the open-state tab/extension is a small supporting visual piece
- panel placement relative to the button should be explicit
- do not redraw the whole panel silhouette just because the visual attachment changes

This is more maintainable than a single SVG/path shell.

## Recommended Desktop Architecture

### Ownership

`LeftMetaRail` should remain the desktop owner of:

- panel order
- default-open state
- toggle behavior
- persisted width
- persisted open/closed state

### Suggested structural split

- `DesktopMetaDock`
  - owns open state, width state, persistence, row order
- `DesktopRailButton`
  - stable clickable button in the fixed stack
- `DesktopRailTabExtension`
  - optional open-state shape immediately to the right of the button
- `DesktopRailPanelCard`
  - normal rounded panel card positioned relative to the button

This keeps responsibilities small and understandable.

## Explicit Design Preferences Learned During Iteration

These points should be treated as high-confidence guidance for future work.

### Stable controls matter more than smart geometry

The user prefers:

- a stable button stack
- clear local open/close behavior
- consistent silhouettes

over:

- mathematically elegant attachment modes
- morphing geometry systems
- complex path logic

### Panel cards can be ordinary

The user explicitly accepted that the panel itself can just be a rounded rectangle/card.

This means:

- no need to treat the panel border as part of the open button shell
- no need for one shared SVG outline unless it is truly simpler
- no need for a bespoke connector piece if a tab extension plus slight card overlap already reads cleanly

### The visual goal is a clean HUD, not a flashy widget

The component should feel:

- calm
- stable
- deliberate
- game-native

It should not feel like:

- an animated novelty tab bar
- a morphing SVG demo
- a generic admin-panel sidebar

## Patterns Worth Using As Reference

The following existing UI patterns are good reference models:

### VS Code activity rail

Useful for:

- persistent icon rail
- launcher-first mental model
- stable controls next to changing panels

### Design-tool inspector docks

Useful for:

- floating utility panels over a primary workspace
- independent panel ownership
- separation between launcher and panel card

### Floating support/chat launchers

Useful for:

- button-to-panel visual relationship
- local open/close feel
- simple attached-card behavior

### Game HUD overlays

Useful for:

- priority of main canvas over support UI
- minimizing blocked interaction area
- treating the rail as part of the game HUD rather than page layout

## Anti-Patterns To Avoid

Avoid these directions unless the user explicitly asks for them.

### Do not treat this as a normal tab component

Problems:

- tabs usually imply one active panel
- tabs usually imply a shared strip
- tabs usually imply mutual exclusion

None of those match the desired behavior well.

### Do not use one giant morphing shell

Problems:

- too many responsibilities in one path
- visual regressions cascade easily
- state transitions become difficult to reason about

### Do not over-generalize attachment systems

The team explored `top / middle / bottom` attachment semantics. That exploration was useful, but the user strongly preferred simpler explicit behavior over abstract attachment math.

If future variants are needed, prefer:

- discrete explicit layouts

over:

- one generic parametric connector system

### Do not leave invisible large interaction blockers

This was a real UX issue during iteration. If a panel is closed, the dock should not reserve or block a large invisible area that prevents board panning.

## Current Feature Expectations

These behaviors are already established as desirable:

- both `Game Log` and `Chat` can be open at the same time
- desktop buttons stay in a compact stack when sensible
- shared panel width is adjustable and persisted
- open/closed state is persisted
- resize affordance is subtle, not decorative
- panel wrappers should not block board interaction outside real visible/interactable surfaces

## Suggested Implementation Strategy For A Future Agent

If another agent resumes this work, the safest design-first path is:

1. Treat the desktop rail as a launcher rail with docked cards.
2. Keep the button stack fixed and simple.
3. Use a very small open-state tab extension behind or beside the button.
4. Render the panel as a normal rounded card.
5. Place the card relative to the button using explicit offsets.
6. Use slight overlap to hide seams rather than relying on unified-shell math.
7. Keep row spacing based on panel footprints, not decorative geometry.

This should be considered the default implementation direction unless a later visual need clearly requires something more complex.

## Open Design Questions

These are still valid to refine later, but they should be solved within the simpler architecture above:

- exact open-state tab silhouette
- exact left offset / overlap amount between button extension and panel card
- exact vertical placement for different panel types
- whether the desktop rail ultimately wants 2, 3, or 4 dock buttons
- whether future panels should have independent heights

These are refinement questions, not reasons to reintroduce a unified-shell geometry system.

## Handoff Summary

If another agent reads only one section, it should be this:

- This component is a **utility rail with docked panels**, not a tabstrip.
- The user wants **stable buttons, ordinary rounded panel cards, and simple visual joins**.
- Multiple panels may be open at once.
- The earlier unified-shell SVG approach was too clever and too fragile.
- Future work should prefer **explicit layouts and small composable pieces** over generalized morphing geometry.
