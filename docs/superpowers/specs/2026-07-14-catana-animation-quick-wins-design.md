# Catana Animation Quick Wins Design

## Goal

Reduce avoidable continuous rendering work in the live Catana HUD without changing the perceived animation, game behaviour, or interaction timing.

## Scope

This first slice contains two isolated changes:

1. Replace the active-player avatar's animated `box-shadow` with a static glow layer whose pulse animates only `transform` and `opacity.
2. Remove the action dock's persistent `will-change: contents` hint.

The avatar's white ring, glow rhythm, two-second timing, and reduced-motion behaviour must remain visually consistent with the current HUD.

## Out of Scope

- Left meta rail layout and backdrop-blur transitions.
- Longest Road, resource-count, dice-shadow, timer, and mobile inventory effects.
- Board pan/zoom state handling.
- New dependencies, shared UI primitives, or changes to game state and rules.

Those candidates require targeted browser profiling or overlap existing in-progress files, so they will not be changed speculatively in this slice.

## Implementation

### Active avatar glow

`PlayerAvatarStats.css` will keep the glow attached to `.avatar-active-glow`, but render it on a pointer-inert pseudo-element. The pseudo-element will own a static `box-shadow`; the infinite keyframes will vary only `transform` and `opacity`, allowing the browser to reuse the painted glow while preserving the visible pulse.

The existing avatar ring and content remain on the main element. Reduced-motion mode will disable the pulse and retain a stable active-player indication.

### Action dock hint

`ActionsDock/dockStyles.css` will drop `will-change: contents`. The dock's layout, spring motion, hover feedback, and visual styling remain unchanged.

### Regression coverage

A focused source-level performance guard will assert that the active-avatar pulse does not animate `box-shadow` and declares only compositor-friendly animated properties. The test is intentionally narrow: it protects this regression without introducing a general-purpose CSS parser or lint rule.

## Verification

- Run the focused regression test red before implementation and green afterward.
- Run focused lint/checks for the touched files.
- Inspect `/catana/dev/sandbox` at `1440x900` and `390x844`.
- Confirm the active-player glow remains visible, pulses smoothly, and does not obscure the avatar or turn marker.
- Confirm action dock layout and hover/press behaviour are unchanged.
- Confirm reduced-motion still disables the avatar pulse.

## Acceptance Criteria

- No infinite active-avatar keyframe animates `box-shadow`, `filter`, or layout properties.
- The active-player visual remains recognisably the same at desktop and mobile sizes.
- The dock no longer uses `will-change: contents` and has no visible regression.
- No files in the deferred animation candidates are modified.
