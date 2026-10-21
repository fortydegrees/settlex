# Testing Notes

Future tests to implement when ready.

## UI Verification Matrix

Use this matrix to choose the smallest check that proves a UI change. It does not replace focused tests for logic, event wiring, or regressions.

| Change type | Canonical surface | First viewport/state | Verification default |
| --- | --- | --- | --- |
| Gameplay HUD, opponent boxes, resource/dev-card rails, turn controls | `/catana/dev/sandbox` | `1440x900`, relevant preset and viewer seat | Manual/dev-surface check plus `git diff --check` for tuning-only changes |
| Mobile HUD or responsive layout | `/catana/dev/sandbox` | `390x844`, same preset/state as desktop | Manual/dev-surface check; add focused tests only for shared logic or regression locks |
| Anchor-dependent board effects | `/catana/dev/sandbox` | actor and non-actor viewer perspectives | Sandbox replay or real flow; focused payload/registry tests when wiring changed |
| Isolated effect runner or audio cue timing | `/catana/dev/effects` | selected effect replay, normal and reduced motion when relevant | Lab replay; focused lint/tests for runner, registry, cue, or helper changes |
| Left meta rail connector geometry | `/catana/dev/sidebar-connection` first, then `/catana/dev/sandbox` | log-only, chat-only, both-open states | Visual comparison in scratch surface; sandbox check before production claims |
| Shared product UI primitive | `/catana/dev/ui` | desktop first, mobile if responsive | Component/source tests when API or shared behavior changed |
| Game rules, race conditions, server-authoritative state | Focused Vitest/game-core tests | reproduced failing state or server log sequence | Test-first regression; sandbox/browser checks are secondary |

When the user says the change is minor or asks not to debug visually, stop at the code diff plus the smallest relevant source/lint check.

## Integration Tests (boardgame.io Client)

### Placement Phase Flow
- [ ] Full placement phase: 2 players each place 2 settlements + 2 roads, verify phase transitions to main
- [ ] Snake draft order: verify turn order is correct (0, 1, 1, 0 for 2 players)
- [ ] Second settlement gives starting resources from adjacent tiles
- [ ] Cannot end placement early (phase only ends when all pieces placed)

### Main Phase Flow
- [ ] Roll dice distributes resources correctly
- [ ] Rolling 7 triggers robber flow (discard if >7 cards, then move robber)
- [ ] Building road deducts resources (1 wood, 1 brick)
- [ ] Building settlement deducts resources (1 wood, 1 brick, 1 wheat, 1 sheep)
- [ ] Building city deducts resources (2 wheat, 3 ore)
- [ ] End turn advances to next player and resets turn state

### Edge Cases
- [ ] Cannot build road without resources
- [ ] Cannot build road in invalid location
- [ ] Cannot place settlement violating distance rule
- [ ] Phase transition syncs G.core.phase with ctx.phase

## UI Component Tests (React Testing Library)

### Edge Component
- [ ] During initial placement: shows road outline when not hovering
- [ ] During in-game placement: only shows circular action node, road appears on hover
- [ ] Clicking edge calls moves.placeRoad with correct edge ID
- [ ] Clicking edge clears playerAction state

### ActionNode Component
- [ ] Renders expanding circle animation when active
- [ ] Shows piece preview on hover
- [ ] Click handler fires correctly

### PlayerActionContainer
- [ ] Build buttons disabled when not player's turn
- [ ] Build buttons disabled when insufficient resources
- [ ] Build buttons disabled when not in postRoll stage
- [ ] Clicking enabled button sets playerAction state

### Board Component
- [ ] buildableRoads populated when playerAction === "placeRoad"
- [ ] buildableRoads cleared when playerAction changes
- [ ] Correct edges shown based on ctx.phase (placement vs main)

## E2E Tests (Playwright/Cypress)

- [ ] Complete 2-player game from start to victory
- [ ] Multiplayer: two browser windows, verify state sync
- [ ] Mobile: touch interactions work correctly
