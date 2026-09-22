# SettleGraph V2/V3 Native Runtime Provenance

This directory is the product-integration runtime for the original sealed
SettleGraph V2 bot and checkpoint 005 direct play.

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

`vendor/catan-env-contract/Cargo.toml` and `src/lib.rs` are product-owned wrappers that expose only the imported modules needed for inference. Product-specific snapshot translation and the NDJSON protocol live outside `vendor/`.

## V3 inference refresh

The following two inference files are mechanical, byte-for-byte copies from
research commit `2cee77fa789fc4af8665e0be57e199928a7e965c` in
`/Users/david/Documents/ChatGPT/settlex-ai`:

- `rust/catan-env/src/obs_v3.rs` to `vendor/catan-env-contract/src/obs_v3.rs`
  (SHA-256 `581eb971837ea6959022da0e16262677b7e184c1e361e4543d32fceded4b5fcc`)
- `rust/catan-env/src/settlegraph_net.rs` to
  `vendor/catan-env-contract/src/settlegraph_net.rs`
  (SHA-256 `2e662d81439407fc472e8c67c28a62b35204d6c1c143cafb213a073fdbc34e85`)

The original vendored core, base observation, V2 encoder, action codec, and
topology contract remain intact. No training, Colonist, or search modules were
imported.

## Sealed runtime contracts

- Original model kind: SettleGraph / CTNN-v2
- Original observation version/dimension: 2 / 1,445
- Original accepted CTNN SHA-256: `072906d17077f1ed3fa4e9254999a8920ec243bdda3ab42575258492b58465c8`
- 005 model kind: SettleGraph / CTNN-v3
- 005 observation version/dimension: 3 / 1,464
- 005 accepted CTNN SHA-256: `382a8708312d469efdbb7333891a3469bd204d46d85ec02e218e0c0b377437ca`
- Action codec version/count: 1 / 299
- Native contract SHA-256: `a64b9d0daaa3bb6f60f0c0c42bfc52b53ba4a4672263b85d899805323bc97e55`
- Candidate model SHA-256: `907e7b344b1a7e783e5e387f037bb01192b7d3034f1b6b1398bf0421d9f693e2`

The accepted CTNN files and 005 reference probes are intentionally not copied
into this repository. `load_verified_model` validates the external file hash,
binds it to the expected observation version, then validates the header,
contract hash, tensor shapes, and embedded forward probe. The website worker is
direct inference only; packaging the external model and worker is handled by the
release layer.
