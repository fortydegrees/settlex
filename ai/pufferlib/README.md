# Settlex + PufferLib

This directory contains a standalone RL training harness that uses the existing Settlex `game-core` engine without modifying engine code.

## Layout

- `js/settlexEnv.cjs`: deterministic self-play environment built on `@settlex/game-core`.
- `js/engine_host.cjs`: JSONL stdio host process for Python.
- `python/settlex_puffer/env.py`: Gymnasium environment wrapper.
- `python/settlex_puffer/policy.py`: masked discrete policy (hard masks illegal logits).
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

This reports win rate for `player-id` controlling one seat, with other seats acting randomly.

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
- On the match lobby page, use **Fill Open Seats With Bots** to mark open seats as Puffer bots (`data.bot = "puffer"`), which the server also detects dynamically.

## Notes

- Observation includes the action mask concatenated to the feature vector.
- Illegal actions are replaced with a sampled legal action and receive a small penalty.
- Model/checkpoint artifacts are written under `ai/pufferlib/runs/` by default.
