# Puffer Bot Series Roadmap (Blog + Engineering)

Date: 2026-02-14
Owner: Settlex solo dev workflow

## Objective

Run two parallel tracks without losing context:

1. Blog track: publish a multi-part series that is evidence-based (not just implementation notes).
2. Engineering track: evolve the training system from "works locally" to "strong + efficient + scalable."

The two tracks stay aligned by using one shared experiment log and one shared metrics pipeline.

## Narrative Rule (Important)

Each post should improve one primary axis and report at least one metric:
- reliability (fewer failures/illegal moves/schema mismatches),
- strength (win rate / Elo / solved tactical tests),
- sample efficiency (time/updates to threshold),
- throughput (SPS / env-step cost),
- cost efficiency ($ or wall-clock to target strength).

Not every post must show immediate win-rate gains. A post can still be successful if it clearly improves reliability, observability, or training speed.

## Track A: Blog Series Plan

### Part 1: Working Baseline (End-to-End, Reliable)

Focus:
- Existing Settlex engine -> PufferLib training -> playable bot in live game.
- Treat this as a baseline that is already stable enough to run, not a "known broken prototype."
- Do not force a "plateau" claim in this post unless data actually supports it.

Required evidence:
- Win-rate curve vs checkpoint update.
- Seed variance band (mean/std across seeds).
- Throughput snapshot (SPS and run config).
- Illegal-action rate and one quick live-play sanity check.
- At least one qualitative behavior example showing why representation still needs work (e.g., weak placement intuition).

Inputs:
- `ai/pufferlib/writeup.md`
- run artifacts under `ai/pufferlib/runs-1v1*`
- `eval_curve.csv` generated with `python -m settlex_puffer.eval_curve`

### Part 2: Representation Upgrade (State + Policy)

Focus:
- Board-layout features and factorized/relational policy.
- Clarify which information is explicit in observation vs implicit memory/inference.

Required evidence:
- Before/after curve on same evaluation settings.
- SPS/compute tradeoff (if strength is flat, show representational quality and expected upside).
- Ablation table: masked-MLP vs factorized-relational.

Inputs:
- `ai/pufferlib/writeup-v2.md`
- comparison curves (masked MLP vs factorized relational)

### Part 3: Evaluation Discipline (Make Progress Measurable)

Focus:
- Fixed eval suite, checkpoint selection discipline, and confidence-aware reporting.
- Prevent "latest checkpoint bias" and self-play-only false positives.

Required evidence:
- Best-vs-latest checkpoint example from one run.
- Variance across seeds/opponents.
- A compact "promotion gate" for candidate models.

### Part 4: Reward Design + Episode Control

Focus:
- Reward shaping refinements and timeout/truncation strategy.
- Keep terminal objective dominant while improving credit assignment.

Required evidence:
- Truncation/no-winner rate before/after.
- Learning-speed delta (updates/wall-clock to threshold).
- Ablation table for reward terms (added one-by-one).

### Part 5: Imitation Warm-Start (Sample Efficiency)

Focus:
- Seed policy learning with demonstrations, then fine-tune with PPO.

Required evidence:
- From-scratch PPO vs BC-init PPO on identical settings.
- Time-to-threshold comparison.
- Opening-only demos vs full-game demos.

### Part 6: Search-Augmented Inference

Focus:
- Add search at inference time (policy/value-guided) for stronger online play.

Required evidence:
- Same checkpoint with and without search.
- Strength gain vs latency budget curve.
- Practical serving budget recommendation.

### Part 7: Local Throughput Optimization (Laptop)

Focus:
- Improve SPS and iteration speed on local hardware without changing game semantics.

Required evidence:
- Before/after SPS and wall-clock.
- Env/forward/train time split.
- Quality parity check (same recipe, no regression).

### Part 8: Cloud Scaling (GPU + PufferTank Path)

Focus:
- Move to cloud-scale actor/learner setup and measure true cost-to-quality.

Required evidence:
- Throughput scaling table by instance class.
- Cost-to-threshold curve.
- Decision guide for when GPU meaningfully helps.

### Part 9: Native Simulator Decision (Rust or Not)

Focus:
- Profile-driven decision on native in-process simulator/shared core.
- Conformance-first migration strategy if pursued.

Required evidence:
- Bottleneck profile showing why migration is warranted.
- Conformance test checklist against current authoritative rules.
- Estimated payoff vs maintenance cost.

## Narrative Handoff (Open -> Close)

### Part 1
- Opening problem: Can we train and serve a playable 1v1 bot from the existing engine without rewriting core gameplay?
- Closing lead-in: Baseline works and can beat weak baselines, but observed play quality (especially placement intuition) shows representation limits, so we need stronger state representation and policy structure.

