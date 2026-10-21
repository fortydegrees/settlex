# Settlex Standard UI System Design

Date: 2026-04-21
Scope: Shared standard UI system for Settlex product surfaces and game-shell UI
Status: Approved for planning

## Goal

Define one shared Settlex UI system for all standard interface components so new UI work is easy and obvious to apply.

That means:

- dialogs should not re-decide structure or motion every time,
- banners, alerts, and toasts should already know how they enter and exit,
- forms, sliders, tabs, tables, and panels should feel like one authored product,
- landing page, leaderboards, custom game setup, account/profile surfaces, and in-game standard UI should all feel related,
- only true gameplay-specific controls and board presentation should remain bespoke.

This is a design-system direction doc, not an implementation plan.

## Non-goals

- No immediate rewrite of existing Catana gameplay controls.
- No forced redesign of the board, pieces, tiles, or board theme system.
- No requirement to adopt the visual aesthetics of external reference systems such as Tron, neobrutalism, pixel-art, or skeuomorphic libraries.
- No commitment in this document to specific package installation or migration sequencing.
- No attempt to solve blog/editorial surface styling in full detail now.
- No demand that every page use identical layout patterns.

## Current Product Understanding

Settlex already has a clear visual direction in `docs/agent/skills/catana-brand/SKILL.md`:

- light, airy, optimistic,
- glass-leaning without dark-SaaS chrome,
- rounded and friendly rather than sharp or austere,
- bold but not aggressive,
- blue-led environments with frosted white layers,
- expressive but purposeful motion,
- no heavy textures,
- no generic stock component-library feel.

This existing direction should remain the brand source of truth.

The problem to solve is not "pick a new aesthetic family." The problem is:

- the current UI is at risk of becoming a collection of ad hoc custom components,
- standard interface patterns are not yet systematized,
- future surfaces such as custom game setup, profiles, leaderboards, and additional in-game overlays will multiply the inconsistency if the system is not defined now.

## Recommended Product Rule

Use **one shared Settlex standard UI system** for all normal interface components across:

- landing and matchmaking surfaces,
- leaderboards,
- profile/account/settings surfaces,
- custom game setup flows,
- in-game dialogs and overlays,
- banners and notifications,
- log/chat shells and standard control surfaces.

Keep only the following classes of UI outside that shared system:

- board rendering and theme presentation,
- piece/board effects,
- gameplay-specific action controls where the interaction itself is part of play.

Examples of likely bespoke gameplay controls:

- `End Turn`,
- `Roll Dice`,
- build-action controls such as road/settlement/city/dev-card actions,
- player dock elements whose form is tightly bound to active play state,
- board-anchored prompts or overlays,
- special piece or board animations.

Examples of UI that should come from the shared system:

- resign dialogs,
- disconnect and reconnect banners,
- idle/AFK prompts,
- toast notifications,
- custom game option controls,
- profile/account forms,
- leaderboard tables and filters,
- chat/log panels,
- standard tooltips/popovers/sheets/tabs.

## Why One Shared System

The user-validated requirement is simple:

- when a new modal is added, it should already feel like Settlex,
- when a banner appears, it should already know how it enters,
- when a new form or settings surface is built, it should already inherit the same interaction language,
- teams should not have to re-decide animation, spacing, panel treatment, and emphasis on each new component.

This points to one shared system, not separate "web UI" and "game chrome" systems.

The product is fundamentally a game. Standard interface surfaces should therefore feel like one product family even when they appear in different contexts.

## Architectural Shape

The recommended stack has three layers:

1. `Primitive foundation`
2. `Settlex standard UI layer`
3. `Bespoke gameplay layer`

### 1. Primitive foundation

Use an unstyled accessibility-first primitive library for standard UI behavior:

- focus management,
- portals,
- layering,
- dismissal behavior,
- positioning,
- keyboard handling,
- screen-reader semantics.

Recommended foundation: `Base UI`.

Why:

- it is explicitly unstyled and intended for custom design systems,
- it covers the exact standard interaction problems Settlex needs,
- it supports composition and animation-friendly control patterns,
- it is a better long-term fit for a custom branded system than adopting a pre-styled registry wholesale.

Useful official references:

