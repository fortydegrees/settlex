# Catana Port Marker MVP Design

Date: 2026-03-09

## Goal
Replace the current literal port art with a simpler Catana-native port marker system that feels embedded into the shoreline, clearly communicates which two coastal nodes have access to the port, and stays small, legible, and easy to implement for launch.

## Why This Direction
- The current copied-style port treatment reads as imported board-game scenery rather than part of Catana's visual system.
- AI-generated harbor scenes quickly drift toward miniature dioramas, signs, flags, and other detail that clashes with the board's flatter, brighter look.
- The active `emoji` theme already overrides resource icons but not port assets, so bespoke per-theme port illustrations would increase churn immediately.
- A runtime-composed marker can reuse the existing resource icon set and remain consistent across classic and emoji themes without requiring a parallel port-art pipeline.

## Non-Goals
- No `game-core` topology or trade-rule changes.
- No literal boats, sails, ropes, crates, signs, or scenic harbor props.
- No per-resource bespoke illustrated island scenes in the MVP pass.
- No attempt to make the port art itself carry all gameplay meaning; the explicit bridge connectors and badge should do part of that work.
- No requirement to keep using the existing `port_*.svg` / `port_pier.svg` files if the runtime-composed marker replaces them cleanly.

## Constraints
- Ports must remain readable at roughly the same board scale they render today in `app/catana/Port.js`.
- Each port must visibly connect to the exact two shoreline nodes that grant access.
- The marker must work with the existing `themeId` flow and should prefer current shared resource icons over new one-off icon drawings.
- The board already uses layered overlays such as the tile resource icon and number token; the port treatment should follow the same art-underlay plus badge-overlay model.
- The launch board is still decorative/UI-driven around ports; this is a visual-system change, not a map-topology rewrite.

## Decision Summary
The approved launch direction is:

1. Use an embedded abstract harbor marker instead of a literal harbor scene.
2. Keep the marker mostly map-like, with only light glass/frosted accents.
3. Reuse the existing resource icon language at the center of specific-resource ports.
4. Render the trade rate as a separate bottom-centered badge (`2:1` or `3:1`) layered on top of the port marker rather than baked into the artwork.
5. Render exactly two explicit bridge/causeway connectors from the marker toward the eligible coastal nodes.

This intentionally lands between the two extremes:
- not a scenic mini-island illustration,
- not a floating UI sticker disconnected from the map.

## Rejected Alternatives

### 1. Literal harbor object treatment
Examples: boat, sail, dock sign, flag, physical platform.

Rejected because it pushes the board toward copied board-game scenery and away from Catana's lighter, more designed look.

### 2. Scenic AI mini-island art
Examples: fully illustrated cove/island render with water highlights and detailed resource objects.

Rejected for MVP because it is harder to keep consistent, easier to over-detail, and more expensive to adapt across all six port types.

### 3. Pure floating UI chip
Examples: circular sticker badge with no embedded shoreline feel.

Rejected because the port is part of the board geometry and must communicate real coastal access, not read as an arbitrary overlay.

## Structure
The port should read as one compact embedded shoreline feature made of four layers:

1. **Bridge connectors**
Two simple map-side planks/causeways pointing from the harbor marker to the coastal nodes the port applies to.

2. **Harbor marker**
A compact circular or rounded-oval marker that sits visually in the water/coast seam. This should feel like a small cove, ring, or harbor inset, not a freestanding token.

3. **Resource glyph**
For specific-resource ports, place the existing resource icon in the center of the marker. Keep the icon chunkier and simpler than a rendered scene object.

4. **Rate badge**
A separate bottom-centered badge overlapping the marker slightly. This holds `2:1` for specific ports or `3:1` for generic ports.

## Visual Direction
The port should feel primarily like board art, with a restrained glass accent:

- marker base: soft aqua / pale white harbor ring or cove shape,
- inner land/shore accent: warm sand tone,
- center icon: existing Catana resource icon asset for the port resource,
- badge: frosted/glass-like pill or rounded rectangle,
- text: dark slate rather than pure black,
- connectors: flat and subordinate, likely warm sand or light wood.

Keep the treatment:
- flat,
- bright,
- top-down or near-top-down,
- highly legible at small size,
- traceable/maintainable as SVG or CSS geometry.

Avoid:
- heavy bevels,
- realistic texture,
- glossy mobile-game asset-pack highlights,
- strong perspective depth,
- detailed water rendering,
- decorative outlines heavier than the rest of the board.

## Badge Rules
The trade-rate badge is intentionally separate from the marker artwork.

Specific ports:
- badge text: `2:1`
- center icon: resource icon

Generic port:
- badge text: `3:1`
- center glyph: optional neutral trade glyph, or a very subtle generic motif if needed later

For MVP, the generic port can remain simpler than the specific ports as long as the `3:1` badge is immediately readable.

## Connector Rules
The connectors are functional communication, not decoration.

Requirements:
- always exactly two,
- clearly tied to the port's `tile.direction`,
- visually subordinate to the harbor marker and badge,
- positioned so the player can infer which two coastal nodes grant access.

They should read more like small causeways or bridge planks than like scenic boardwalk illustration.

## Theme / Asset Strategy
The MVP should prefer runtime composition over a new asset family.

Recommended strategy:
- keep using `getResourceIconPath(themeId, resource)` for the center icon,
- build the harbor marker, badge, and connectors from CSS/SVG primitives in the runtime component,
- avoid adding a parallel `emoji`/`classic`/future port-art override matrix unless the MVP result proves insufficient.

This is the main practical benefit of the approved direction: the center icon already adapts to theme, while the harbor shell stays visually stable.

## AI / Reference Usage
AI generation is still useful, but only for composition studies.

Approved usage:
- generate shoreline-marker ideas,
- generate top-down harbor-ring motifs,
- generate simplified layout references for tracing.

Not approved for direct shipping:
- highly rendered harbor scenes,
- detailed floating platforms,
- embedded `2:1` text inside the art,
- final art that introduces a different shading/render language than the current board.

## Testing
Testing should focus on readability and geometry rather than gameplay rules.

Required checks:
- port layout helper test for each direction's two-connector geometry,
- render test confirming specific ports show the resource icon and `2:1` badge,
- render test confirming generic ports show a `3:1` badge,
- manual board QA confirming the connectors visibly indicate the two eligible nodes,
- manual QA on both current active themes to ensure the reused resource icons still read correctly inside the new marker.

## Future Evolution
If the MVP marker works, the next art pass can iterate the harbor shell without changing the overall system:
- refine the harbor ring/cove silhouette,
- swap in traced SVG shells,
- add a neutral generic-port glyph,
- or add theme-specific polish only if the shared runtime-composed marker proves too plain.

The important thing to preserve is the structure:
- embedded shoreline marker,
- centered resource glyph,
- bottom rate badge,
- two explicit access connectors.
