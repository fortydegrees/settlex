# Testing Notes

Future tests to implement when ready.

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
