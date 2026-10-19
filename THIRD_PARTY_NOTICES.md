# Third-party notices

This inventory is being completed for the public release. It does not grant
additional rights to unverified assets or replace dependency licenses.

## Outfit fonts

Files: `public/fonts/Outfit-Bold.ttf`, `Outfit-Black.ttf`, and
`Outfit-Medium.ttf`.

Copyright 2021 The Outfit Project Authors
(https://github.com/Outfitio/Outfit-Fonts).

The files identify SIL Open Font License 1.1 in their embedded metadata.
The complete notice is included in [Outfit-OFL.txt](public/fonts/Outfit-OFL.txt),
retrieved from the [Google Fonts Outfit distribution](https://github.com/google/fonts/tree/main/ofl/outfit).

## Catanatron-derived utilities

The following files cite Catanatron commit
`425ccdef04921d1756a1c9bb1f904fceb1f3c3d3` and contain adapted upstream code:

- `app/catana/utils/coordinates.js`
- `app/board-editor/utils/coordinates.js`
- `app/catana/utils/useWindowSize.js`
- `app/board-editor/utils/useWindowSize.js`

The pinned upstream distribution includes the
[GNU GPL version 3 license](LICENSES/Catanatron-GPL-3.0.txt).
[Original source and license](https://github.com/bcollazo/catanatron/tree/425ccdef04921d1756a1c9bb1f904fceb1f3c3d3).
Local changes include geometry helpers, board-editor spacing, and window measurement
for server rendering. Preserve the existing source attribution.

The overall project's license disposition is unresolved. This notice records
provenance and includes the upstream license; it does not assert that adding this
notice alone completes all redistribution obligations or that these files are MIT.

## Inventory still under review

- The custom SettleHex display face: its existing README records design
  provenance, but an explicit redistribution/license disposition is still needed.
- Recorded sound effects, downloaded reference audio, and board/reference
  artwork: determine the source and terms for each retained family. The sound
  synthesis kit does not establish provenance for the whole audio library.
- Vendored native game/inference code: retain source identity and provenance;
  resolve its publication/license scope separately from external model weights.

Package-manager dependencies retain their respective licenses. This initial
notice file is not a complete dependency or asset license inventory.
