# Native runtime provenance and model contract

This product-owned Rust runtime imports source from SettleGraph and translates authoritative Boardgame.io snapshots into native state, observations, legal actions and semantic move plans. Models remain external. This records serving/source identity, not training qualification, strength or redistribution permission.

## Source lineage

The initial import on 25 August 2026 came from SettleGraph source commit `a1fdc96a008a6f0e0b6bd23df8c4cf869da051ec`. It mechanically copied `vendor/catan-core/Cargo.toml`, the core `src/` tree, and the environment codec, base/V2 observations and topology contract. The environment Cargo manifest and `src/lib.rs` are product-owned wrappers; product snapshot translation and NDJSON protocol live outside vendor. Subsequent changes must be assessed against their pinned source revisions, rather than assuming every current file still equals the initial import.

The V3 refresh imported `rust/catan-env/src/obs_v3.rs` and `settlegraph_net.rs` from source commit `2cee77fa789fc4af8665e0be57e199928a7e965c`. Their import-time SHA-256 identities were respectively `581eb971837ea6959022da0e16262677b7e184c1e361e4543d32fceded4b5fcc` and `2e662d81439407fc472e8c67c28a62b35204d6c1c143cafb213a073fdbc34e85`. The later 009 wider inference wrapper/shared FP32 kernel came from source commit `55f4b3663ad980c367c70aa709163160e3dec378`. Normal 64/128/16 and wide 128/256/32 widths are supported.

The original source commits and imported module names remain attributable without exposing a maintainer's private filesystem or study receipts. Vendored code publication/license scope and external-model distribution terms remain unresolved; this file grants no license.

## Serving compatibility

- CTNN-v2 observation version 2: 1,445 floats.
- CTNN-v3 observation version 3: 1,464 floats; V3 appends the 19 canonical tile numbers to the V2 prefix.
- Action codec version 1: 299 actions.
- Native contract SHA-256: `a64b9d0daaa3bb6f60f0c0c42bfc52b53ba4a4672263b85d899805323bc97e55`.
- Direct inference with native legality masking; unsupported modes/fields fail closed.

| Historical serving identity | CTNN SHA-256 |
| --- | --- |
| Original V2 | `072906d17077f1ed3fa4e9254999a8920ec243bdda3ab42575258492b58465c8` |
| 005 | `382a8708312d469efdbb7333891a3469bd204d46d85ec02e218e0c0b377437ca` |
| 006 | `299c23241e1ca32c4b9203206a9b2c17fc7f6246d4adff0f6d3a9ad6404b736b` |
| 007 | `88ef6db4c7cf1958774e8e0bcbda0eeb49ac683f50b960bd2cdb67a381e2df79` |
| 008 | `d3896b710bd8d90ad98838ca89aa298800039c73efaff0fbb5a2435ac21f7e35` |
| 009 (release metadata) | `d87d121a332766667fb65481593472ba937c35386c2cc3478a654127115ecccf` |

The selected manifest supplies the expected hash; the worker verifies model bytes before parsing, then validates the supported header, observation/topology/action contract, tensor shapes and embedded forward probe. Compatible future identities need selection metadata rather than a source whitelist change. Historical sealed-loader entry points remain for existing tools/tests. None of these identities asserts a measured playing-strength result.

Server startup pins selection across native decisions and worker restarts. External selection changes require game/web restarts. See [model installation, activation and rollback](../../docs/agent/BOT_MODELS.md) and the [runtime guide](README.md). Detailed study qualification, model-selection exceptions and historical local deployment receipts are retained privately with original Git identities. They are not prerequisites for understanding or using the product serving contract.
