# Frontend Loading Performance Design

## Goal

Reduce the JavaScript, asset transfer, and startup work required for the SettleHex homepage and live game without intentionally changing their visible presentation, interaction design, animation timing, or audio timing.

The work is a small loading-efficiency pass. Current performance is acceptable, so maintainability and low regression risk take priority over maximizing benchmark scores.

## User-facing contract

- The homepage, board, HUD, drawers, dialogs, animations, and sounds retain their current appearance and behavior.
- The homepage poster may remain visible slightly longer while the interactive demo loads, but there must be no blank board or layout shift.
- Idle preloading should make deferred game UI ready before normal use. If a user opens something unusually early, the same import starts immediately and shows only a minimal temporary fallback if required.
- Effects never wait for a sound download. Existing cue timing remains authoritative.
- The only intentional visual change is a smaller, accurate browser-tab icon derived from the accepted homepage mark.

## Scope

### Favicon

Create a canonical App Router SVG icon from the homepage logo mark and replace the current 145 kB multi-frame ICO with either a tiny legacy fallback or no ICO if the SVG path provides adequate coverage.

### Homepage

Keep the static board poster, brand, primary actions, and required homepage behavior in the initial render. After first paint, use a browser idle callback with a bounded timeout to load the interactive board and placement animation.

Replace the homepage demo's dependency on the full live-game `GameEffects` stack with a homepage-only bridge around the existing piece-placement runner. The demo remains muted and must not initialize Howler, haptics, or the complete effect registry.

Defer account and identity modal code because those surfaces are absent until opened. They may be preloaded in the same post-paint idle period.

### Live-game UI

Create dynamic import boundaries for:

- the mobile meta drawer and Vaul;
- `TradeDiscardModal`;
- `DevCardPurchaseReveal`;
- `ResignConfirmDialog`;
- `GameOverModal`, `PostgameOverlay`, and `canvas-confetti`.

Use one cached import promise per boundary. Schedule the imports after the match is interactive during browser idle time. An interaction that occurs before idle preloading completes starts or reuses the same promise immediately.

The Vaul chunk is preloaded only in phone layout. Desktop-to-phone resizing schedules it at that point. Desktop game startup must not fetch Vaul.

Keep the board, initial-placement effects, HUD, action controls, timer, connection state, `MobileMatchMenu`, the small game-over shell, and the existing inline settings/rules UI eager.

### Audio

Add one flat preload operation to the existing `AudioManager`. The live game schedules the current sound set during its post-interactive idle window. Do not add sound groups, phase hierarchies, or a new manifest system.

Move the development-card reveal's locally constructed Howler instances onto the existing cue/audio path so mounting the component does not download audio and reveal sounds remain aligned with the GSAP timeline.

The muted homepage does not preload game sounds. A future background match-found notification is a separate exception: it should be unlocked and preloaded from the user's matchmaking action.

## Failure behavior

- Dynamic imports reuse a cached promise so idle preloading and early interaction cannot start duplicate loads.
- A deferred visual surface may show a minimal loading shell if opened before its import completes; core game controls remain available.
- Audio playback never delays an effect. If a sound is unexpectedly unavailable, the visual effect proceeds on time rather than playing the sound late.
- Reduced-motion behavior remains unchanged.

## Verification

Use one before-and-after comparison instead of repeatedly profiling every edit:

1. Preserve the existing production-build, Lighthouse, and real-game network baseline.
2. Implement the complete pass.
3. Run a production build to catch import and bundling failures.
4. Run focused tests only where shared audio wiring or existing source assertions require coverage; do not add a test for every rote dynamic-import edit.
5. Smoke-test a real local match at desktop `1440x900` and phone `390x844`, covering the homepage transition, mobile drawer, trade/dev-card flow, resign dialog, and game-over UI.
6. Repeat the production bundle, network, and Lighthouse measurements once and compare them with the baseline.

Unexpected visual, interaction, animation, or audio-timing changes are regressions even if performance improves.

## Deferred work

This pass does not include:

- hashed or immutable URLs for mutable `public/` assets;
- SVG spritesheets or audio sprites;
- a service worker or new asset pipeline;
- replacing or expanding the use of Vaul;
- multiple audio preload groups;
- extracting settings/rules solely to create more chunks;
- broad component or styling refactors.

Those options should be reconsidered only when future asset volume or profiling provides a measured reason.
