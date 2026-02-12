# City PlacePiece Effect Test Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a failing test that asserts `placeCity` emits the `placePiece` effect when upgrading a settlement to a city.

**Architecture:** Extend the existing move effects test suite to cover the city upgrade path and verify the effect payload. Keep the change isolated to the test file and supporting agent docs.

**Tech Stack:** Vitest, JavaScript tests in `app/catana`, pnpm.

### Task 1: City placePiece wiring test

**Files:**
- Modify: `app/catana/__tests__/Moves.placePieceEffects.test.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Write the failing test**

```js
it("emits placePiece when placing city", () => {
  const effects = { placePiece: vi.fn(), distributeCardsFromTile: vi.fn() };
  const context = makeContext({ effects });
  context.G.core.buildingsByNodeId[0] = { ownerId: "0", type: "settlement" };

  placeCity.move(context, 0);

  expect(effects.placePiece).toHaveBeenCalledWith({
    pieceType: "city",
    id: 0,
    playerId: "0"
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C app/catana test Moves.placePieceEffects.test`
Expected: FAIL because `placeCity` does not emit `effects.placePiece` yet.

**Step 3: Update agent docs**

- Add a short entry in `docs/agent/PROGRESS.md` describing the new failing test.
- Add a short entry in `docs/agent/NOTES.md` noting the expected failure and next step.

**Step 4: Commit**

```bash
git add app/catana/__tests__/Moves.placePieceEffects.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "test: expect placePiece effect for city upgrades"
```
