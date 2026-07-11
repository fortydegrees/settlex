# Catana 3D Emoji Terrain Palette Design

## Goal

Make the 3D terrain tiles immediately recognizable as dimensional versions of
the current default `emoji` SVG tiles while preserving the approved miniature
trees, sheep, grain, brick, ore, and desert geometry.

## Scope

- Match only the default `emoji` tile palette in this pass.
- Recolour the shared hex shell top and side materials at runtime.
- Leave all resource landmark materials and geometry unchanged.
- Keep the GLB binary unchanged so colour iteration does not require Blender or
  asset re-export.
- Keep the production renderer default and 2D fallback behavior unchanged.

## Visual Translation

The SVG tiles use a bright diagonal face gradient, a darker endpoint, and a
light inner stroke. The 3D shell already supplies real lighting, bevels, and
separate top/side meshes, so the equivalent treatment is:

- use the SVG's bright/mid face colour for the horizontal top;
- use the SVG's dark endpoint for the vertical side;
- let the existing bevel and scene lighting create the highlight transition;
- retain matte, moderately rough materials rather than adding a baked gradient
  texture or custom shader.

The palette source is the current files under
`public/svgs/palette-themes/emoji/tile_*.svg`. Runtime values will be explicit
constants so visual tuning is small and reviewable.

## Architecture

Add a terrain material palette to `app/catana/3d/assetCatalog.js`, keyed by the
existing terrain asset IDs. Each entry identifies the shell top and side mesh
names plus their SVG-derived colours.

Extend `AssetInstance3D` with an optional material override map. When supplied,
the instance clones only the affected materials, applies the requested colour
and roughness, and disposes those clones on unmount. Geometry and unaffected
materials remain shared with the cached GLB.

`CatanaBoardScene3D` passes the appropriate terrain palette when rendering each
tile. Player-piece material handling remains unchanged.

## Verification

- Unit-test complete palette coverage and the selected SVG-derived colours.
- Keep existing renderer/catalog/view-model tests green.
- Compare the default 2D sandbox and 3D sandbox at `1440x900` and `390x844`.
- Confirm every terrain remains distinct, landmarks retain their original
  colours, the canvas is nonblank, and no new browser console errors appear.

## Deferred

- Following alternate selectable 2D themes.
- Baked SVG textures, vertex gradients, custom shaders, or GLB re-export.
- Changes to terrain geometry, landmark placement, lighting, or camera framing.
