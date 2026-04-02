# Player Piece Color Assets Design

Date: 2026-04-02
Scope: Catana player piece SVG organization and expanded colour coverage for placed roads, settlements, and cities
Status: Approved for implementation

## Goal

Add Catana-native piece SVGs for every lobby-selectable player colour and move all player piece assets into a dedicated folder so runtime lookup stays simple and the root `public/svgs/` directory stops accumulating piece variants.

## Context

- Lobby colour selection is already centralized in [app/catana/theme/playerColors.js](/Users/david/coding/settlex/app/catana/theme/playerColors.js).
- The supported lobby colour IDs are:
  - `red`
  - `blue`
  - `green`
  - `orange`
  - `purple`
  - `pink`
  - `cyan`
  - `amber`
- Catana currently has local SVGs only for:
  - `road_red.svg`
  - `road_blue.svg`
  - `settlement_red.svg`
  - `settlement_blue.svg`
  - `city_red.svg`
  - `city_blue.svg`
- Those files currently live directly in `public/svgs/`.
- Several runtime paths still point to Colonist-hosted piece assets rather than local Catana assets:
  - [app/catana/types.js](/Users/david/coding/settlex/app/catana/types.js)
  - [app/board-editor/utils/types.js](/Users/david/coding/settlex/app/board-editor/utils/types.js)
- Other consumers build Catana local filenames directly from `road_${color}.svg`, `settlement_${color}.svg`, and `city_${color}.svg`:
  - [app/catana/Edge.js](/Users/david/coding/settlex/app/catana/Edge.js)
  - [app/catana/effects/placePiece.js](/Users/david/coding/settlex/app/catana/effects/placePiece.js)
  - [app/catana/components/PlayerActionContainer.js](/Users/david/coding/settlex/app/catana/components/PlayerActionContainer.js)

## Approved Direction

- Use the lobby colour IDs exactly as the source of truth.
- Move all player piece SVGs into `public/svgs/pieces/`.
- Keep the existing flat filename convention: `<piece>_<color>.svg`.
- Add Catana-native variants for the missing colours:
  - `green`
  - `orange`
  - `purple`
  - `pink`
  - `cyan`
  - `amber`
- Keep the existing red and blue assets, but move them into the same `pieces/` folder so there is one canonical location.
- Update all Catana piece consumers to read from the new location instead of mixing:
  - root-level local SVGs,
  - hardcoded red-only filenames,
  - Colonist-hosted SVG URLs.

## Asset Layout

The live piece asset set should live at:

```text
public/svgs/pieces/
  road_red.svg
  road_blue.svg
  road_green.svg
  road_orange.svg
  road_purple.svg
  road_pink.svg
  road_cyan.svg
  road_amber.svg
  settlement_red.svg
  settlement_blue.svg
  settlement_green.svg
  settlement_orange.svg
  settlement_purple.svg
  settlement_pink.svg
  settlement_cyan.svg
  settlement_amber.svg
  city_red.svg
  city_blue.svg
  city_green.svg
  city_orange.svg
  city_purple.svg
  city_pink.svg
  city_cyan.svg
  city_amber.svg
```

Non-piece SVGs remain where they are today. This change applies only to:

- `road`
- `settlement`
- `city`

## Runtime Path Strategy

Piece paths should be built from one shared convention instead of repeated string assembly.

### Required behavior

- Runtime piece URLs resolve to `/svgs/pieces/<piece>_<color>.svg`.
- Consumers do not hardcode root-level `/svgs/road_red.svg` style paths anymore.
- Consumers do not fetch Colonist-hosted piece SVGs anymore.

### Recommended implementation shape

- Add a small shared helper for local piece assets.
- The helper should accept:
  - piece type: `road`, `settlement`, `city`
  - colour ID: one of the lobby-supported IDs
- The helper should produce either:
  - `pieces/<piece>_<color>.svg` when feeding the theme asset helpers, or
  - `/svgs/pieces/<piece>_<color>.svg` when a direct public URL is needed.

This keeps the directory change localized and avoids repeating path details across gameplay UI, effects, and board-editor code.

## Colour and Shading Strategy

The new colour variants should keep the live Catana piece family intact.

### Preserve

- The current Catana geometry for each piece family:
  - red/blue roads already share the same modernized rounded road shape
  - red/blue settlements already share the same Catana-native geometry
  - red/blue cities already share the same Catana-native geometry
