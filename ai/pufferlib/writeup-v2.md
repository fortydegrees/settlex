# Settlex + PufferLib Bot, V2: Board-Aware Features, Relational Policy, and Search

_Date: 2026-02-11_

This is a follow-up to the baseline “Puffer bot for Settlex” writeup (`ai/pufferlib/writeup.md`). It focuses on what we changed, why v1 wasn’t enough for a strong 1v1 bot, what broke along the way, and the main learnings.

## TL;DR

V1 got us a playable RL bot quickly, but it had predictable limits:
- the observation under-modeled the board (weak placement intuition)
- a flat masked-MLP struggled to learn strong spatial priors efficiently
- serving was fragile to schema drift (checkpoint shape mismatch) and stage/rules mismatches
- inference was greedy (myopic) and made tactical mistakes that a small amount of search can fix

V2 improvements:
1. **Observation schema v2**: explicit tile/node/edge board layout features + schema hashes.
2. **Factorized relational policy**: tokenized encoder (global/tile/node/edge) + light attention + factorized action scoring.
3. **Optional inference-time search**: budgeted expectimax-style lookahead using policy logits/value to pick better actions without retraining.

## What We Shipped In V1 (Baseline)

V1’s goal was “get something trainable and playable without touching the engine”.

Key decisions:
- **Fixed Discrete(N) action space + action mask** in the JS env (`ai/pufferlib/js/settlexEnv.cjs`).
- **Deterministic JS env** on top of `game-core` (seeded board/deck and deterministic stepping).
- **Python training** via PufferLib, talking to Node through a JSONL stdio bridge (`ai/pufferlib/js/engine_host.cjs` + `ai/pufferlib/python/settlex_puffer/bridge.py`).
- **Masked MLP policy** (`ai/pufferlib/python/settlex_puffer/policy.py`) that hard-masks illegal logits.
- **A server adapter** so you can play against the trained policy in the existing UI (`server/bots/*`).

It worked, and it was shippable quickly.

## Why V1 Wasn’t Good Enough (In Practice)

This isn’t “PufferLib wasn’t good”; it’s “our env/schema/model were too weak for the problem”.

### 1) The observation didn’t explicitly describe the board’s value structure

Catan’s placement quality is largely about:
- tile resources (what you can produce),
- token numbers (how often),
- ports (how you can trade),
- and adjacency (a node touches 3 tiles; that neighborhood matters).

In v1, we had some board occupancy (roads/buildings) and some global stats, but we didn’t have an explicit, learnable representation of:
- “this node is a 6/9/wood+sheep+wheat with a 2:1 ore port”
- “this node has high pip-weight and good trade access”

Result: the bot could appear to “place randomly” because it literally didn’t have the features that make placements obviously good/bad.

### 2) A flat masked-MLP has weak inductive bias for a graph game

Even with better features, a single flat MLP is asking a lot:
- you want it to learn “local neighborhoods” and “graph patterns” by brute force
- you want it to generalize across symmetric board positions

It can learn, but it tends to be sample-inefficient (especially on CPU) and brittle.

### 3) Train/serve schema drift was too easy

In v1 it was easy to accidentally:
- change observation size (add features)
- change action space size (add new actions)

Then your previously trained checkpoint won’t load, and you see errors like:
- `size mismatch ... encoder.0.weight ... from checkpoint ... current model is ...`

We handled this by falling back to random legal actions, but that’s not what you want in production.

### 4) Serving bugs mattered more than training bugs

Two real classes of bugs we hit:
- **stage vs core phase mismatch** (boardgame stage says `moveRobber`, core phase says `preRoll`) leading to illegal `rollDice` attempts
- **actor inference mismatch** during placement (turn counter offset) causing “forced:placeSettlement” auto moves that looked like policy actions

These weren’t “the model is bad” problems; they were “the adapter is wrong” problems.

### 5) Greedy inference is myopic

A greedy policy at each step makes tactical mistakes:
- missing a free “obvious” build that sets up next turn
- making a trade/build ordering mistake
- doing something suboptimal under stochastic dice outcomes

Even a shallow search (top-k candidates, depth 1-2, dice expectation for roll actions) can dramatically improve play feel.

## V2: What We Changed

### 1) Observation schema v2: explicit tile/node/edge features

We expanded the JS env observation to include:

**Per land tile**
- resource type one-hot
- roll number one-hot (2,3,4,5,6,8,9,10,11,12)
- pip weight scalar (how often that number hits)
- robber present flag

**Per node**
- port type one-hot (none, 3:1, 2:1 by resource)
- adjacent pip totals by resource (how much “Wood pips” this node produces, etc.)
- total pips scalar
- occupancy: settlement/city one-hots by player

**Per edge**
- unowned flag + owner one-hot by player

Implementation:
- `ai/pufferlib/js/settlexEnv.cjs`

Schema contract metadata:
- `observationLayout` (offsets/counts/features per group)
- `observationSchemaHash`
- `actionSpaceHash`

