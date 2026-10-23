# Source references and unresolved derivation

Read-only source comparison and attribution update, 2026-10-20, candidate
e084dc11df79a160ba4737b6ffef2d8e68dc50f9. No production code changed and no
project license was chosen. This narrows the evidence; it is not a legal opinion
or a complete historical derivation audit.

## Board specification

`game-core/src/spec.ts` explicitly cites settlers-setup. Compared with pinned
upstream 5ae568ae5cbaf5a35a25f20bfd54a6c38d4c5b0a, the resource-count construction,
several board-spec field names/defaults and full roll-number list are retained;
geometry, port representation and bank setup have changed. Preserve attribution
rather than dismissing the whole source as generic rules data. Added its exact
1,071-byte MIT notice from LICENSE.md (copyright 2020 Cory Gagliardi) to
LICENSES/settlers-setup-MIT.txt and THIRD_PARTY_NOTICES.md. SHA-256:
79d309c59bc421652538b55578b6b88766a1b99dc454fe2f13e89e2cc14c7436.

[Compared source](https://github.com/cgagliardi/settlers-setup/blob/5ae568ae5cbaf5a35a25f20bfd54a6c38d4c5b0a/src/app/board/specs/standard.ts)
and [notice](https://github.com/cgagliardi/settlers-setup/blob/5ae568ae5cbaf5a35a25f20bfd54a6c38d4c5b0a/LICENSE.md).

## FreeBoardGames reference

Local commit eccb292 (2023-09-30) introduced the Sixty-Six reference beside a
comment saying “dummy card thing” and a commented-out StripSecrets call. The
upstream game source at 41a0077b7e76c1050b28f67537f00705a9095ed5 has a card-game
playerView with dummy cards, deck/stock/trick filtering and a different game
structure. Current local gameSetup/playerView.js instead masks the core player
map, development deck, game log and balanced-dice state. This inspection does
not identify an exact substantial copied block in the current playerView; it
also does not establish independent authorship or exclude intermediate copying.
The pinned upstream LICENSE is AGPL-3.0. Retain the historical reference and
keep the derivation question open; do not assign that license to local code
solely from the URL or call the code cleared from this limited comparison.

[Compared source](https://github.com/freeboardgames/FreeBoardGames.org/blob/41a0077b7e76c1050b28f67537f00705a9095ed5/web/src/games/sixtysix/game.ts)
and [upstream notice](https://github.com/freeboardgames/FreeBoardGames.org/blob/41a0077b7e76c1050b28f67537f00705a9095ed5/LICENSE).

## Santorini reference

The cited immutable commit 4d89b4bedbbb8c5cf57a123c42f7febe2fdf0dcb has a
TURN_ORDER_ONCE helper. Local eccb292 contains the same next-turn conditional,
modulo expression and undefined return with an altered first value. No current
TURN_ORDER_ONCE/getFirstPlayer occurrence was found in app/ or game-core/ in the
bounded search. This is historical borrowing evidence, not a claim of present
runtime use. The pinned package.json declares MIT; a root LICENSE fetch returned
404, and current repository metadata has no detected license. Do not invent a
copyright notice or treat that metadata mismatch as proof of no permission.
Preserve the reference and resolve the original notice if publishing that history.

[Compared source](https://github.com/mbrinkl/santorini/blob/4d89b4bedbbb8c5cf57a123c42f7febe2fdf0dcb/src/game/index.ts)
and [package declaration](https://github.com/mbrinkl/santorini/blob/4d89b4bedbbb8c5cf57a123c42f7febe2fdf0dcb/package.json).

## Evidence and remaining decisions

Pinned comparison identities above and complete original comparison receipts are preserved privately. Source comments, LICENSES and THIRD_PARTY_NOTICES retain attribution in this tree. These limited comparisons do not clear the overall project: SettleHextron-derived GPLv3 utilities, native source, custom font and sound/art origins still need a compatible publication decision. Removing internal audit receipts or old history does not resolve present distribution questions. See [art and font lineage](art-and-fonts.md), [sound provenance](sounds.md) and [third-party notices](../../THIRD_PARTY_NOTICES.md).
