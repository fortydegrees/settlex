# Settlex Skill Progression System Design

Date: 2026-07-17
Scope: The weekly skill-progression automation, its durable inventory, and the
safe validation and landing of existing repo-local Catana workflow skills.
Status: Written design, pending user review

## Objective

Turn the existing weekly recommendation task into a reliable progression
system for Settlex. It should use local Codex and repo work as its primary
evidence, distinguish recommendations from work that is genuinely landed, and
avoid repeatedly suggesting the same stranded drafts.

The weekly automation remains an analysis task. Skill creation, editing,
validation, and landing happen in a separate, user-approved implementation
flow.

## Decisions

- Keep the existing Friday schedule, `gpt-5.6-sol` model, `xhigh` reasoning,
  and isolated worktree execution.
- Replace the PR-first prompt with a local-first evidence contract.
- Keep weekly runs analysis-only: they may update automation memory, but they
  do not edit, commit, merge, or land repo files.
- Track a skill's integration state separately from its confidence state.
- Prefer recovering, consolidating, or deepening an existing skill over
  creating another narrow skill.
- Run wider six-month audits manually when requested or when the roadmap has
  materially changed; do not rescan six months every Friday.
- Defer a deterministic duel-agent/evaluation skill while that program is
  actively changing. Reconsider it only after its boundaries and evidence loop
  stabilize.

## Evidence Contract

Each weekly run reads evidence in this order:

1. `/Users/david/.codex/automations/skill-progression-map/memory.md`.
2. The active Settlex checkout plus every local Settlex branch and worktree,
   including uncommitted state as read-only evidence.
3. `docs/agent/PROGRESS.md`, `docs/agent/NOTES.md`, recent relevant specs and
   plans, and the current `.agents/skills/` inventory.
4. Local Codex task history, rollout summaries, and durable memory when
   accessible.
5. GitHub PR and review data only when it is available. Its absence is not a
   blocker and should not consume most of the run.

The weekly window is the period since the previous successful run, with up to
eight weeks of context for detecting repetition. A manual wide pass uses the
previous six months and says exactly which sources and branches it inspected.

## Inventory Model

Every run emits an inventory with two independent state fields:

| Field | Values | Meaning |
| --- | --- | --- |
| Integration | `candidate`, `draft`, `landed`, `retired` | Whether the skill is only an idea, exists only as uncommitted/sibling/feature-branch work, is committed and routed on `main`, or is no longer used. |
| Confidence | `unvalidated`, `validated`, `needs-refresh`, `deferred` | Whether behavior has been tested, evidence has drifted, or the underlying work is still too fluid to extract. |

The inventory also records the exact path, last meaningful evidence date, and
one recommended action: `recover`, `validate`, `deepen`, `create`, `defer`, or
`retire`.

`landed` is an integration claim, not a synonym for `validated`. A run must not
say `landed`, `upstreamed`, or equivalent unless it has verified the skill in
`main` and can name the checkout and git state that prove it.

## Weekly Output Contract

The automation returns five compact sections:

1. **Evidence boundary** — window, checkouts/worktrees, docs, local task
   history, and whether GitHub evidence was available.
2. **Skill inventory** — integration and confidence states, exact locations,
   and last evidence dates.
3. **What changed** — new recurring patterns or evidence that altered an
   existing ranking.
4. **Ranked actions** — at most three concrete actions, favouring recovery and
   consolidation before creation.
5. **Integration truth** — exact statement of whether any referenced files are
   only ideas, uncommitted drafts, committed branch work, or active-repo files.

The run appends a timestamped memory entry containing the evidence boundary,
inventory changes, deferred items, and next action. If automation memory is
missing or inconsistent with prior tasks, it reconstructs the boundary from
task history and reports the gap rather than silently treating the run as
fresh.

## Proposed Automation Prompt

