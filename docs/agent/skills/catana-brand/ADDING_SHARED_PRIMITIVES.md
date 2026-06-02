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

After reading the local docs/code, look for two or three targeted external references before inventing a new shared interaction pattern.

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
- `MetaDisclosure.js`
- `SwatchPicker.js`

New primitives should feel like they belong beside these, not like a mini design system of their own.

## Reference-First Workflow

When adding a shared primitive, do this in order:

1. Check whether the pattern already exists in `app/ui/*`.
2. If not, review two or three targeted external references for the interaction pattern.
3. Prefer copying/adapting an open-code interaction recipe over inventing a bespoke one from scratch.
4. Restyle that recipe into the Settlex system.
5. Add or extend the shared primitive first, then rebuild the product surface on top of it.

This is the intended workflow for things like copy buttons, tooltips, toasts, invite rows, pickers, and other reusable product-surface UI.

The goal is:
- do not preserve random page-local controls just because they already exist
- do not invent a new interaction from vibes when a strong open pattern already exists
- do keep the final visual language recognizably Settlex

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
3. Review two or three external references for the interaction before writing the shared component
4. Copy/adapt the behavior pattern or open-code implementation where sensible; do not import a whole styling system just to get one pattern
5. Add or update source tests under `app/catana/__tests__/`
6. Add an example to `app/catana/dev/ui/UiShowcaseClient.js`
7. If sensible, migrate one real surface to prove it in production context
8. Browser-check desktop and mobile if the component is visual or interactive

## Reference Rules

External references are required for new shared interaction patterns unless the pattern already clearly exists in `app/ui/*`.

Use them for:
- behavior patterns
- interaction structure
- copied-state / loading-state / success-state handling
- motion feel when the component needs motion

Prefer references that expose real code or a clear open implementation path.

Good sources:
- Base UI docs for accessibility and interaction contracts
- targeted open-code examples from the approved inspiration pool such as Animate UI, Magic UI, Shadcnblocks, Shadcn UI Blocks, and Shadcn Space
- one focused product-pattern example when composition matters more than the individual primitive

Do not use external references as permission to import a whole new visual language.

Good reference usage:
- Base UI docs for accessibility/interaction
- two or three targeted examples for behavior/composition
- borrowing a copy-button or input-group recipe, then restyling it into Settlex

Bad reference usage:
- pasting ten registry links and asking the agent to vibe from them
- copying an external library’s styling wholesale
- skipping reference review and inventing a fresh interaction for a common pattern

When relevant, record which external references were used in the work notes or handoff summary.

## Definition Of Done

A shared primitive is not done until:

- the primitive exists in `app/ui/*`
- its API is semantically named
- it matches the existing Settlex visual language
- two or three relevant external references were reviewed, or the agent explicitly notes that the pattern already existed locally
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
- Before inventing the interaction, review two or three targeted external references from the approved inspiration pool and adapt the best open pattern.
- Add or update source tests.
- Add a showcase example.
- Migrate one real surface if it helps prove the primitive.
- Keep the diff focused.
- Tell me which references you used and what you borrowed from each.

Suggested external references:
- [paste 2-3 links here]
```
