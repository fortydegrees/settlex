# Testing

Tests should protect observable behaviour and important system contracts. A
large test-file count is not useful when assertions only freeze how the current
implementation happens to be written.

## Test selection

Use the smallest layer that proves the requirement:

1. Engine rules and state transitions: deterministic engine or real
   boardgame.io reducer tests.
2. Server, authentication, and match lifecycle: call the real handler or
   manager with controlled adapters.
3. UI state and presentation decisions: test a pure model or helper.
4. Component semantics and interaction: render or exercise the real component.
5. Visual layout, CSS, animation timing, and copy: Storybook, the relevant SettleHex
   dev surface, or focused browser verification.
6. Source and configuration inspection: only when the inspected artifact is
   itself the runtime contract, such as Caddy, Docker, shell scripts, manifests,
   patches, or Next route-export constraints.

Do not add tests whose only evidence is an exact:

- CSS or Tailwind class;
- copy string or heading;
- import path or component nesting choice;
- local variable, hook, dependency array, or state-setter name;
- implementation-specific animation or memoization pattern.

These checks break harmless refactors while proving neither rendering nor
interaction. If a runtime behaviour matters, expose it through a pure helper,
rendered component, reducer, handler, or browser flow and test that boundary.

## Durable coverage

Preserve strong automated coverage for:

- deterministic engine rules, move validation, and game-over state;
- reducer state IDs, logs, and replay reconstruction;
- authentication, authorization, credentials, and private player state;
- match creation, joining, leaving, recovery, alerts, timers, and forfeits;
- archive persistence and winner/participant results;
- deployment and public-route security contracts;
- reusable UI state models and interaction helpers.

Presentation-only tuning should use the sandbox, effects lab, viewport wall,
Storybook, or focused browser checks. Add a regression test when presentation
work changes shared logic, event wiring, cleanup, ownership, or state flow.

## UI Verification Matrix

Use this matrix to choose the smallest check that proves a UI change. It does not replace focused tests for logic, event wiring, or regressions.

| Change type | Canonical surface | First viewport/state | Verification default |
| --- | --- | --- | --- |
| Gameplay HUD, opponent boxes, resource/dev-card rails, turn controls | `/dev/sandbox` | `1440x900`, relevant preset and viewer seat | Manual/dev-surface check plus `git diff --check` for tuning-only changes |
| Mobile HUD or responsive layout | `/dev/sandbox` | `390x844`, same preset/state as desktop | Manual/dev-surface check; add focused tests only for shared logic or regression locks |
| Anchor-dependent board effects | `/dev/sandbox` | actor and non-actor viewer perspectives | Sandbox replay or real flow; focused payload/registry tests when wiring changed |
| Isolated effect runner or audio cue timing | `/dev/effects` | selected effect replay, normal and reduced motion when relevant | Lab replay; focused lint/tests for runner, registry, cue, or helper changes |
| Left meta rail connector geometry | `/dev/sandbox` | log-only, chat-only, both-open states | Visual comparison in the real game shell |
| Shared product UI primitive | Storybook, then `/dev/ui` | desktop first, mobile if responsive | Component interaction tests when API or shared behavior changed |
| Game rules, race conditions, server-authoritative state | Focused Vitest/game-core tests | reproduced failing state or server log sequence | Test-first regression; sandbox/browser checks are secondary |

Use focused checks for small changes; broaden verification when shared logic or state flow changes.
