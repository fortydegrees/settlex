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
5. Visual layout, CSS, animation timing, and copy: Storybook, the relevant Catana
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

## 2026-07-28 baseline

- 351 repository test files.
- 257 app test files.
- 121 app test files read production source text.
- 110 source-reading files are under `app/catana`.
- 51 files are explicitly named `*.source.test.js`.

The cleanup plan is recorded in
`docs/superpowers/plans/2026-07-28-test-suite-refactor.md`.

## 2026-07-28 first-pass result

- 68 low-value test files deleted and one focused behavior suite added.
- 190 app test files remain, down from 257.
- 63 repository tests read source, down from 133.
- 51 app tests read source, down from 121.
- 46 Catana tests read source, down from 110.
- 22 app files are explicitly named `*.source.test.js`, down from 51.

The remaining source-oriented tests were not automatically blessed as ideal.
They were retained when they protect an executable artifact or a higher-risk
auth, reconnect, lifecycle, route, interaction, or performance contract without
a behavior-first replacement. Migrate those contracts before deleting them.
