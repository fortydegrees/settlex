# Dev Card Purchase Reveal Design

Date: 2026-04-05
Scope: Catana buyer-only `buy dev` reveal driven by authoritative effect payloads and local presentation freeze
Status: Approved for implementation

## Goal

Keep `buy dev` feeling like a private reward moment, but stop deriving the revealed card from fragile local hand diffs.

For this slice:
- keep the current Catana dock styling and existing `buy dev` button,
- keep the reveal buyer-only as a UI flourish,
- drive the reveal from authoritative move/effect data instead of client-side card-count reconstruction,
- freeze the local dev-card hand and local VP badge until the reveal card lands in the dock,
- keep underlying game state immediate and authoritative.

## Non-goals

- No public or spectator dev-card face reveal.
- No redesign of the dock shell, dev-card hand layout, or avatar layout.
- No gameplay-rule change to dev-card purchasing, scoring, or win detection.
- No delay to engine state updates just to satisfy the animation.
- No change to game-over authority in this slice.
- No scenario-file cleanup or `.gitignore` work in this slice.

## UX Summary

During a successful `buy dev` action for the buyer:

1. The player clicks the `buy dev` dock button.
2. Only the dev-card emblem inside the dock icon squashes briefly.
3. The move executes immediately and authoritative game state updates immediately.
4. A buyer-only reveal effect arrives with the exact bought `cardType`.
5. While the reveal is active, the local dev-card dock stays visually frozen on its pre-buy contents.
6. The local VP badge also stays visually frozen on its pre-buy display, so a bought `victoryPoint` does not show early.
7. A temporary reveal element launches from the dock button, reveals the bought face at center, then flies into the dev-card dock.
8. When the reveal lands, the dock hand and local VP badge release to live state together.

For other players:
- no face reveal is shown,
- no local hand freeze is applied,
- their normal public-information UI stays unchanged.

## Product Rules

- The bought dev-card face is treated as buyer-only presentation, not as a transport secrecy requirement.
- The move remains the single source of truth for what card was bought.
- The reveal should follow the same overall architectural pattern as resource distribution:
  - authoritative state/effect first,
  - local UI delays only for presentation.
- The dock button owns only the preload squash and launch origin.
- The local dock hand and local VP badge must release on the same completion boundary.
- If buying a VP card wins the game, win logic still resolves immediately; this slice only delays the buyer's local dock/VP presentation.

## Recommended Approach

Use a dedicated dev-card purchase effect, emitted by the move with the exact `cardType`, and use local UI state only for geometry capture and presentation freeze.

Rejected approach from the prior version of this spec:
- do not derive the bought card by diffing `beforeCards` vs `afterCards` in the client.
- Reason:
  - it is brittle,
  - it breaks when local state is already polluted or masked,
  - it throws away information the move already knows exactly.

## Architecture + Data Flow

1. Update the core buy-dev path so the move layer can access the exact drawn `cardType` directly after purchase.
   Preferred shape:
   - `game-core/src/rules/devCards.ts` returns `{ ok: true, cardType }` on success.
2. In `app/catana/Moves.js`, `buyDevCard` should:
   - call the core buy function,
   - append the normal `dev:buy` game-log entry,
   - emit a new effect payload such as `effects?.buyDevCardReveal?.({ playerId, cardType })`.
3. Register the new effect in `app/catana/Game.js` through the existing `EffectsPlugin(...)` configuration.
4. In `app/catana/effects/GameEffects.js`, listen for `buyDevCardReveal` and forward it into the existing local effect/event bus.
5. In `app/catana/effects/registry.js`, register a dedicated handler channel for the dev-card reveal runner.
6. In `app/catana/components/PlayerActionContainer.js`, keep the click-time local snapshot:
   - `triggerRect`
   - `startedAtMs`
   - pre-buy visible dev-card hand snapshot
   - pre-buy local VP display snapshot
7. In `app/catana/GameScreen.js`:
   - keep one local pending purchase snapshot created on click,
   - wait for the authoritative `buyDevCardReveal` effect,
   - if the effect is for the local player and a pending snapshot exists, start the active reveal with:
     - `playerId`
     - `cardType`
     - `triggerRect`
     - destination rect
     - frozen hand snapshot
     - frozen VP snapshot
   - if the effect is for another player, ignore it for presentation.
8. While an active reveal exists for the local player:
   - `DevCardDisplay` renders the frozen pre-buy hand,
   - `PlayerAvatarStats` renders frozen pre-buy VP display values for `isMe`.
9. When the reveal completes:
   - clear the active reveal,
   - release both the hand and the local VP badge to live state immediately.

This matches the resource-distribution pattern conceptually:
- engine state updates now,
- the UI temporarily withholds visible presentation until the animation reaches its destination.

## Rendering Notes

