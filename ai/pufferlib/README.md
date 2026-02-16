# Settlex + PufferLib

This directory contains a standalone RL training harness that uses the existing Settlex `game-core` engine without modifying engine code.

## Layout

- `js/settlexEnv.cjs`: deterministic self-play environment built on `@settlex/game-core`.
- `js/engine_host.cjs`: JSONL stdio host process for Python.
- `python/settlex_puffer/env.py`: Gymnasium environment wrapper.
- `python/settlex_puffer/policy.py`: masked discrete policy (hard masks illegal logits).
- `python/settlex_puffer/policy_factorized.py`: factorized relational policy (global + tile/node/edge tokens + light attention).
- `python/settlex_puffer/train.py`: PufferLib training entrypoint.
- `python/settlex_puffer/smoke.py`: random-policy smoke test.
- `python/settlex_puffer/infer_server.py`: JSONL inference worker used by the game server bot adapter.

## What This Supports

- Placement phase: settlement + road with snake order.
- Main phase: roll, build road/settlement/city, maritime trade, buy dev card, end turn, robber movement.
- Explicit dev-card actions: knight, road building, monopoly, year of plenty.
- Forced robber discards are auto-resolved.
- Deterministic seeded episode generation.
- Fixed discrete action space + per-step action mask.
- Observation schema v2 with explicit tile/node/edge board features and schema hashes for serving compatibility checks.

## What Is Intentionally Omitted (for now)

- Player-driven discard choice actions (auto-resolved).
- Player-to-player trade negotiation.
- Victory-point dev card "play" actions (VP cards stay implicit in hand scoring).

## Setup

From repo root (`/Users/david/coding/settlex`):

```bash
pnpm -C game-core build

cd ai/pufferlib/python
uv venv
source .venv/bin/activate
uv pip install -e .
```

## Smoke Test

```bash
cd /Users/david/coding/settlex/ai/pufferlib/python
source .venv/bin/activate
python -m settlex_puffer.smoke --steps 500
```

## Train (PufferLib)

```bash
cd /Users/david/coding/settlex/ai/pufferlib/python
source .venv/bin/activate
python -m settlex_puffer.train \
  --device cpu \
  --num-envs 8 \
  --total-timesteps 200000
```

For `--num-players 2`, the JS env now defaults to duel rules (`15` VP win target, discard limit `9`), matching live 1v1 matchmaking defaults.

`train.py` now supports:
- `--policy-arch factorized-relational` (default)
- `--policy-arch masked-mlp` (legacy baseline)

PufferLib prints a live training dashboard in the terminal (SPS, losses, entropy, and custom env stats).
Optional remote logging:

```bash
python -m settlex_puffer.train ... --wandb --wandb-project settlex --wandb-group puffer
```

`train.py` defaults are tuned for local starts (`--minibatch-size 128`) and clamp minibatch when `--batch-size auto` so short runs don't fail from `batch_size < minibatch_size`.

## Evaluate Checkpoints vs Random Opponents

```bash
cd /Users/david/coding/settlex/ai/pufferlib/python
source .venv/bin/activate

python -m settlex_puffer.evaluate \
  --checkpoint /tmp/settlex-puffer-runs-masked \
  --episodes 100 \
  --player-id 0
```

`evaluate.py` auto-detects checkpoint architecture by default (`--policy-arch auto`) and reports win rate for `player-id` controlling one seat, with other seats acting randomly.

## Collect Eval Curves For Blog Graphs

Evaluate all checkpoints in a run directory and write a CSV curve:

```bash
cd /Users/david/coding/settlex/ai/pufferlib/python
source .venv/bin/activate

python -m settlex_puffer.eval_curve \
  --run-dir /Users/david/coding/settlex/ai/pufferlib/runs-1v1-duel/177081525039 \
  --episodes 24 \
  --seeds 101,202,303
```

This writes `/Users/david/coding/settlex/ai/pufferlib/runs-1v1-duel/177081525039/eval_curve.csv` with:
- checkpoint update
- approximate global step
- mean/std win rate across seeds
- truncation/no-winner rates
- mean episode length
- eval wall-clock seconds

Optional: watch mode while training in another terminal:

```bash
python -m settlex_puffer.eval_curve \
  --run-dir /Users/david/coding/settlex/ai/pufferlib/runs-1v1-duel/<RUN_ID> \
  --episodes 16 \
  --seeds 101,202 \
  --watch
```

Plot one or more curve CSVs:

```bash
python -m settlex_puffer.plot_curve \
  --csv \
    /Users/david/coding/settlex/ai/pufferlib/runs-1v1/177081417277/eval_curve.csv \
    /Users/david/coding/settlex/ai/pufferlib/runs-1v1-duel/177082409482/eval_curve.csv \
  --labels "v1 masked-mlp,v2 factorized-relational" \
  --x-field checkpoint_update \
  --y-field win_rate_mean \
  --out /Users/david/coding/settlex/ai/pufferlib/plots/v1-v2-winrate.png
```

`plot_curve.py` requires `matplotlib` in the venv.

## Play Against the Trained Bot (Server Adapter)

The boardgame server can run bot seats using the trained policy.

1. Build game-core and install Python deps:

```bash
pnpm -C /Users/david/coding/settlex/game-core build
cd /Users/david/coding/settlex/ai/pufferlib/python
source .venv/bin/activate
uv pip install -e .
```

2. Start server with bot env vars:

```bash
SETTLEX_BOT_PLAYER_IDS=1 \
SETTLEX_BOT_MOVE_DELAY_MS=450 \
SETTLEX_PUFFER_CHECKPOINT=/absolute/path/to/model_XXXXXX.pt \
SETTLEX_PUFFER_PYTHON=/Users/david/coding/settlex/ai/pufferlib/python/.venv/bin/python \
pnpm serve
```

Notes:
- `SETTLEX_BOT_PLAYER_IDS` chooses which seat IDs are bot-controlled (comma-separated).
- Match `numPlayers` to the model you trained (for example, a 4-player checkpoint should be used in 4-player matches).
- On the main lobby page, use **Play Against Bot** for a quick 1v1 with seat `1` auto-filled as Puffer.
- On the match lobby page, use **Fill Open Seats With Bots** to mark open seats as Puffer bots (`data.bot = "puffer"`), which the server detects dynamically.

### Optional Search At Inference Time

Enable expectimax-style one-ply/multi-ply lookahead in the server bot manager:

```bash
SETTLEX_PUFFER_SEARCH=expectimax \
SETTLEX_PUFFER_SEARCH_BUDGET_MS=250 \
SETTLEX_PUFFER_SEARCH_TOPK=12 \
SETTLEX_PUFFER_SEARCH_MAX_DEPTH=2 \
pnpm serve
```

Defaults (when unset): search off, budget 250ms, top-k 12, depth 2.

## Notes

- Observation includes the action mask concatenated to the feature vector.
- Illegal actions are replaced with a sampled legal action and receive a small penalty.
- Model/checkpoint artifacts are written under `ai/pufferlib/runs/` by default.
- Inference validates `observationSchemaHash` and `actionSpaceHash` when provided. If you change observation/action schema, old checkpoints may no longer load for serving and should be retrained.

## Writeups

- Baseline (v1): `ai/pufferlib/writeup.md`
- Follow-up (v2): `ai/pufferlib/writeup-v2.md`
- V3 planning notes (imitation warm-start): `ai/pufferlib/writeup-v3-notes.md`
- 4-part blog + engineering roadmap: `docs/plans/2026-02-14-puffer-4-part-roadmap.md`
