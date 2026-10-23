# Board presentation

`Board.js` renders the playable board; `app/_features/game/GameScreen.js` composes it
with the HUD, feed, viewport controls and effect providers. The Next route stays
at `app/catana/page.js`.

- `Tile`, `Node`, `Edge`, `Piece`, `Port` and `ActionNode` draw tiles, pieces,
  ports and placement targets. Their CSS stays beside them.
- `BoardUnderlay` and `BoardPortChannels` own the non-interactive lower layers.
- `BuildPlacementPreview` and `RobberPlacementPreview` remain lazy imports from
  `Board.js`; their motion and target helpers live here too.
- `coordinates`, `boardLayout`, `boardUnderlayGeometry`, `boardUnderlayLayout`,
  `portLayout` and `renderMaps` provide board geometry for the renderer, effects,
  homepage previews and art generator. The existing `.js` geometry entry exports
  the `.mjs` implementation used by the Node generator.
- `boardBuildInteraction`, `boardPreviewTargets`, `passiveBuildMode` and
  `robberPlacementMotion` derive presentation affordances from game state. Legal
  moves still belong to `game-core/` and `lib/game-runtime/`.

`__tests__/` contains this feature's existing geometry, target, motion and render
coverage. Some older source-oriented assertions remain; their relocation does
not endorse them as the preferred testing pattern. Follow
[the testing policy](../../../docs/agent/TESTING.md) for future changes.

Art selection remains in `../theme/`, animation/audio runners in `../effects/`,
and HUD/feed components in `../components/`. Homepage staging remains in
`../homeDemo/`. Reuse these owners rather than making another board renderer.
Verify real board integration in `/catana/dev/sandbox`; use
`/catana/dev/effects` for isolated event runners.
