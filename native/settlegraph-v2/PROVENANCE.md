# SettleGraph V2 Native Runtime Provenance

This directory is the product-integration runtime for the sealed SettleGraph V2 bot.

## Pinned source

- Repository: `/Users/david/Documents/ChatGPT/settlex-ai/.worktrees/search-expert-iteration-v1`
- Commit: `a1fdc96a008a6f0e0b6bd23df8c4cf869da051ec`
- Imported read-only on: 2026-08-25

The following files are mechanical copies from that commit:

- `vendor/catan-core/Cargo.toml`
- every file under `vendor/catan-core/src/`
- `vendor/catan-env-contract/src/codec.rs`
- `vendor/catan-env-contract/src/obs.rs`
- `vendor/catan-env-contract/src/obs_v2.rs`
- `vendor/catan-env-contract/src/settlegraph_contract.rs`
- `vendor/catan-env-contract/src/settlegraph_net.rs`

`vendor/catan-env-contract/Cargo.toml` and `src/lib.rs` are product-owned wrappers that expose only the imported modules needed for inference. Product-specific snapshot translation and the NDJSON protocol live outside `vendor/`.

## Sealed runtime contract

- Model kind: SettleGraph / CTNN-v2
- Observation version/dimension: 2 / 1,445
- Action codec version/count: 1 / 299
- Native contract SHA-256: `a64b9d0daaa3bb6f60f0c0c42bfc52b53ba4a4672263b85d899805323bc97e55`
- Accepted CTNN SHA-256: `072906d17077f1ed3fa4e9254999a8920ec243bdda3ab42575258492b58465c8`
- Candidate model SHA-256: `907e7b344b1a7e783e5e387f037bb01192b7d3034f1b6b1398bf0421d9f693e2`

The accepted CTNN is intentionally not copied into this repository. `load_verified_model` validates its external file hash before the native loader validates the header, contract hash, tensor shapes, and embedded forward probe.
