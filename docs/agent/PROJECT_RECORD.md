# Project record and provenance

This maintained record links contributor guidance and source identity. Add concise architectural decisions, verification outcomes and outstanding provenance questions here. Keep detailed private operations and research receipts in their owning private archive. Historical originals remain preserved in the private recovery ledger; this record does not replace their evidence.

## Contributor guidance

- [Repository overview](../../README.md) and [contributing](../../CONTRIBUTING.md)
- [Architecture](../architecture/overview.md) and [theme and sound customization](../customization/themes-and-sounds.md)
- [Testing](TESTING.md), [UI context](UI_CONTEXT.md) and [Storybook](STORYBOOK.md)
- [Bot model installation and rollback](BOT_MODELS.md), [native runtime](../../native/settlegraph-v2/README.md) and [source and model provenance](../../native/settlegraph-v2/PROVENANCE.md)

The runtime source, observation/action contracts, model identities and rollback instructions remain in those maintained guides. Removing historical research logs does not establish model strength or change the serving contract.

## Attribution and unresolved origins

Preserve [third-party notices](../../THIRD_PARTY_NOTICES.md), [source-reference findings](../provenance/source-references.md), [asset identities](../provenance/assets.md), [sound provenance](../provenance/sounds.md) and the font source README. Those records include unresolved ownership and redistribution questions; no project license or asset clearance is implied here.

The current settlement, city and road artwork in `public/svgs/pieces/` is
original artwork by David Pratt, created in Inkscape, as he confirmed on
21 October 2026. Earlier audit text incorrectly applied historical reference
notes to these finished pieces. [Artwork authorship](../provenance/art-and-fonts.md)
and the inventory now record the correction for all 60 piece files.

The font and sound records retain their own source identities and limitations. The current source-reference follow-up also retains pinned upstream board-spec references and their notices. Do not erase attribution while separating private operational narrative.

## Verification and historical records

[Public verification record](../VERIFICATION.md) states completed implementation checks and remaining limits. Detailed internal logs/study receipts are preserved privately; this concise record does not contain their full accumulated decisions. Record future concise product decisions here and use the owning source/surface guides for current detail. Publication/license/asset decisions remain unresolved.


## Current source owners

`lib/game-runtime/README.md` describes game registration and adapters shared by
server, browser and replay. `app/catana/board/README.md` describes board rendering,
geometry and placement previews; GameScreen remains the screen composition owner.
See [notation](../notation/README.md) for the maintained experimental reader,
exporter and additive archive sidecar. Attribution and format limits remain part
of those contracts; migration 0009 still needs real-PostgreSQL qualification.

## Artwork credit and reference cleanup — 21 October 2026

Removed two unused legacy number-image URL helpers. Privately archived 36 old
brand-comparison, piece/icon-design and brainstorming files with verified
byte-for-byte recovery. Updated the documentation index and retained-history
guide. No board art, gameplay behavior or asset licence changed.