- The current light / mid / dark plane logic
- The current rim / stroke approach used for readability on the board

### Change

- Translate each piece family into the remaining lobby colours:
  - `green`
  - `orange`
  - `purple`
  - `pink`
  - `cyan`
  - `amber`
- Use board-friendly palette translations rather than literal flat UI swatches.
- Maintain enough contrast between:
  - light faces,
  - mid-tone faces,
  - darker shell or stroke tones
  so the pieces remain readable at game scale.

### Intent

The pieces should feel matched to the avatar picker colours, but they should still read as Catana board pieces rather than Tailwind circles turned into SVG fills.

## Consumer Updates

### Gameplay and effects

- [app/catana/Edge.js](/Users/david/coding/settlex/app/catana/Edge.js) should use the shared piece-path convention for road previews and placed roads.
- [app/catana/effects/placePiece.js](/Users/david/coding/settlex/app/catana/effects/placePiece.js) should use the same convention for settlement, city, and road placement effects.

### Shared asset maps

- [app/catana/types.js](/Users/david/coding/settlex/app/catana/types.js) should return local Catana piece URLs instead of Colonist-hosted URLs.
- [app/board-editor/utils/types.js](/Users/david/coding/settlex/app/board-editor/utils/types.js) should do the same so editor previews match live Catana assets.

### Build action icons

- [app/catana/components/PlayerActionContainer.js](/Users/david/coding/settlex/app/catana/components/PlayerActionContainer.js) currently hardcodes red piece asset filenames for the build buttons.
- As part of this migration, those piece references should move to the new asset location.
- Build-action icon colour matching is not required for this slice.
- For this implementation, the requirement is only that the build buttons stop referencing root-level piece filenames and instead resolve through the new `pieces/` asset location.
- Making the action-dock build icons reflect the active player's selected colour can be treated as a follow-up enhancement if desired.

## Theme Compatibility

- This asset move should fit the existing theme asset helpers instead of bypassing them.
- Piece assets are still classic Catana assets, not per-theme overrides.
- Theme-aware helpers should continue to work when passed nested piece filenames such as `pieces/road_green.svg`.
- Existing theme fallback behavior should remain unchanged for non-piece assets.

## Migration Rules

- Do not leave duplicate live piece files in both:
  - `public/svgs/`
  - `public/svgs/pieces/`
- After the move, `public/svgs/pieces/` is the canonical live location for all roads, settlements, and cities.
- Root-level piece paths should be removed from runtime code rather than kept as a legacy parallel path.

## Verification

Implementation should verify:

1. Every expected piece asset exists for all `3 x 8` piece/colour combinations.
2. Updated path helpers return the new `/svgs/pieces/...` locations.
3. Gameplay consumers still render road, settlement, and city art correctly.
4. Board-editor piece previews use the Catana local assets rather than Colonist URLs.
5. All new SVG files are well-formed XML.

Recommended verification coverage:

- targeted unit tests around path helpers or theme asset resolution
- updates to [app/catana/__tests__/themeAssets.test.js](/Users/david/coding/settlex/app/catana/__tests__/themeAssets.test.js) for the new piece paths
- targeted player-colour tests if helper behavior changes
- `xmllint --noout` across the new piece SVG set

## Acceptance Criteria

- Catana ships local `road`, `settlement`, and `city` SVGs for all lobby-supported colour IDs.
- All live piece assets are stored under `public/svgs/pieces/`.
- No runtime piece consumer still points at Colonist-hosted piece art.
- Piece placement and board rendering use the selected player's colour when resolving piece SVGs.
- The new colours preserve the Catana piece shading structure rather than flattening into simple solid fills.
- The asset organization is cleaner without introducing an overengineered nested directory scheme.

## Out Of Scope

This slice does not include:

- redesigning piece geometry from scratch
- adding theme-specific alternate piece families
- changing non-piece SVG organization
- expanding the lobby colour set beyond the existing supported IDs
- changing the underlying player-colour selection model

## Next Step

Write an implementation plan that:

- defines the shared piece-path helper,
- migrates all runtime consumers,
- adds the missing SVG colour variants,
- updates tests and asset expectations,
- verifies SVG validity and targeted UI behavior.
