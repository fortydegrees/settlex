# Settlex Standard UI Variant Prompt

Date: 2026-04-21
Use case: hand this to another agentic coding model to generate an alternative visual pass on the same shared UI system

## What This Is For

Settlex now has a working shared standard UI layer for normal product surfaces:

- dialogs
- banners
- panels
- buttons
- inputs
- selects
- lobby / room setup surfaces
- a development-only showcase at `/catana/dev/ui`

The current pass is good enough to prove the structure, but we want to explore **alternative visual judgments** before locking the standard UI in.

The point of this prompt is:

- keep the same overall architecture,
- keep the same component coverage,
- keep the same brand family,
- but let another model make **different visual choices** about chrome, shape, spacing, and motion emphasis.

This is **not** a request to invent a different product or a separate design system.

---

## Current Product Rule

Use **one shared Settlex standard UI system** for all normal interface components across:

- landing and matchmaking surfaces
- profile/account/settings surfaces
- leaderboards
- custom game setup flows
- in-game dialogs and overlays
- reconnect / disconnect banners
- chat / log / settings rails

Keep only these areas outside that shared system:

- board rendering and board themes
- pieces / tiles / settlements / roads / cities
- bespoke gameplay controls where the control itself is part of play
  - e.g. `End Turn`, `Roll Dice`, build-action controls, some player dock actions

So the alternate pass should still treat the shared UI layer as one product system.

---

## Brand Constraints

Read these first:

- `docs/agent/skills/catana-brand/SKILL.md`
- `docs/superpowers/specs/2026-04-21-settlex-standard-ui-system-design.md`

Key brand rules:

- light, bright, cheerful
- rounded, friendly, confident
- glass-leaning / frosted, but not generic SaaS
- no dark-mode default aesthetic
- no heavy textures
- no wood / paper / realism / skeuomorphism
- no stock shadcn-demo feel
- keep the Catana blue / white / slate / lime / amber / rose family
- motion should be purposeful and consistent, not theatrical

Important: do **not** turn this into pixel-art, neobrutalism, Tron neon, or a direct copy of any external library.

The goal is still: **Catana-native product UI, but with a stronger and possibly different visual opinion.**

---

## Current Implementation Context

The current shared UI layer already exists here:

- `app/ui/Button.js`
- `app/ui/Panel.js`
- `app/ui/Banner.js`
- `app/ui/Input.js`
- `app/ui/Select.js`
- `app/ui/Dialog.js`
- `app/ui/AlertDialog.js`
- `app/globals.css`

The current proving ground and migrated surfaces are here:

- `app/catana/dev/ui/page.js`
- `app/catana/dev/ui/UiShowcaseClient.js`
- `app/catana/lobby/LobbyPageClient.js`
- `app/catana/lobby/[matchID]/MatchPageClient.js`

The current branch already includes:

- a structural shared-primitive pass
- a stronger visual-identity pass on those primitives

So your job is **not** to invent the system from scratch. Your job is to produce a **different good version** of the same system.

---

## What Should Stay Stable

Keep these things stable unless you have a strong reason not to:

1. The architecture
   - Shared UI primitives in `app/ui/*`
   - Showcase route at `/catana/dev/ui`
   - Lobby and match setup surfaces inheriting from the primitive layer

2. The product rule
   - One shared system for product / shared in-game UI
   - Bespoke gameplay controls remain out of scope

3. The general showcase structure
   - A docs / registry / proving-ground page
   - Hero section
   - Button examples
   - Form examples
   - Feedback examples
   - Overlay examples

4. The technology choices
   - no new UI library
   - no build-tool changes
   - no TypeScript migration

5. The visual family
   - still obviously Settlex / Catana
   - still light and game-native

---

## What Should Change

You should make **different visual choices** in areas like:

- button silhouette and chrome
- panel header treatment
- border / seam / highlight language
- input and select styling
- dialog shell styling
- spacing rhythm and density
- how “premium” vs “playful” vs “clean” the system feels
- how much depth the glass treatment has
- how strong or subtle the motion emphasis feels

This should be more than a tiny tweak pass.

If your result still looks like “the same design but with 3 class names changed,” it is not enough.

---

## Good Outcome Criteria

A good alternate pass should:

- feel clearly related to the current Settlex brand
- feel internally consistent across buttons, panels, fields, banners, and dialogs
- make different visual calls than the current pass
- preserve the same product/system structure
- render well on desktop and mobile
- avoid looking like a direct imitation of a component-library showcase

The ideal result is:

- same skeleton
- same product constraints
- different but defensible visual opinion

---

## Working Method

Use this process:

1. Read the brand doc and the Settlex standard UI system design spec.
2. Inspect the current primitive layer and the `/catana/dev/ui` showcase.
3. Decide on **one distinct visual direction** that still fits the brand.
4. Restyle the primitive layer first.
5. Use `/catana/dev/ui` as the proving ground.
6. Let the lobby/match surfaces inherit the result automatically where possible.
7. Browser-check on desktop and mobile.
8. Summarize the visual rationale briefly.