Why we added hashes:
- the *hard* bug class is “training and serving silently disagree about shapes/labels”
- hashes let serving *refuse* to run the wrong checkpoint instead of “sort-of working”

Propagation into serving:
- `server/bots/pufferStateAdapter.js` now hydrates the env’s static feature caches and forwards spec metadata to inference.

### 2) Factorized relational policy: tokenization + light attention + factorized logits

New policy:
- `ai/pufferlib/python/settlex_puffer/policy_factorized.py`

High-level idea:
- treat the observation as **structured tokens**:
  - one “global” token
  - N tile tokens
  - M node tokens
  - K edge tokens
- run a small **attention stack** over all tokens
- produce:
  - a scalar value estimate from global context
  - action logits by **factorization** instead of an independent logit per action id

Factorized scoring (conceptually):
- every action has a type (roll, buildRoad, placeSettlement, ...)
- some actions also choose an entity:
  - an edge id (buildRoad)
  - a node id (placeSettlement, buildCity)
  - a tile id (moveRobber)
  - a resource (monopoly)
  - a year-of-plenty pair
  - a trade mapping

So we compute logits as:
- `logit(action) = logit(type) + logit(entity)` (plus other factor heads when relevant)

Why this helps:
- actions that share structure share parameters
- you avoid relearning “node desirability” separately for “placeSettlement at node X” and “buildCity at node X”
- you give the policy a natural way to generalize across repeated action patterns

Train/eval/infer wiring:
- Train defaults to factorized policy:
  - `ai/pufferlib/python/settlex_puffer/train.py`
- Eval can auto-detect checkpoint architecture:
  - `ai/pufferlib/python/settlex_puffer/evaluate.py`
- Inference worker loads either arch:
  - `ai/pufferlib/python/settlex_puffer/infer_server.py`

Important bug we hit and fixed:
- Our factor parsing originally could mis-index node factors because node actions exist in two namespaces (`placeSettlement:*` and `buildCity:*`).
- Fix: dedupe node ids in factor vocab and add regression tests:
  - `ai/pufferlib/python/tests/test_policy_factorized.py`

### 3) Optional inference-time search (expectimax-style)

New module:
- `server/bots/pufferSearch.js`

Policy worker upgrades:
- `infer_server.py` now supports:
  - `mode=score_actions` -> masked logits + value
  - `mode=eval_batch` -> value-only batched scoring

Node client upgrades:
- `server/bots/PufferPolicyClient.js` now exposes:
  - `scoreActions(...)`
  - `evalBatch(...)`

Bot manager wiring:
- `server/bots/pufferBotManager.js` can call search when enabled.

Search strategy (high level):
- score current state once
- take top-k legal actions by policy logits
- expand those actions to depth `d` (default 2)
- if an action is a dice roll, take expectation over dice outcomes
- evaluate leaf nodes via the policy value head (no full rollout)
- return best action within a time budget

Enable via env vars:
- `SETTLEX_PUFFER_SEARCH=expectimax`
- `SETTLEX_PUFFER_SEARCH_BUDGET_MS=250`
- `SETTLEX_PUFFER_SEARCH_TOPK=12`
- `SETTLEX_PUFFER_SEARCH_MAX_DEPTH=2`

Tradeoffs:
- better play quality
- higher per-move latency and CPU cost
- we keep it off by default and budget-bounded

## Key Learnings

### The env/schema dominates performance

V1’s biggest limitation wasn’t PPO or PufferLib; it was:
- “we didn’t show the policy the board information humans use”
- “we didn’t give the policy a structure that matches the game”

If you want a great 1v1 bot, don’t start by tuning PPO hyperparams; start by making the observation/action representation sane.

### Train/serve parity needs to be a first-class contract

The most expensive bugs were:
- training works fine
- serving “mostly works” but is subtly wrong

Hashes + spec propagation are cheap and prevent a whole category of failure.

### Serving is its own system, not a thin wrapper

The adapter is the boundary between:
- boardgame.io match state
- core engine state
- RL env canonical schema

Getting mode/stage/actor alignment right matters as much as model quality.

### Search is a practical “quality lever”

If you can’t afford massive training throughput, search is one of the best levers:
- it improves tactical quality immediately
- it’s optional (can be enabled only for stronger bot tiers)
- it doesn’t require changing the environment distribution

## Practical Guidance: When You Must Retrain

You must retrain if you change:
- action space size or labels (new actions, different offsets)
- base observation size (new features, different layout)
- ruleset semantics (duel vs standard, friendly robber, discard rules)

You might not need retrain if you only change:
- inference-time search settings
- server move delays

## What We’d Do Next (If “World-Class 1v1” Is the Goal)

V2 is “stronger baseline”. “World-class” is usually more about training regime than model code:
- league training (play vs older snapshots, not mirror self-play only)
- evaluation infrastructure (Elo on fixed seeds, seat balancing, deterministic matchups)
- much more experience (environment throughput)

If you want, the next follow-up post should be: “Checkpoint league + Elo gating for Settlex bots”.

