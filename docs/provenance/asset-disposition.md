# Current assets and archived files

The current tree omits the 244 exact paths in
[archived-assets.tsv](archived-assets.tsv), totaling 26,090,524 logical bytes.
Original modes, Git blob IDs, sizes and families support private recovery.
The listed static URLs, including optional palette previews and older audio,
are no longer available. Historical bookmarks, custom sound overrides and
caller-supplied theme filenames using those paths are outside compatibility scope.

Current assets include all 23 default audio files, registered theme families,
60 piece SVGs, cards, fonts and the sound synthesis kit. The four MP3 dice lead-ins
remain active. Theme/piece resolvers and the default sound map define the runtime
contract; see [customization](../customization/themes-and-sounds.md),
[artwork and fonts](art-and-fonts.md) and [sounds](sounds.md).

The pre-existing Palette B desert URL `/svgs/tile_desert.svg` is absent. The board
background helper supplies the retained emoji desert as a CSS fallback; direct
`getTilePath` consumers do not receive that fallback automatically.