```text
Review Settlex skill progression using local evidence first.

Read the automation memory, then inspect the active checkout and every local
Settlex branch/worktree as read-only evidence. Use docs/agent/PROGRESS.md,
docs/agent/NOTES.md, relevant recent specs/plans, the current skill inventory,
and local Codex task/rollout history. Use GitHub PR/review evidence only when it
is available; its absence is not a blocker.

For a weekly run, analyze changes since the previous successful run with up to
eight weeks of context. Report:
1. evidence boundary;
2. skill inventory with separate integration and confidence states;
3. what materially changed;
4. at most three ranked actions; and
5. integration truth for every referenced draft.

Prefer recovering, validating, consolidating, or deepening existing skills over
creating narrow new ones. Defer work that is still actively changing. Do not
edit, create, commit, merge, or call repo files upstreamed/landed. Update only
the automation memory with a timestamped evidence and inventory summary.
```

## Existing Skill Landing Program

The first landing program covers only these existing drafts:

1. `catana-dev-surfaces`
2. `catana-game-feel-effects`
3. `catana-mobile-game-ux`
4. `catana-match-lifecycle`

The first three are recovered from the older sibling-worktree drafts. The
match-lifecycle draft is reconciled from the newer automation worktree.

Process one skill at a time:

1. Identify concrete historical tasks that should trigger it and the failure
   or wasted rediscovery it is meant to prevent.
2. Run a fresh-context behavioural evaluation when that evaluation mechanism is
   available and authorised. Otherwise, wait for the next real matching task,
   review how the draft performs there, and keep confidence `unvalidated` in
   the meantime. Current-author self-review, static frontmatter, whitespace,
   and link checks do not by themselves advance confidence to `validated`.
3. Make the smallest wording or routing changes needed by the validation.
4. Run static skill validation and reference checks.
5. Add the skill to `main` and route it from `AGENTS.md` only after its
   evidence and validation status are recorded honestly.
6. Update `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md` with the final
   location, validation evidence, and remaining caveats.

Implementation uses an isolated clean worktree or similarly clean integration
surface. It must not copy whole versions of `AGENTS.md`, `PROGRESS.md`, or
`NOTES.md` from an older worktree over current repo changes; only focused
patches are allowed.

## Consolidation Boundaries

- Replay, archived-match, spectator, credential, and canonical-route safety
  belong in `catana-match-lifecycle`; do not create a separate replay-safety
  skill now.
- Render/listener/frame evidence and browser verification belong in
  `catana-dev-surfaces`; do not create a separate runtime-performance skill
  now.
- Release/build lessons extend `settlex-release`; do not create another release
  skill.
- A Catana 3D board-pipeline router remains a later candidate after the current
  renderer and asset work stabilizes. It should route repo boundaries and reuse
  the existing Blender and browser-3D skills rather than duplicate them.
- The deterministic duel-agent/evaluation skill is explicitly deferred until
  the active program stabilizes.

## Failure Handling

- If GitHub data is unavailable, say so once and continue with local evidence.
- If a worktree is dirty, inspect it read-only and never use it as a silent
  integration target.
- If two drafts disagree, diff them and choose from evidence; do not assume the
  newest timestamp is correct.
- If memory says a skill exists but `main` does not contain it, mark it `draft`,
  name the exact location, and recommend recovery rather than creation.
- If validation cannot be performed, keep confidence `unvalidated` and do not
  overstate readiness.

## Verification

After the automation prompt is updated:

- view the automation and confirm its name, Friday schedule, worktree
  environment, `gpt-5.6-sol`, `xhigh`, and complete prompt;
- confirm the weekly output contract is represented in the stored prompt;
- preserve existing automation memory and append future entries rather than
  replacing prior history.

For each landed skill:

- record the behavioural validation and its result;
- validate frontmatter and skill naming;
- run reference and whitespace checks;
- confirm `main` contains the file and `AGENTS.md` route;
- use `git diff --check`; and
- confirm the commit contains only the intended skill and focused routing/docs
  changes.

## Acceptance Criteria

- Weekly runs are local-first and no longer depend on accessible GitHub PRs.
- Every recommendation distinguishes exact location, integration state, and
  confidence state.
- Detached or sibling-worktree drafts cannot be described as upstreamed.
- Automation memory remains cumulative and records deferred work.
- Existing workflow skills are validated and landed one at a time without
  overwriting unrelated dirty-tree changes.
- Replay and performance guidance are consolidated into existing skills.
- Duel-agent skill extraction remains deferred until explicitly resumed.
- No production deploy, game behavior, or in-progress duel-agent code changes
  are part of this work.
