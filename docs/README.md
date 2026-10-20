# Documentation

Start with the maintained guides below. Historical plans and internal working
records have separate roles; a file's presence in this tree does not make it a
current contract or part of the intended public candidate.

## Maintained guides

| Need | Guide |
| --- | --- |
| Run the game locally and locate source owners | [Repository README](../README.md) |
| Choose a contribution and its checks | [Contributing](../CONTRIBUTING.md) and [testing policy](agent/TESTING.md) |
| Trace rules, game registration, service and presentation | [Architecture and source reading path](architecture/overview.md) |
| Change board art, themes or audio | [Customization](customization/themes-and-sounds.md) |
| Read/export experimental game records | [Notation guide](notation/README.md) and [format reference](notation/FORMAT.md) |
| Find the current UI kit and its verification surfaces | [UI context](agent/UI_CONTEXT.md) and [UI catalog](agent/UI_CATALOG.md) |
| Report a security issue | [Security reporting](../SECURITY.md) |
| Check source attribution and unresolved rights | [Third-party notices](../THIRD_PARTY_NOTICES.md) and [license texts](../LICENSES/) |

Notation remains experimental. Its guide describes the maintained HAN prototype
and additive archive sidecar; ongoing design discussion does not change that
contract. Use the architecture guide for today's source paths.

## Tool owners

| Location | Purpose and entry point |
| --- | --- |
| [`scripts/`](../scripts/) | Maintained commands invoked by root `package.json`, including `pnpm docs:index` |
| [`.agents/skills/`](../.agents/skills/) | Native project skills routed by [AGENTS.md](../AGENTS.md) |
| [`.codex/hooks.json`](../.codex/hooks.json) | Release prompt/command hook; implementation imports the release status helper |
| [`.storybook/`](../.storybook/) | `pnpm storybook` configuration, source stories and shared preview setup |
| [`.design-sync/NOTES.md`](../.design-sync/NOTES.md) | Optional design converter bridge and its limitations; root package types and bridge config reference this directory |

The retained `.factory/` tree contains legacy vendored agent skills rather than
the current native discovery route. `.claude/launch.json` contains machine-local
preview launches, including stale absolute paths; it is not portable setup
guidance and already has a proposed public-candidate exclusion. Neither directory
was relocated or used as an authority for this batch.

## Historical material

[Early development notes](history/early-development/README.md) preserve the
original backlog, board design questions and animation writing draft. Their
wording and external references are retained as historical evidence, not release
commitments or maintained instructions.

`plans/`, `superpowers/`, `future_plans/`, `bugs/` and older point-in-time documents
record proposals, investigations and previous decisions. Check each document's
status against the maintained source and guides before following it. `deploy/`
contains operational runbooks; production actions have their own authorization
and current release checks.

## Internal records and full inventory

`agent/PROGRESS.md`, `agent/NOTES.md`, `agent/public-readiness/` and
private research archives contain management, audit or research evidence. They are not the
contributor starting path. Public-candidate curation is a separate process; this
organisation pass neither publishes these records nor changes its exclusions.

[INDEX.md](INDEX.md) is a generated catalogue of Markdown headings throughout
this local documentation tree, including historical and internal records. It is
not a list of current guides. Regenerate it with `pnpm docs:index` after adding or
renaming documentation.
