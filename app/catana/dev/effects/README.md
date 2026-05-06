# Catana Effects Lab

`/catana/dev/effects` is the isolated replay surface for deterministic animation and audio tuning.

Use it when the work is about an effect runner, timeline timing, cue placement, sound mapping, or reduced-motion behavior that can be checked without the full game screen.

## Best For

- Resource distribution, piece placement, dev-card reveal, and other registered effect runners.
- Audio cue timing and custom local sound auditions.
- Time-scale checks and replaying the same effect repeatedly.
- Verifying an effect in isolation before checking it in the board sandbox.

## Before Editing

- Read `docs/agent/UI_CONTEXT.md`.
- Check `app/catana/effects/registry.js` and the effect runner before editing the lab.
- Check `app/catana/effects/soundThemes.js` and `app/catana/effects/AudioManager.js` before changing cue mapping or playback behavior.
- Search `docs/agent/NOTES.md` for the effect name; timing and visual decisions are usually recorded there.

## Verification Defaults

- Use the lab first for isolated runner timing.
- Use `/catana/dev/sandbox` afterward when the effect depends on live board/HUD anchors or viewer perspective.
- Run focused lint/tests when changing shared effect helpers, event payloads, registry wiring, or sound mapping.

## Guardrails

- Keep the lab deterministic and dev-only.
- Do not treat lab alignment as proof of live board anchor alignment.
- Respect reduced-motion and hidden-tab policy when changing runners.
- Keep source recipes and cue mappings as the source of truth; generated or auditioned assets are outputs.
