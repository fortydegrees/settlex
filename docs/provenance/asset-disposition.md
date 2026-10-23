# Current assets and privately preserved studies

The curated tree omits the 244 exact paths in [archived-assets.tsv](archived-assets.tsv),
totaling 26,090,524 logical bytes. The table records original modes, Git blob IDs,
sizes and families for private recovery. Original source history and study evidence
remain privately preserved. These omissions do not establish rights to retained
assets and are not replacements for any shipped art or audio.

Omitted families: 44 design images/drafts; 120 root audio-source/sample files;
22 unconfigured public audio files; 26 public concept/preview files; 25 unselected
palette-study tiles; two alternate wheat icons; and five public leftovers.
This is an exact path list, not a folder-wide removal rule. The two optional
public palette HTML preview URLs, older audio URLs and other listed static URLs
cease to exist in this tree. Historical bookmarks, custom soundOverrides and
caller-supplied theme filenames using those paths are outside compatibility scope.

Retained: all 23 existing default audio files, all currently registered theme
families, all 60 piece files (19 registered colours plus retained legacy olive files), cards,
fonts/notices and useful soundkit source.
The dice-roll-test folder's four MP3s are active lead-ins; its five OPUS alternatives
are archived. Theme/piece resolvers and the default map are the current contract;
see [customization](../customization/themes-and-sounds.md). The obsolete generic
build:place audio mapping to missing build_settlement.mp3 was removed. The effect
event and settlement/city/road audio cues remain.

Eleven musical/interface MP3s have synthesis-recipe evidence: game-start,
your-turn, turn-end, award-road, award-army, discard-required, resource-blocked,
timer-low, timer-critical, game-win and game-lose. This does not claim an exact
encoded-file rebuild or redistribution clearance. The other 12 active files
(card_woosh, ui-pop-resource-out, settle, road, four die-throw clips and four
MP3 dice lead-ins) retain unresolved creation/terms evidence. Eleven have exact
root-archive duplicates; excluding the source copies does not clear the public
copies. See [sampled sound provenance](sounds.md) and the
[sound guide](../agent/skills/catana-brand/SOUND_DESIGN_GUIDE.md).

The current settlement, city and road artwork is David Pratt's original Inkscape
work, confirmed by its author on 21 October 2026. The earlier blanket uncertainty
about those pieces was incorrect. [Artwork authorship and font provenance](art-and-fonts.md)
distinguishes that correction from the separate custom-font and other asset
questions. Existing [third-party notices](../../THIRD_PARTY_NOTICES.md) remain.

Maintained app dev routes remain development-gated. Production GameScreen imports
payload helpers from dev/sandbox, so the dev directory is retained. The separate home-table,
sidebar-connection and underlay-waves development routes were subsequently
retired on 21 October 2026. The production homepage remains under
`app/_features/home/`; it did not depend on those experiment files.

Resolver verification found a pre-existing Palette B desert primary URL,
/svgs/tile_desert.svg, absent in both original source and candidate. The board's
background helper includes the retained emoji desert as its CSS fallback; direct
getTilePath consumers do not gain that CSS fallback automatically. No theme code
or art changed here. This gap remains an explicit follow-up, so curation parity
must not be described as every possible registered-theme URL resolving.
