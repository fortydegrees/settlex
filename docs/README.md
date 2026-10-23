# Documentation

Start with the maintained guides below. Source and colocated tests describe
current behavior; the project record captures significant decisions.

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

## Contributor tools

| Location | Purpose and entry point |
| --- | --- |
| [`scripts/`](../scripts/) | Maintained commands invoked by `package.json`, including `pnpm docs:index` |
| [`.storybook/`](../.storybook/) | Component stories and preview setup for `pnpm storybook` |
| [`.github/workflows/`](../.github/workflows/) | Repository checks and the manually triggered production deployment |

Personal agent settings and optional design-converter configuration are local
preferences, ignored by Git and not required to build or contribute to the game.

## Operations and historical material

`deploy/` contains operational runbooks; production actions require their own
authorization and current release checks. Dated implementation plans, early
working notes, design experiments and research drafts are preserved privately
by the maintainer rather than presented as contributor instructions.

## Project record and inventory

Use [the concise project record](agent/PROJECT_RECORD.md) for maintained decisions,
[verification and limits](VERIFICATION.md) for recorded checks, and
[source and asset provenance](provenance/assets.md) for unresolved origins.
Detailed internal management, audit and research originals remain privately
preserved; they are not contributor prerequisites.

[INDEX.md](INDEX.md) is generated from Markdown actually retained in this tree,
and is a navigation aid. Regenerate
it with `pnpm docs:index` after adding or renaming documentation.

## Configuration naming

Current configuration uses `SETTLEHEX_*` and `NEXT_PUBLIC_SETTLEHEX_*` names. Existing `SETTLEX_*` settings are read only when the corresponding canonical name is absent. An explicit canonical empty value or `0` wins; it does not fall back to an enabled old value. Next public settings are resolved at build time. Shell deployment entrypoints and Compose preserve the same precedence. Real deployment paths and remote URLs are unchanged.