- [Base UI](https://base-ui.com/)
- [Base UI Dialog](https://base-ui.com/react/components/dialog)
- [Base UI Alert Dialog](https://base-ui.com/react/components/alert-dialog)
- [Base UI Drawer](https://base-ui.com/react/components/drawer)
- [Base UI Popover](https://base-ui.com/react/components/popover)
- [Base UI Tooltip](https://base-ui.com/react/components/tooltip)

### 2. Settlex standard UI layer

This is the layer Settlex should own.

It should define:

- visual tokens,
- surface recipes,
- component recipes,
- state variants,
- motion defaults,
- spacing and density rules,
- focus and interaction treatments.

This is the real "theme."

It should be implemented as wrappers or owned components over the primitive foundation, not as one-off page-local styling.

### 3. Bespoke gameplay layer

This remains independent.

It should continue to own:

- game-action-specific controls,
- board presentation,
- board themes and future 3D presentation,
- piece placement / board effects,
- mechanics-bound UI where the component is part of gameplay, not a standard application interface.

This separation matters because Settlex wants:

- player-selectable board themes,
- future alternative board rendering,
- eventual Three.js / 3D play presentation.

The standard UI system should therefore be board-agnostic.

## Design Language

The Settlex standard UI system should be a direct extension of Catana's current visual direction.

It should feel:

- light,
- bright,
- rounded,
- glass-leaning,
- cheerful,
- polished,
- game-native,
- intentionally modern.

It should not feel:

- dark and neon by default,
- brutalist,
- retro/pixel-art,
- skeuomorphic,
- enterprise-generic,
- like a stock shadcn demo with colors swapped.

### Surface direction

The strongest external style reference from the research set is:

- [AICanvas Components](https://aicanvas.me/components)

This is useful for:

- frosted surfaces,
- layered panels,
- lightweight ambient motion,
- controls that feel alive without becoming noisy.

It should be treated as inspiration only.

Settlex should **translate** that glass/surface feel into the existing Catana light palette, not copy AICanvas literally.

Notably:

- some AICanvas pieces are dark-mode-only, such as [Glass Sidebar](https://aicanvas.me/components/glass-sidebar),
- Settlex should retain its bright, airy, Catana-led world rather than adopting dark frosted chrome.

## Motion Language

Settlex standard UI should use one shared motion vocabulary for standard interface components.

The goal is:

- appearance should feel authored and consistent,
- transitions should clarify hierarchy and state,
- motion should not be re-invented per component,
- standard UI should feel responsive and polished,
- reduced-motion handling should be built in.

### Primary motion reference

The strongest direct motion reference from the research set is:

- [Animate UI Dialog](https://animate-ui.com/docs/components/base/dialog)

More generally:

- [Animate UI](https://animate-ui.com/)

Why this is the best motion reference:

- the dialog transition is closer to the desired feel than the alternatives reviewed,
- it demonstrates a clean wrapper-over-primitives model,
- it offers springy but controlled entrance behavior for overlays,
- it reinforces the idea that motion defaults belong in the component recipe, not in each call site.

### Motion principle

Every standard component should inherit a common motion language:

- overlays use quick fade/spring entrance,
- banners and notifications appear decisively but briefly,
- tabs, switches, sliders, and disclosure surfaces share the same family of easing and timing,
- hover/press feedback is consistent across controls,
- reduced-motion mode removes flourish but preserves clarity.

The value is not one exact animation curve everywhere.
The value is that all standard UI transitions feel like members of the same family.

## Reference Stack

### Foundation

- [Base UI](https://base-ui.com/)

### Main motion reference

- [Animate UI](https://animate-ui.com/)

### Main surface/style reference

- [AICanvas](https://aicanvas.me/components)

### Effect shelves for selective borrowing only

- [PaceKit GSAP](https://gsap.pacekit.dev/)
- [Motion Primitives](https://motion-primitives.com/docs/border-trail)
- [Magic UI](https://magicui.design/docs/components/border-beam)
- [Unlumen](https://ui.unlumen.com/components/animated-list)
- [Cult UI](https://www.cult-ui.com/docs/components/side-panel)

These are not system foundations. They are reference shelves for specific patterns if and when a component genuinely needs them.

### Scaffolding-only references

- [Shadcnblocks](https://www.shadcnblocks.com/components/pagination)

Useful later for page-section scaffolding or standard layout coverage, but not a source of product identity.

### Explicitly not adoption targets

These are useful examples of **system discipline**, but not the target aesthetic for Settlex:

- [The Gridcn](https://thegridcn.com/)
- [Neobrutalism](https://www.neobrutalism.dev/docs)
- [Sabraman](https://sabraman.ru/ru/components)
- [Pixelact UI](https://github.com/pixelact-ui/pixelact-ui)

The lesson to take from them is:

- coherent systems define tokens and component recipes once,
- they do not rely on ad hoc styling at every usage site.

The lesson is **not** to import their visual identities.

## First Component Inventory

The first pass of the Settlex standard UI layer should standardize these components:

- `Button`
- `Dialog`
- `AlertDialog`
- `Banner`
- `Toast`
- `Panel`
- `Sheet` / `Drawer`
- `Tabs`
- `Tooltip`
- `Popover`
- `Input`
- `Textarea`
- `Select`
- `Slider`
- `Switch`
- `Checkbox`
- `Table`
- `ScrollArea`

These are the components that most directly remove repeated design decisions from new work.

### Why this inventory first

This set covers the highest-value upcoming needs:

- resign / confirm / warning prompts,
- disconnect / reconnect / status banners,
- custom game setup controls,
- profile/settings forms,
- leaderboard tables and filters,
- chat/log shells,
- future notifications and utility surfaces.

## Component Recipe Rules

Each standard component should standardize more than color.

It should come with owned defaults for:

- surface treatment,
- radius and border language,
- blur and shadow language,
- padding and density,
- typography hierarchy,
- focus-ring treatment,
- hover/press feedback,
- entry/exit motion,
- state/severity variants.

### Severity/state variants

At minimum, the system should define shared variants such as:

- `info`
- `success`
- `warning`
- `danger`

These should read consistently across banners, toasts, dialogs, pills, and supportive inline surfaces.

## Tooltip And Popover Rule

The foundation docs make an important distinction that Settlex should follow:

- `Tooltip` is for supplementary visual labels only,
- `Popover` is for richer explanatory or interactive content.

In practice:

- resource-cost hints or important explanatory overlays should use `Popover`,
- icon-only enhancement copy can use `Tooltip`,
- critical information must not be available only through a tooltip.

Useful reference:

- [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
- [Base UI Popover](https://base-ui.com/react/components/popover)

## Rollout Boundary

This document intentionally does **not** recommend a big-bang rewrite.

The correct rollout principle is:

- standardize new standard UI work through the Settlex layer,
- retrofit the most duplicated or weakest existing standard UI surfaces as they are touched,
- leave stable gameplay-specific controls alone unless there is a separate product reason to revisit them.

That means future work such as:

- resign dialog,
- network/disconnect surfaces,
- idle/AFK prompts,
- custom-game setup,
- account/profile forms,
- leaderboard controls,
- future standard overlay work

should be early adopters of the shared system.

## Risks

### Risk: tokens without recipes

If Settlex only defines colors and a few utility classes, the system will still drift.

Mitigation:

- own the component recipes, not just the palette.

### Risk: registry collage

If components are copied opportunistically from many different registries, consistency will degrade quickly.

Mitigation:

- use references for inspiration,
- but funnel all standard components through the owned Settlex layer.

### Risk: over-standardizing gameplay controls

If the system tries to absorb all gameplay controls, the game may lose character or force awkward abstractions.

Mitigation:

- keep gameplay-specific controls bespoke unless there is a clear reason to normalize them.

### Risk: dark-glass drift

Many external glass references skew dark and cinematic.

Mitigation:

- keep the Catana light/airy direction as the visual source of truth.

## Open Questions For Planning

- Which existing components should be the first migration targets?
- Should the first implementation use the already-installed `@headlessui/react` as a bridge or go directly to `Base UI` for the first standard components?
- Which token names and CSS-variable structure should become the long-term Settlex contract?
- Which existing surface should be the first proving ground:
  - resign dialog,
  - disconnect banner,
  - custom game setup controls,
  - chat/log shell,
  - or account/profile forms?

## Recommendation Summary

Settlex should adopt:

- one shared standard UI system for all normal interface components,
- an unstyled primitive foundation beneath it,
- Catana-derived visual recipes above it,
- one shared motion vocabulary for standard UI,
- bespoke exceptions only for gameplay-specific controls and board presentation.

Recommended references:

- `Base UI` for primitives,
- `Animate UI` for motion reference,
- `AICanvas` for surface inspiration,
- registry systems such as Gridcn / Neobrutalism / Sabraman / Pixelact only as evidence that strong systems come from owned recipes, not ad hoc styling.
