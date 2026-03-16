# Catana Simple Port Connectors Design

Date: 2026-03-16

## Goal
Simplify the current port connector treatment so it clearly shows which two coastal nodes grant port access without adding visual weight or requiring heavy coastline-specific art tuning.

## Why This Direction
- The board-channel experiment proved useful for connector targeting and port-node readability, but it is visually heavier than the rest of the port treatment.
- Making the channels feel fully cohesive with the coastline requires more tuning than is justified for MVP.
- The simpler requirement is functional: show which two nodes connect to the port.

## Decision Summary
The approved direction is:

1. Keep the current circular port token and bottom `2:1` / `3:1` badge.
2. Remove the heavier merged shoreline-channel treatment.
3. Use two short, separate sandy connector bars per port.
4. Keep those connectors visually quiet and subordinate to the token.
5. Preserve the correct directional targeting toward the real access nodes.

## Visual Rules
- Two separate connectors, not one merged channel shape.
- Sandy/map-like, not literal wooden planks.
- Short bars that stop short of both the node and the token.
- No wood grain, no plank stripes, no posts, no decorative detail.
- Rounded or lightly softened ends are fine.
- Connector color should stay in the same warm sand family as the board coast.

## Layering
From back to front:
1. `BoardUnderlay`
2. simple port connectors
3. land tiles and port token
4. placed roads / settlements / cities
5. action highlights

This keeps the connectors legible without competing with actual placed pieces.

## Geometry
- Continue using the correct access-node targeting approach from the recent port work.
- Each port still has exactly two connectors.
- Each connector should be anchored near the real coastal node circle, not centered midway between the node and token.
- Connectors should point outward from the node toward the port token and stop short of both ends.
- The two bars should read like quiet access markers, not random dashes floating in open water.

## Scope
- Standard board only.
- No gameplay changes.
- No new theme-specific connector variants.
- No new literal bridge art system.

## Testing
- Preserve focused port geometry coverage so the two connectors still point toward the correct access directions.
- Keep a render test that ports still show two connector primitives.
- Manual browser QA to ensure the simplified connectors feel lighter than the channel approach.