### Part 2
- Opening problem: The baseline policy lacks enough structure to reason about board topology and long-term value.
- Closing lead-in: Representation is better, but we still need stricter evaluation discipline before trusting progress claims.

### Part 3
- Opening problem: "Latest checkpoint looked better" is not reliable; we need fixed, repeatable promotion gates.
- Closing lead-in: With measurement stabilized, we can safely tune reward and episode dynamics for better credit assignment.

### Part 4
- Opening problem: Catan has long horizons and many truncated games, so sparse/weak credit signals waste compute.
- Closing lead-in: Better reward shaping helps, but from-scratch PPO still learns slowly, motivating imitation warm-start.

### Part 5
- Opening problem: Can demonstrations reduce time-to-competence versus pure self-play from random initialization?
- Closing lead-in: Warm-start improves policy quality, and the next gain should come from search at inference time.

### Part 6
- Opening problem: Can lightweight search lift move quality over policy-only play under realistic latency budgets?
- Closing lead-in: Search improves strength, but now serving latency and compute efficiency become the bottleneck.

### Part 7
- Opening problem: Local iteration speed is too slow; we need higher SPS and shorter train-eval loops on laptop hardware.
- Closing lead-in: Local tuning helps, but larger-scale experiments require cloud throughput and cost controls.

### Part 8
- Opening problem: What is the best cost-to-strength path on cloud hardware (including GPU pipelines)?
- Closing lead-in: Once scaling data is measured, we can decide whether a native simulator rewrite is justified.

### Part 9
- Opening problem: Would a native simulator/shared core materially improve throughput enough to justify complexity?
- Closing lead-in: Final architecture decision and concrete roadmap to the next strength tier.

## Track B: Engineering Roadmap

### Stage 0: Measurement Baseline

Deliverables:
- Checkpoint evaluation-to-CSV pipeline (`eval_curve.py`).
- Plotting utility (`plot_curve.py`).
- Standard evaluation settings (episodes, seeds, opponent policy, ruleset).

Exit criteria:
- One command produces a curve for any run directory.
- Curves are reproducible across reruns.

### Stage 1: Reliability + Representation

Deliverables:
- Maintain ruleset/mask/schema correctness.
- Continue representation/policy upgrades.
- Add fixed-baseline evaluation to avoid self-play blind spots.

Exit criteria:
- Candidate selection uses fixed gates, not "latest looks better."

### Stage 2: Learning Efficiency

Deliverables:
- Reward/truncation ablations.
- Imitation warm-start experiments.
- Search-assisted inference experiments.

Exit criteria:
- Faster time-to-threshold with no quality regression.

### Stage 3: Throughput and Scale (No Core Rewrite Yet)

Deliverables:
- Local SPS optimization.
- Cloud/GPU scaling experiments.

Exit criteria:
- Material wall-clock and cost improvements to target strength.

### Stage 4: Native Core Decision Point

Decision:
- Keep current architecture with incremental optimizations, or
- move to a shared native core (Rust library for training + server adapters).

Required before decision:
- Profiling evidence showing true bottleneck.
- Conformance test plan against current engine behavior.

## Shared Data Collection Standard

For every run used in blog claims, log:
- Run id and commit hash.
- Policy architecture and key hyperparameters.
- Ruleset and board config.
- Total timesteps and wall-clock.
- Eval settings (episodes, seeds, stochastic/deterministic).
- Curve CSV path and generated plot path.
- Primary metric targeted by the experiment (strength, reliability, SPS, cost, etc.).

Recommended artifact layout:
- `ai/pufferlib/runs-*/<run_id>/eval_curve.csv`
- `ai/pufferlib/plots/<slug>.png`
- Optional `ai/pufferlib/plots/<slug>.md` with one-paragraph interpretation.

## Operating Cadence

Weekly cycle:
1. Train and evaluate (produce CSV/plots).
2. Summarize findings in one short note.
3. Decide one next engineering change.
4. Update corresponding blog draft section with evidence.

This keeps writing and engineering synchronized so documentation does not lag implementation.

## Current Status Snapshot

- Part 1 and Part 2 technical notes already exist:
  - `ai/pufferlib/writeup.md`
  - `ai/pufferlib/writeup-v2.md`
- Imitation-learning planning notes captured in:
  - `ai/pufferlib/writeup-v3-notes.md`
- Eval curve tooling exists in:
  - `ai/pufferlib/python/settlex_puffer/eval_curve.py`
  - `ai/pufferlib/python/settlex_puffer/plot_curve.py`
- Next action: finish Part 1 writing with baseline evidence, then run Part 2 representation ablations on the same eval protocol.
