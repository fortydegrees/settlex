# Adding Shared UI Primitives

Use this when an agent is adding a new standard Settlex UI component such as `Tooltip`, `Toast`, `Table`, `Tabs`, `ToggleGroup`, `Field`, or another reusable product-surface primitive.

This is the short workflow doc that sits between the brand philosophy in `SKILL.md` and the implementation in `app/ui/*`.

## Read First

Before designing or implementing a new shared primitive, read:

1. `docs/agent/skills/catana-brand/SKILL.md`
2. `docs/superpowers/specs/2026-04-21-settlex-standard-ui-system-design.md`
3. the existing primitives in `app/ui/*`
4. `app/catana/dev/ui/UiShowcaseClient.js`

If the component is an overlay, floating surface, or anything with focus/dismissal/keyboard behavior, also read the relevant Base UI docs.

## What Counts As A Shared Primitive

Shared primitives belong to the Settlex standard UI layer.

Good candidates:
- `Tooltip`
- `Toast`
- `Popover`
- `Tabs`
- `ToggleGroup`
- `Field`
- `Table`
- `Sheet`
- reusable pickers used across product surfaces

Do not make a shared primitive for:
- board rendering
- game pieces / roads / settlements / cities / tiles
- bespoke gameplay controls such as `End Turn` or `Roll Dice`
- one-off effects or board-anchored prompts that are part of gameplay itself

## Current Shared Layer

The current canonical primitives live in `app/ui/`:

- `Button.js`
- `Panel.js`
- `Banner.js`
- `Input.js`
- `Select.js`
- `Dialog.js`
- `AlertDialog.js`
- `IconButton.js`
- `Popover.js`
- `SwatchPicker.js`

New primitives should feel like they belong beside these, not like a mini design system of their own.

## Design Rules

- Use semantic roles, not visual nicknames.
  - Good: `primary`, `secondary`, `accent`, `danger`, `ghost`, `subtle`
  - Bad: `blueCard`, `glassThing`, `fancyButton`
- Reuse the existing Settlex visual language:
  - light / bright / rounded / glass-leaning
  - blue / white / slate / lime / amber / rose family
  - confident but not heavy
  - purposeful motion, not theatrical motion
- Prefer extending the existing component language over inventing a new one.
- If a local custom control is already good, preserve its feel and lift it into the shared layer rather than redesigning it for novelty.

## Implementation Rules

When adding a new shared primitive:

1. Build it in `app/ui/`
2. Prefer Base UI/headless primitives when accessibility or interaction behavior matters
3. Add or update source tests under `app/catana/__tests__/`
4. Add an example to `app/catana/dev/ui/UiShowcaseClient.js`
5. If sensible, migrate one real surface to prove it in production context
6. Browser-check desktop and mobile if the component is visual or interactive

## Reference Rules

External references are optional, not required.

Use them only when they help with:
- behavior patterns
- interaction structure
- motion feel

Do not use them as permission to import a whole new visual language.

Good reference usage:
- Base UI docs for accessibility/interaction
- one or two targeted examples for behavior

Bad reference usage:
- pasting ten registry links and asking the agent to vibe from them
- copying an external library’s styling wholesale

## Definition Of Done

A shared primitive is not done until:

- the primitive exists in `app/ui/*`
- its API is semantically named
- it matches the existing Settlex visual language
- it has source-test coverage
- it has a showcase example
- at least one real surface uses it when appropriate
- the result has been checked in a browser if the component is interactive or visual

## Prompt Template

Use this when asking an agent to add a new primitive:

```text
Add a new shared Settlex UI primitive for [COMPONENT].

Read first:
- docs/agent/skills/catana-brand/SKILL.md
- docs/agent/skills/catana-brand/ADDING_SHARED_PRIMITIVES.md
- docs/superpowers/specs/2026-04-21-settlex-standard-ui-system-design.md
- app/ui/*
- app/catana/dev/ui/UiShowcaseClient.js

Requirements:
- This belongs to the shared standard UI layer, not bespoke gameplay UI.
- Reuse the existing Settlex visual language, semantic variants, spacing, and motion.
- Prefer Base UI/headless primitives when accessibility or overlay behavior matters.
- Add or update source tests.
- Add a showcase example.
- Migrate one real surface if it helps prove the primitive.
- Keep the diff focused.

Optional external reference for behavior only:
- [paste 1-2 links here]
```
