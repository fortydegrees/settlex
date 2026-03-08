# Catana Dev Live Theme Switcher Design

**Date:** 2026-02-16

## Goal
Add a dev-only in-game theme dropdown that swaps board + HUD art live (no page refresh), while keeping implementation minimal and low-risk.

## Scope (Phase 1)
- Tile art (6 resources)
- Robber icon
- Settlement/city/road visuals
- Port visuals
- Resource icons used in HUD/trade/log/debug/resource distribution cards

Out of scope:
- Dice skin
- Dev/resource card face/back skin
- Server persistence / per-user backend settings

## Approach (Minimal Surgery)
1. Introduce a tiny theme asset helper that maps `themeId -> assetBase`.
2. Store `themeId` in `GameScreen` React state.
3. Add a dev-only dropdown in `GameScreen`.
4. Persist selected theme to localStorage and hydrate on load.
5. Pass `themeId` to already-existing UI components and swap hardcoded `/svgs/...` paths via helper.

## Theme Model
- `classic`: `/svgs`
- `custom`: `/svgs-custom`

File naming convention remains shared across theme folders.

## Fallback Strategy
- For CSS backgrounds: render `background-image` with themed URL first and classic URL second.
- For `<img>` sources: use `onError` to fall back to classic URL.

## Why This
- Fast iteration for custom SVG packs
- Minimal churn to existing components
- Clean path to future in-game user settings (reuse same `themeId` plumbing)
