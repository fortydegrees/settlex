# SettleHex HAN record contract

Status: experimental version 1, `format: "han-prototype"`. This is the wire contract implemented by the maintained notation module. The upstream [Hexil Action Notation reference](https://github.com/hexil-org/hexer/blob/main/docs/hexil_action_notation.md) defines action syntax; this document defines SettleHex's whole-game envelope and replay interpretation. It does not assert compatibility with Hexil's runtime or its separate state notation.

The referenced HAN document was inspected on 2026-10-19; the research source receipt identifies Git blob `6d68ebad13194d9251fe9ed21e8eecfb5fff7447`. The implementation is original. A change to upstream main does not silently change the semantics of an existing record.

## File and information model

Use UTF-8 JSON, conventionally named `*.han.json`. Object key order and whitespace have no game meaning; action array order does. Use ordinary `application/json` where a media type is needed. No custom extension or media type has been registered.

A record describes what happened with full information: actual die faces, development-card identities and stolen resources. It does not store the future deck order, a random seed, private access credentials, chat or account metadata. Costs and other deterministic consequences come from the named rules. Redacted observations and inference about unknown facts belong in import tooling, outside this core contract.

[The complete example](examples/settlehex-complete.han.json) is valid input, not an abbreviated JSON sketch. Its first actions are setup placements. Its last action reaches the declared winner; replay verifies that result.

## Envelope

`format` is `han-prototype`; `version` is 1; `rules` names one of the three profiles below; `knowledge` is `omniscient`; `coverage` is `complete` or `prefix`. Players are ordered strings `1`, `2` for duel, or `1`, `2`, `3` (optionally `4`) for the base profiles, without duplicates. `board` contains tiles `{id,resource,number,vertices}`, `edges` mapping edge IDs to two vertex IDs, and `ports` mapping coastal vertex IDs to a resource code or `any`. Tile IDs follow HAN (`d4`); vertices (`d4n`) and edges (`d4ne`) use HAN labels. The explicit incidence graph is the single authority in this experimental envelope: geometry generation is a fixture tool, not a second record authority. Exactly one tile is desert (`resource:null,number:null`); other tiles use B,G,L,O,W and legal dice totals other than 7. `robber` initially names the desert. `result` is null for a prefix or `{winner:playerId}` for a complete record. `actions` is ordered. Optional `annotations` is ignored, never interpreted as state. Unknown rules, versions, formats or state-changing actions fail; missing chance outcomes fail rather than become zero/unknown.

A complete record starts at empty-board setup and ends at derived victory. A prefix starts identically and may stop mid-turn or pending free placement; EOF never ends a turn. The maintained reader accepts either coverage type as a self-contained record, with no separately injected starting state; wire-format records always begin at empty-board setup.

HAN address syntax is precise: tile `[a-z]+[1-9][0-9]*`, vertex adds `n|s`, edge adds `ne|nw|w`. Multi-letter columns are valid. The north/south canonical representatives can be anchored on hex coordinates absent from the land tile list. Other directional suffixes are not canonical vertex identities.

Every listed tile has six distinct vertices; every edge endpoint must occur among the listed tile vertices. Edge endpoint pairs are unique, with two distinct endpoints each. This is envelope shape/membership validation; these readers do not prove the supplied incidence graph is a geometrically valid hex tiling. The actual complete-game board's geometry is checked separately by fixture tests. Abstract unit-test graphs must still satisfy this envelope shape.

## Fixed base rules

These rules define `base-omniscient-prototype-1`; the named integration profiles below override the explicitly listed settings.

19 cards per resource; 15 roads, 5 settlements, 4 cities per player. Development inventory k:14,m:2,r:2,v:5,y:2, represented as remaining counts without order. Costs: road BL, settlement BGLW, city G2O3, development GOW. Victory at 10, Largest Army minimum 3, Longest Road minimum 5. Award ties retain the incumbent if tied for maximum, otherwise no holder. Road length is an edge-simple trail blocked by opponents' buildings; returning to a vertex is allowed but an edge cannot be reused. Settlement distance rule and road connectivity apply; opponent buildings block road continuation. Only the current player can win, including immediately upon entering their turn. Every action recomputes points/awards as needed and checks victory; no later actions after victory.

Setup snake order: 1,2,3,3,2,1 (analogously four players). Each settlement must immediately be followed by a touching road. Both are free; the second settlement grants one resource per touching non-desert tile from bank. Completing a pair automatically advances setup; there is no `E` in setup. Last pair enters player 1's pre-roll phase.

Roll records exactly two integer die faces 1..6. Non-7 income uses settlement/city multipliers and excludes robber tile. For each resource: sufficient bank pays all; insufficient bank with multiple claiming players pays none; a single claimant receives the available amount. On 7, every hand >7 discards floor(size/2), in any explicitly identified player order, then robber movement and theft resolve. A robber move must change tile; eligible victims are opponents with resources and a building on that tile. If none, resolve immediately; otherwise a steal action is required. A known stolen resource must exist in that victim's hand. No randomness is generated during replay.

Development cards bought this turn cannot be played this turn; VP cards count immediately and are never played as an action. At most one non-VP card per turn, before or after rolling. Knight increments army then resolves robber and returns to its prior phase. Monopoly transfers every opponent's chosen resource. Year of Plenty takes two available resources (or all remaining bank cards if fewer than two exist). Road Building enters pending free-road placement, with up to two roads limited by remaining pieces and legal edges. Return to prior phase when allocation exhausted or no legal road remains. Ending/trading/rolling while placement is pending is invalid. No early voluntary termination is encoded in this bounded profile.

Ordinary building, buying and trading occur only after rolling with no pending obligations. A domestic trade is an accepted, atomic exchange with one distinct opponent, both sides nonempty and disjoint resource types. Bank exchange is one resource type for one distinct resource type, ratio determined by owned settlement/city ports (2 specific, 3 generic, otherwise 4), and available bank supply. Trade proposals and negotiation are not gameplay events.

End turn requires actions phase; it matures the outgoing player's fresh development cards, advances player, clears the used-card flag and enters pre-roll. The current turn's used-card flag survives pre-roll Knight resolution and the roll.

## Logical action mapping

| Logical event and fields | HAN token(s) |
| --- | --- |
| `roll`, `dice:[2,3]` | `R(2+3)` |
| `build`, `piece:road/settlement/city`, `at` | `BR` + `PR...`, `BV` + `PV...`, `BC` + `PC...` |
| same build in setup or free-road phase | placement token only |
| `buyDev`, `card:k/m/r/v/y` | `BDk`, etc. |
| `play`, `card:k/r` | `UDk`, `UDr` |
| `play`, `card:m`, `resource:O` | `UDmO` |
| `play`, `card:y`, `resources:{G:1,O:1}` | `UDy(GO)` |
| `discard`, `player:2`, `resources:{O:2}` (player is a string) | `2A(O2)` |
| `moveRobber`, `at:d4` | `Md4` |
| `steal`, `from:2`, `resource:O` (from is a string) | `SO2` |
| `trade`, `with:2/0`, `give:{L:1}`, `take:{B:1}` (with is a string) | `T(L)(B)2` |
| `end` | `E` |

Resource quantities are positive safe integers, omitted keys mean zero; resource dictionaries cannot be empty except depleted-bank Year of Plenty. HAN cannot spell an empty formula under its published grammar: reject empty Year of Plenty as `unsupported-empty-plenty` and report this compatibility gap rather than inventing an upstream token. Formula order is not semantically meaningful; duplicate resource terms are rejected in this restricted canonical profile. A paid build must be the adjacent matching buy/place pair; no paid reservation state is supported. Dangling buys fail explicitly. Bare ordinary placement is invalid. Two free roads are two logical actions following the card play.

## Rules profiles for actual sources

The original `base-omniscient-prototype-1` profile remains unchanged. Two explicitly named profiles are added for actual source integration:

| Profile | Seats | Victory | Discard above | Friendly robber | Player trades |
|---|---|---|---|---|---|
| `base-friendly-omniscient-prototype-1` | 3 or 4 | 10 | 7 | public score <= 2 protected | allowed |
| `duel-friendly-omniscient-prototype-1` | 2 | 15 | 9 | public score <= 2 protected | disabled |

Both retain the base bank, pieces, card inventory, setup snake and all other base semantics. Friendly robber forbids moving onto a tile touching any protected player's building, including the moving player's own building. Public score includes buildings and awards, excluding hidden victory-point cards. Balanced or random dice generation is not reconstructed: the actual two faces are recorded. These are experimental replay rule profiles, not claims of compatibility with every mode called “duel”. Unknown profile names or wrong seat counts are rejected.

The two integration profiles also accept an atomic bank trade with multiple resource types in either basket. Each given resource must comprise an integer number of its best owned port/bank rate; total exchange units must equal the number of received cards. The baskets must be disjoint and both supplies sufficient before exchanging anything. This uses existing HAN resource-formula syntax. The original base trial retains its one-type-per-side restriction for historical compatibility.


## Compatibility and validation

Readers reject unsupported format/version/rules identifiers, illegal actions and missing chance outcomes. A prefix may stop while an obligation is pending; EOF never supplies the missing action. A complete record must derive the declared winner and cannot contain actions after victory. Annotations have no state-changing authority.

Keep existing meanings stable. Incompatible envelope changes require a new version; changed rule semantics require a new profile identifier. Unknown profiles must not fall back to a nearby supported mode. Supporting generic HAN syntax does not imply support for every action sequence or every Catan variant.

Current source-export limits include forfeits, robber skips with no legal destination, and empty Year of Plenty. They produce an unavailable archive conversion, not an invented token. Expansions, midgame snapshot imports, resumption with an unrevealed future deck, cryptographic fairness and masked-record reconstruction are outside this version. The explicit board is authoritative for incidence; the reader validates membership/shape, while the source mapper and viewer perform additional topology/geometry checks.

The archive sidecar status, database IDs and operational error codes are application storage metadata, not additions to the interchange file. Record availability and legality are separate from authorization to distribute omniscient information.

## Direction beyond this experimental profile

See [CGN direction](CGN-DIRECTION.md) for the agreed lean omniscient core and optional session/analysis additions. Those extension schemas and a CGN wire rename are not implemented by this version. See [log projection proof](LOG-PROOF.md) for the first post-game consumer experiment.
