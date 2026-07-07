---
name: catana-design
description: Use when designing, restyling, auditing, or implementing SettleHex/Catana UI, including homepage, lobby, account chrome, HUD/meta chrome, shared product UI, visual polish, and one-off design review passes.
---

# Catana Design

Use this as the active router for SettleHex visual work. The older brand guide is still a reference, but this skill decides which local context and current surface direction to load first.

## First Reads

- Always read `docs/agent/UI_CONTEXT.md`.
- Read `docs/agent/skills/catana-brand/SKILL.md` for the brand and taste north stars.
- For a review or "one-off pass", also read `docs/agent/skills/catana-brand/DESIGN_REVIEW_CHECKLIST.md`.
- For a new reusable `app/ui/*` primitive, also read `docs/agent/skills/catana-brand/ADDING_SHARED_PRIMITIVES.md`.
- Search `docs/agent/NOTES.md` for the specific surface before making broad style claims.

## Route By Surface

- Game HUD or play screen: treat the current game screen as the strongest canonical reference. Use `/catana/dev/sandbox` for manual verification when useful. Preserve the HUD glass, action dock/resource rails, game log/chat button language, player color identity, and tactile animation style.
- Homepage or title surface: treat it as a staged title/client surface, not a generic marketing page. The actual table should lead. Keep the bottom mode dock, account-first top-right chrome, quiet metadata, and ambient board life; avoid active-match chrome unless the route is entering a real match.
- Shared product UI: use existing `app/ui/*`, `/catana/dev/ui`, and Settlex-owned recipes before inventing a new pattern. Base UI/headless behavior is acceptable; external libraries are references, not wholesale visual imports.
- Animation and audio: follow the existing effect bus, cue labels, and semantic animation paths. `resourceDistribution.js`, action dock feedback, and game log/chat affordances are stronger references than generic web UI motion.
- Minor visual tweaks: keep the change in the smallest owning component or style override and use the smallest useful verification surface.

## Taste Checks

- Does this feel like the current SettleHex game/product family rather than stock shadcn, a generic SaaS page, or an AI landing-page template?
- Is the surface role clear: gameplay HUD, title surface, standard product control, status, or quiet metadata?
- Is visual weight earned by user importance rather than decoration?
- Does motion clarify a game event, input response, or surface transition?
- Are fake stats, fake social proof, filler panels, and placeholder links avoided or clearly dev-only?
- Were current local surfaces inspected before introducing a new pattern?

## Do Not

- Do not treat copied class lists in the brand guide as the whole current design system.
- Do not flatten bespoke game controls into generic product cards.
- Do not import external visual systems wholesale.
- Do not apply the shared-primitive workflow to homepage composition unless the work actually adds a reusable primitive.
