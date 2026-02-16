# Settlex + PufferLib V3 Notes (Imitation Warm-Start)

Date: 2026-02-14  
Status: planning notes + open questions captured from live discussion

## Purpose

Preserve the "what next" decisions after v1/v2 while writing the v1 post.  
This doc is intentionally a working notebook for v3 planning.

## Proposed V3 Theme

V3 should focus on sample efficiency via imitation/warm-start:

1. Pretrain policy with demonstrations (behavior cloning).
2. Fine-tune with PPO self-play from the pretrained weights.
3. Keep the same evaluation harness used in v1/v2 for apples-to-apples curves.

Why this fits now:
- v2 already improved representation/policy.
- Imitation likely gives larger quality-per-step gains than pure throughput tuning alone.
- It directly targets early-game failures (especially opening placements) that dominate 1v1 outcomes.

## Key Questions We Wanted To Preserve

1. Should imitation-learning be introduced after v4, or earlier?
2. How many games are needed for useful seeding data?
3. Is "opening-only" data (placements/roads) better ROI than full-game data at first?
4. Should we curriculum training by starting from strong opening states?
5. How do we avoid data leakage with hidden information in demos?

## Current Working Answers (Tentative)

1. Timing:
- Engineering sequence: place imitation as v3 (before throughput-heavy v4 work).
- Blog numbering can still be adjusted for narrative, but technical order should be v3.

2. Data scale:
- Opening-only labels: roughly 8 actions per 1v1 game (both players across 2 settlement+road placements each).
- Full-game labels: roughly 150-250 actions per 1v1 game (very approximate).

3. Recommended starting targets:
- Quick opening lift: 8k-20k opening labels (~1k-2.5k games).
- Solid opening prior: 30k-60k opening labels (~4k-8k games).
- Full BC warm start: 100k-300k actions (~500-1500 full games).

4. ROI priority:
- Start with opening imitation first (settlement + road in placement phase).
- Then add broader action data and PPO fine-tuning.
- Optional curriculum: sample more episodes from post-placement states to avoid wasting compute on doomed openings.

## V3 Candidate Training Recipe

1. Data collection:
- Store `(observation, action_mask, action, mode, actor_id, seed, ruleset_id)` for demo decisions.
- Prefer strong sources: search teacher or high-level player games.

2. BC pretrain:
- Masked cross-entropy on legal actions.
- Train on placement-only first (phase filter), then optionally all phases.

3. PPO fine-tune:
- Initialize from BC weights.
- Self-play with current env/ruleset settings.
- Optional mixed loss during early PPO: `L = L_PPO + lambda * L_BC` with decaying `lambda`.

4. Evaluation:
- Fixed-seed, fixed-opponent eval curves using `eval_curve.py`.
- Report both sample-efficiency and final strength.

## Metrics To Collect For V3 Post

Core:
1. Win rate vs checkpoint update (`win_rate_mean`, CI band).
2. Time-to-threshold (e.g., updates or wall-clock to 55%/60% vs baseline opponent).
3. Truncation/no-winner rates.
4. Mean episode steps.

Comparison groups:
1. PPO from scratch (v2 baseline).
2. BC init + PPO.
3. Opening-only BC init + PPO (ablation).

## Risks / Failure Modes

1. Teacher bias lock-in:
- Low-quality demos can cap policy quality.

2. Leakage:
- Demo extraction must only include actor-visible features.

3. Distribution shift:
- BC on only "good positions" can underperform when off-distribution.

4. Overfitting openings:
- Need full-game PPO fine-tuning to recover tactical depth.

## Open Questions To Resolve Before Implementation

1. Demo source:
- Human-only, search-only, or hybrid?

2. Labeling granularity:
- Action-only labels, or add value/advantage-style targets?

3. Curriculum schedule:
- How much weight to placement-only pretrain before full-game PPO?

4. Evaluation benchmark:
- Keep random opponents only, or add fixed heuristic/search opponents for stronger signal?

## Suggested Next Action (After V1 Writing Sprint)

Design a minimal V3 experiment matrix:
1. Dataset sizes: small / medium / large.
2. One fixed PPO budget per run.
3. One evaluation protocol reused across all runs.
4. Produce side-by-side curves and "time-to-X win rate" table.
