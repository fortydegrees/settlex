# CTA Color Update: Emerald → Lime

**Date:** 2025-02-11
**Status:** Implemented

## Problem

The original emerald-500 used for CTAs (Play button, Join button, Submit actions) felt too dull and muted. It didn't have enough energy or visual pop against Catana's vibrant blue backgrounds.

## Solution

Switched to **lime-500/600** for all primary action buttons.

### Rationale

- **More vibrant:** Lime is significantly brighter and more saturated than emerald
- **Higher energy:** The yellow-green hue conveys instant action and excitement
- **Better contrast:** Lime pops beautifully against sky-blue/blue-600 backgrounds
- **Action-oriented:** Perfect for "instant matchmaking" and "let's go" moments

### Colors Changed

| Element | Old | New |
|---------|-----|-----|
| Primary buttons | `bg-emerald-500 hover:bg-emerald-600` | `bg-lime-500 hover:bg-lime-600` |
| Status dots | `bg-emerald-400` | `bg-lime-400` |
| Rings | `ring-emerald-300` | `ring-lime-300` |

## Files Updated

- `docs/agent/skills/catana-brand/SKILL.md` – Design system documentation
- `app/catana/lobby/LobbyPageClient.js` – All CTA buttons and status indicators
- `app/catana/dev/effects/PiecePlacementLab.jsx` – Dev tool consistency
- `app/catana/dev/effects/ResourceDistributionLab.jsx` – Dev tool consistency

## Visual Impact

Lime-500 maintains the same pattern (shadow-md, hover:scale, transition-all) but delivers a more energetic, attention-grabbing presence that aligns with Catana's joyful, vibrant philosophy.