Do not spend your effort inventing new components that are not needed for this comparison.

---

## Files You Are Most Likely To Touch

- `app/ui/Button.js`
- `app/ui/Panel.js`
- `app/ui/Banner.js`
- `app/ui/Input.js`
- `app/ui/Select.js`
- `app/ui/Dialog.js`
- `app/ui/AlertDialog.js`
- `app/globals.css`
- `app/catana/dev/ui/UiShowcaseClient.js`

Try not to sprawl far beyond that unless the comparison genuinely needs it.

---

## Deliverable

Produce:

- code changes to the shared UI primitives and showcase
- a short explanation of the chosen visual direction
- confirmation of desktop/mobile browser verification

If you use git, keep the diff focused on the standard UI layer and the showcase route.

---

## Main Prompt To Give Another Agent

```text
You are working in the Settlex repo. I want you to create an ALTERNATIVE visual pass on the existing shared standard UI system.

This is not a greenfield design-system task. The shared UI layer already exists, and I specifically want a different visual interpretation of the same structure so I can compare approaches before locking anything in.

Read these first:
- docs/agent/skills/catana-brand/SKILL.md
- docs/superpowers/specs/2026-04-21-settlex-standard-ui-system-design.md
- app/ui/Button.js
- app/ui/Panel.js
- app/ui/Banner.js
- app/ui/Input.js
- app/ui/Select.js
- app/ui/Dialog.js
- app/ui/AlertDialog.js
- app/catana/dev/ui/UiShowcaseClient.js
- app/catana/lobby/LobbyPageClient.js
- app/catana/lobby/[matchID]/MatchPageClient.js

Context:
- Settlex should have one shared standard UI system for all normal product surfaces and shared in-game UI surfaces.
- Bespoke gameplay controls and board rendering are out of scope.
- The system must still feel Catana-native: light, bright, rounded, glass-leaning, cheerful, modern, and not like generic SaaS.
- Do not make it pixel-art, neobrutalist, dark-neon, or a direct copy of any external library.
- Do not add new UI dependencies or change build tooling.

What I want:
- Keep the same architecture and broad showcase structure.
- Keep the standard UI layer in app/ui/*.
- Keep /catana/dev/ui as the proving ground.
- Make noticeably different visual choices from the current implementation.
- Change the feel through the primitive layer first: buttons, panels, banners, inputs, selects, dialogs.
- Use the showcase route to prove the system.
- Let the already-migrated lobby/match surfaces inherit the result where sensible.

What counts as a good result:
- same product/system structure
- same brand family
- different visual judgment
- stronger consistency across the primitive set
- browser-checked on desktop and mobile

Good axes to vary:
- button silhouette
- panel seam/header treatment
- glass depth and highlight behavior
- control density and spacing rhythm
- dialog chrome
- motion emphasis

Bad outcomes:
- tiny superficial tweaks
- direct imitation of a library showcase
- inventing an unrelated aesthetic family
- touching bespoke board/gameplay controls

Process:
1. Inspect the current standard UI implementation.
2. Pick one clear alternate visual direction that still fits the brand.
3. Restyle the shared primitives and, if needed, tune the showcase page to present them well.
4. Browser-check /catana/dev/ui on desktop and mobile.
5. Summarize the direction and what changed.

Keep the diff tight and centered on:
- app/ui/*
- app/globals.css
- app/catana/dev/ui/UiShowcaseClient.js

If tests already exist for the standard UI layer, update or extend them first where appropriate and keep verification focused on the shared UI slice.
```

---

## Optional Bias Lines

Append **one** of these to the main prompt if you want to steer the model into more distinct alternatives.

### Bias A: More Jewel-Like

```text
Bias the direction toward a brighter, more jewel-like glass treatment with stronger seam highlights, more luminous layered surfaces, and a slightly more celebratory feel.
```

### Bias B: More Tournament-Clean

```text
Bias the direction toward a cleaner, more disciplined competitive-client feel: tighter spacing, calmer chrome, clearer hierarchy, and slightly less decorative depth.
```

### Bias C: More Playful Tabletop

```text
Bias the direction toward a more playful tabletop-product feel: softer glass, chunkier controls, warmer friendliness, and a little more toy-like charm without becoming childish.
```

---

## How To Compare Outputs

When you get alternatives back, compare them on:

1. Does it still feel like Settlex?
2. Does it feel more systematized than the original ad hoc components?
3. Are buttons / panels / fields / dialogs clearly part of the same family?
4. Is it visually different enough from the current pass to be useful?
5. Would you be happy letting future components inherit from it?

If an alternative is “interesting” but clearly not the right family, keep the idea and discard the whole direction.
