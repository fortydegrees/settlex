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
the current native discovery route. Machine-local `.claude/launch.json` preview
launches are omitted from this tree; they are not portable setup prerequisites.

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

## Project record and inventory

Use [the concise project record](agent/PROJECT_RECORD.md) for maintained decisions,
[verification and limits](VERIFICATION.md) for recorded checks, and
[source and asset provenance](provenance/assets.md) for unresolved origins.
Detailed internal management, audit and research originals remain privately
preserved; they are not contributor prerequisites.

[INDEX.md](INDEX.md) is generated from Markdown actually retained in this tree,
including historical records. It is not a list of current contracts. Regenerate
it with `pnpm docs:index` after adding or renaming documentation.
