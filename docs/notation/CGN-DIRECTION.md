# CGN direction

Status: agreed design direction, 20 October 2026. **CGN** is the provisional name for our whole-game interchange format. The current implementation remains `han-prototype`, version 1; this document does not rename existing files, APIs or Hexil's notation, nor declare a public standard or settle naming/licensing clearance.

For the current developer entry point, see [Implement a recorder or viewer](IMPLEMENTERS.md). It includes a runnable reference consumer and recipes for replay controls, logs and board rendering; it does not require adopting SettleHex's application architecture.

## A small, complete game record

The default record is omniscient: initial board, seats, named rules, ordered decisions, observed random outcomes and result. Dice, development-card draws and stolen resources are explicit. Seeds, random algorithms and future deck order are not the replay contract. Costs, production, scores and awards follow from the rules and are reconstructed rather than redundantly recorded.

Free setup placements and Road Building placements are interpreted in their game phase. Ordinary paid construction remains distinguishable. The live engine keeps its normal current state; an interchange record is a durable history, not a replacement for every runtime data structure.

Perspective masking belongs to the replay engine/viewer. An omniscient file remains full information even when its viewer conceals cards. Incomplete imports are different: facts or earlier play genuinely were not captured. Do not invent them. Their eventual import profile must describe missing information explicitly; they must not complicate or masquerade as the complete core. A known prefix starting at setup is already supported; arbitrary mid-game captures are not.

## Optional, interoperable additions

Optional does not mean arbitrary. These additions should eventually have standard semantics, while a basic reader can replay the game without them:

| Information | Direction |
|---|---|
| Completed resource exchange | Core action: participants and actual baskets exchanged. |
| Offers, counteroffers, rejections, cancellations, acceptance intent | Optional negotiation history. An acceptance that actually executes an exchange must also produce exactly one core trade. |
| Chat | Optional authored messages with ordering and context. |
| Timestamps, elapsed times, remaining clocks | Optional timing metadata; missing means unknown, never zero. Define units, clock basis, and before/after-action meaning. |
| Commentary and analysis | Optional annotations anchored to positions or actions; variations do not alter the main game. |
| Timeout/forfeit result or other rule-changing consequence | Required game semantics when supported, even if clock telemetry is absent. Currently unsupported endings must fail explicitly. |
| Automatic/forced-action provenance, connection notices | Optional session context; the action and any gameplay consequence still belong in the core. |

Extensions may live in the same file. Before freezing their syntax, define versioned extension names, stable references to logical actions/positions (including compound buy/place actions), message/offer identifiers, and deterministic ordering of multiple additions at the same position. Unknown optional additions may be ignored for gameplay; editing/export tools should preserve them or explicitly report loss. An extension that changes replay rules cannot be silently treated as optional: it needs a supported rules/profile declaration.

The current `annotations?: unknown` field is an experimental placeholder, **not** an implemented extension standard. This task does not invent or ship chat, negotiation or clock schemas. Removing optional additions must leave the same core states and result.

## Reuse inside SettleHex

The [saved-record proof](LOG-PROOF.md) regenerates and compares the gameplay log with the native log. Derived presentation entries include resource gains and award announcements without adding those redundant facts to storage. Independent shortage notices from one roll are semantically unordered; their displayed order belongs to the renderer. Action order, quantities and which roll caused each notice remain significant. No extra resource priority belongs in the notation.

The [post-game replay consumer](REPLAY-CONSUMER.md) now opens the compact record directly, reconstructs board positions and cursor-limited logs, and reuses the existing perspective controls and log-click seeking. The finished-archive consumers now also prefer supported complete stored records, with legacy controller-history reconstruction as fallback. This integration is implemented locally and not yet deployed.

The portable record should become SettleHex’s canonical saved history. The current fallback is a migration mechanism for historical games and unsupported records, not a second permanent notation. Broader conformance, unsupported-ending coverage and structured record emission from the authoritative engine should precede retiring duplicate controller history for new games. The efficient live current-state representation remains separate. Live consumers could share semantic event types and rendering code, but should not repeatedly serialize and parse the entire archive. A live opponent feed still requires server-side information filtering; sending the omniscient file and hiding text in the browser is not filtering.

## What PGN teaches us

The original [Portable Game Notation Specification and Implementation Guide](https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm) is the useful reference, particularly §§2.2, 3, 5, 8 and 9: portable, public interchange; predictable generated output; a small game representation with comments and supplemental metadata. It already discusses time-control tags and alternative starting positions. We should adopt its separation of game semantics from optional enrichment, rather than copy chess-specific fields or grammar.

Per-move clock commands such as `%clk` are described in the later [Enhanced PGN proposal](https://www.enpassant.dk/chess/palview/enhancedpgn.htm), not the original PGN movetext contract. The lesson for CGN is to specify optional additions deliberately, not assume that putting an opaque payload in a comment establishes interoperability.

## Compatibility and credit

[Hexil Action Notation](https://github.com/hexil-org/hexer/blob/main/docs/hexil_action_notation.md) supplies the action-language foundation and retains its name and attribution. CGN describes the proposed whole-game agreement around it: envelope, rules, replay semantics, completeness and extensions. Current wire details are in [FORMAT.md](FORMAT.md). A public release still needs an explicit versioning decision, licensing/provenance review, independent implementations and conformance fixtures. Adoption by SettleHex is the first implementation, not evidence that a community standard already exists.