- Keep `DevCardPurchaseReveal` as a detached overlay actor above board zoom/pan.
- Reuse the existing dev-card face SVG mapping already used by `DevCardDisplay`.
- Keep the dock destination as the real `DevCardDisplay` shell.
- The green plus badge remains dock-only and must not appear in the detached reveal actor.
- The buyer-only freeze should affect only:
  - the local dev-card hand presentation,
  - the local VP badge presentation.
- Opponent UI should continue reading live public state with no reveal-specific overrides.

## VP Synchronization Rule

The local VP badge should not increment early for a bought `victoryPoint`.

Approved rule:
- snapshot the local buyer's pre-buy VP display inputs before calling `moves.buyDevCard()`,
- while the reveal is active, `PlayerAvatarStats` for `isMe` must render that frozen snapshot instead of live totals,
- release it at the same instant the dev-card reveal lands in the dock.

This keeps the buyer's visible score change aligned with the reveal payoff without delaying actual scoring in the engine.

## Motion Notes

- Keep the already-approved reveal motion language:
  - emblem-only preload squash,
  - travel to center,
  - card-back build/fade,
  - face reveal,
  - hold,
  - travel to dock.
- Reduced-motion mode should shorten or simplify the reveal but preserve the same semantic sequence.
- A future "pro" mode can release the frozen hand/VP immediately by skipping or collapsing the reveal timing, without changing move or effect architecture.

## Failure Handling

- Illegal click or rejected move:
  - no reveal effect is emitted,
  - local pending snapshot should clean up quietly.
- Effect arrives for another player:
  - ignore for local reveal presentation.
- Effect arrives for the buyer but no local trigger snapshot exists:
  - do not invent geometry; fail quietly and show live state.
- Repeated clicks while a local reveal is pending or active:
  - allow only one local dev-card purchase reveal at a time.
- Unmount / route change during reveal:
  - clean up the overlay actor and release frozen presentation state immediately.

## File-Level Changes

- `game-core/src/rules/devCards.ts`
  - return the bought `cardType` from `buyDevCard(...)` on success
- `app/catana/Moves.js`
  - emit `buyDevCardReveal` effect with `{ playerId, cardType }`
- `app/catana/Game.js`
  - register the new effect in the `EffectsPlugin(...)` config
- `app/catana/effects/GameEffects.js`
  - listen for the new effect and forward it into the local effect bus
- `app/catana/effects/registry.js`
  - register a dev-card reveal handler channel
- `app/catana/GameScreen.js`
  - replace card-diff reveal derivation with effect-driven reveal start
  - own frozen local hand + VP presentation state
- `app/catana/components/PlayerActionContainer.js`
  - capture local pre-buy hand snapshot and pre-buy VP snapshot
  - continue owning launch geometry capture
- `app/catana/components/PlayerAvatarStats.js`
  - accept a local override/frozen VP display input for `isMe`
- `app/catana/components/DevCardDisplay.js`
  - no structural redesign; continue rendering whichever hand snapshot `GameScreen` passes down
- `app/catana/utils/devCardPurchaseReveal.js`
  - remove diff-based bought-card helpers that are no longer needed
- focused tests under `app/catana/__tests__/`
  - move/effect emission
  - buyer-only reveal wiring
  - frozen hand release
  - frozen VP release

## Guardrails

- Do not reintroduce bought-card derivation by local hand diff.
- Do not make opponents wait on the buyer's reveal.
- Do not delay the actual `buyDevCard` state update just to satisfy animation timing.
- Do not move DOM-geometry concerns into the move/effect payload.
- Keep buyer-only presentation gating in the client, not in the engine rules.

## Verification

- Add focused automated coverage for:
  - core/move path returning and emitting the correct `cardType`
  - `buyDevCardReveal` effect emission on successful buys only
  - local buyer reveal start from effect payload, not card diff
  - frozen local dev-card hand during active reveal
  - frozen local VP badge during active reveal
  - release of both at reveal completion
- Manual verification:
  - buy non-VP dev card: face reveal is correct and dock updates only on landing
  - buy VP dev card: local VP badge updates only on landing
  - opponent view never sees the face reveal
  - illegal buy leaves no stale pending state
  - reduced-motion path still preserves correct hand/VP timing

## Acceptance Criteria

- A successful `buy dev` emits an authoritative reveal payload containing the exact bought `cardType`.
- The buyer's reveal animation starts from that payload, not from local hand diffing.
- The buyer's dev-card dock stays visually frozen until the reveal lands.
- The buyer's VP badge also stays visually frozen until that same landing moment.
- Opponents do not see the bought card face reveal.
- Engine state and scoring still update immediately and authoritatively underneath the local UI freeze.

## Open Questions

- None for this slice. Future "pro mode" behavior can reuse this architecture by shortening or skipping the reveal timing rather than changing the data flow.
