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
server, browser and replay. `app/_features/game/board/README.md` describes board rendering,
geometry and placement previews; GameScreen remains the screen composition owner.
See [notation](../notation/README.md) for the maintained experimental reader,
exporter and additive archive sidecar. Attribution and format limits remain part
of those contracts; migration 0009 still needs real-PostgreSQL qualification.

## Artwork credit and reference cleanup — 21 October 2026

Removed two unused legacy number-image URL helpers. Privately archived 36 old
brand-comparison, piece/icon-design and brainstorming files with verified
byte-for-byte recovery. Updated the documentation index and retained-history
guide. No board art, gameplay behavior or asset licence changed.

## Local tooling and public source — 21 October 2026

Personal agent skill collections, Codex hooks and the optional design-converter
bridge are privately archived and excluded from the tracked repository. Removed
the converter-only package type entry and the Codex-hook-specific test. Product
release scripts, Storybook, GitHub Actions and application source are unchanged.
`AGENTS.md` now provides a short repository guide without requiring a particular
agent installation. The README's presentation remains a separate editorial task.

## Contributor documentation cleanup — 21 October 2026

Privately preserved dated plans, stale handoffs/backlogs, superseded notation
proposals, early design/writing notes and historical Puffer writeups. Current
architecture, notation, UI, testing, operations and provenance guides remain.
Moved the useful UI verification matrix into the testing guide and removed two
unregistered browser scripts tied to obsolete lobby controls. Recovery reuses
existing private history for exact matches and archives only distinct versions.

## Retired experimental routes and Puffer — 21 October 2026

With David's approval, privately preserved and removed the board editor,
home-table, sidebar-connection and underlay-waves experiments, plus Puffer's
training, inference and server integration. The homepage and match creation now
use SettleGraph only; its existing availability flags remain. Removed the
Puffer search rescue and arbitrary lobby bot-fill action. Existing server stage
auto-moves handle inference failure without a Python backend. Historical bot
names in archive/identity fixtures remain valid saved-game data.

Removed the two editor-only dependencies. Current artwork, sandbox, effects lab,
Storybook, native runtime, engine and maintained contributor guides remain.

Focused bot/default and match-route checks and all eight rendered lobby lifecycle
stories passed. UI policy, all 169 engine tests, all 201 app test files and lint
passed. The server suite passed 352 tests and skipped 18; its unchanged real-worker
notation test exceeded the converter's 30-second timeout, including in a separate
run. No notation code or timeout was changed in this retirement.

## Compact archived replay consumers — 22 October 2026

Finished-game page, legacy replay links and post-game replay fetch now prefer a
validated complete compact record. One shared selector checks participant seats,
winner and drawable geometry, then sends the record for browser reconstruction.
Old, unavailable or invalid records retain controller-history fallback. Native
archives remain stored; this is a consumer integration, not a storage cutover.

Replay positions share their resulting board and log prefix. Finished replays
reveal recorded hands by default, with a perspective toggle; masking is a viewer
policy, not an information-access boundary. Incomplete prefixes have no results.
Replay dice follow the selected position, and phone players scroll horizontally.
The maintained notation guides and integrated Storybook examples own the details.

Local engine/server tests, all 206 app test files, UI policy and lint passed.
The saved-record comparison matched every native gameplay row and rendered text
for the retained complete example. The production build passed with the existing
build-time placeholder facility; no live credentials or database were used.
Real PostgreSQL migration/write/read qualification remains outstanding because
no local PostgreSQL server or Docker daemon was available. The previously timed-out
notation worker passed with its unchanged 30-second deadline in both diagnostic
and combined runs; the earlier failure's cause remains unproven. No deployment,
backfill or public release qualification is implied.

## 2026-10-23 — app feature ownership

Replaced the SettleHex implementation umbrella with `app/_features/` owners for
home, account/profile, match lifecycle, game presentation, replay, theme and dev
surfaces. See `app/_features/README.md` for the source reading path. Existing
URLs and development guards remain in thin route adapters; persisted names,
CSS selectors and runtime identities are unchanged. `GameScreen` retains screen
orchestration and deferred surfaces. The purchase reveal and its snapshot helper
are colocated under game effects; cards own the shared `CardIcon` and hand renderer.
Pure compact replay adapters and shared text/alert models now serve browser and
server consumers from `lib/`. Rules, notation and authoritative privacy retain
their existing owners. Runtime tests moved into the server/lib lane without
changing the runner; the game UI shorthand is now `pnpm test:game-ui`.

The organisation pass retained all 318 test files and 36 story files. Combined
qualification passed 160 app test files, 174 engine tests, and 614 server/lib
tests with 18 environment-dependent skips, plus UI policy, lint, Storybook and
a production build using server placeholders. Production HTTP checks preserved
the five dev-route and scenario-API guards. Browser checks covered purchase/card
privacy, home/account/profile, matchmaking/reconnect stories and complete/prefix
replays at desktop and phone sizes. Independent source review found no behavioral
or architectural issue; a whitespace check and an existing mobile story's portal
query were corrected. This is local qualification, not real-PostgreSQL, physical
device or deployment evidence.

## Current design guidance (23 October 2026)

DESIGN_SYSTEM owns product intent and interaction responsibilities. The old brand guide is a compatibility pointer; use the catalog, production stories and current owning components. Shared feedback belongs to shared controls; game-event choreography belongs to effects. Review control families and whole journeys, including keyboard order, repeat input and reduced motion. Trade/discard and game-over composition remain design work.

The private UI polish review sampled account, trade/discard, results and replay. Its proposed fixes are not implementation approval or a whole-product audit. Preserve that evidence privately; this naming pass does not implement visual changes.
