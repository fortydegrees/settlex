# Selecting the Play vs Bot model

A compatible checkpoint upgrade changes the model store, not app source. The store contains `models/007/model.ctnn`, `models/008/model.ctnn`, `current.json` and `previous.json`. Current selection records checkpoint/name, expected SHA-256, supported observation/action contract and relative model path. Models are external to Git and images.

The web server uses the selected name for new matches. The game server passes the selected model path/hash to the native worker; worker startup verifies bytes, format and embedded probe, and the client pins identity across decisions and restarts. Neither server hot-reloads selection; restart both after switching. Existing match labels are historical snapshots; an active match may resume with the new policy after restart, as with an app release.

## Local

From this checkout, build the native worker once (again only when runtime code changes):

```sh
cargo build --release --locked --manifest-path native/settlegraph-v2/Cargo.toml
pnpm bot:promote -- --model /absolute/promoted-model.ctnn --checkpoint 008 --sha256 EXPECTED_SHA256
pnpm bot:check
```

The default store is `.local/bot`, ignored by Git and Docker builds. Set `SETTLEX_BOT_MODEL_MANIFEST=/absolute/store/current.json` for another store. Both local server processes must use the same selection and these flags:

```sh
export SETTLEX_SETTLEGRAPH_V2_ENABLED=1
export NEXT_PUBLIC_SETTLEX_SETTLEGRAPH_V2=1
pnpm serve  # game server; run pnpm dev in another shell with the same flags
```

After a selection change restart game/web. Roll back with `pnpm bot:promote -- --rollback`, then restart both. An installed model can also be selected again with its original model path/checkpoint/hash. A checkpoint directory cannot be overwritten with different bytes. Failed validation leaves current.json unchanged; unused candidate bytes may remain in their version directory. A per-store lock prevents simultaneous CLI installations; after a killed installer, verify no installer is running before removing its stale `.promotion-lock` directory.

If no local/external selection exists, `release/bot-model.json` provides bootstrap metadata. The old `SETTLEX_SETTLEGRAPH_V2_MODEL` override applies only to that bootstrap. An explicitly configured missing manifest fails startup; it never silently selects a fallback. An external current.json takes precedence over the checked-in release metadata.

## Production: routine model upgrade

After this infrastructure is deployed once, both web and game mount `/srv/settlex-models` read-only at `/opt/settlex/models` and read `/opt/settlex/models/current.json`. Set `SETTLEX_BOT_MODELS_DIR` for a different host store. Future compatible weight changes do not rebuild images or change the public release counter.

Upload the approved model to a new staging path on the server. From `/srv/settlex`, with explicit deployment authority:

```sh
bash infra/scripts/promote-bot.sh /absolute/staged-model.ctnn 008 EXPECTED_SHA256
```

The script verifies the existing selection, stops web/game, installs and checks the candidate using the existing game image, atomically changes the selection, and restarts both services without builds. Ordinary mounts stay read-only; only the isolated installer receives write access. If activated-model validation fails, it verifies/restores previous.json and restarts the old selection. The original failure is still reported. Keep the staging model available until activation finishes.

To roll back explicitly, run the same script with the retained prior model file, prior checkpoint and prior expected hash. Serialise production activations; do not run two activation scripts together. After success verify native preflight, the displayed opponent and actual Play vs Bot setup/main-turn behavior. Compatible here means the existing direct CTNN-v2/v3 runtime, topology and 299-action contract; architecture/observation/protocol changes still need a code release.

## First adoption

This code is prepared locally; production remains on its previous release until approved deployment. First build the new game/web images using the standard release workflow. Before replacing existing containers, initialise the external store with the exact currently live 007 model using the new game image:

```sh
docker compose --env-file .env.prod -f infra/docker-compose.prod.yml run --rm --no-deps \
  --volume /srv/settlex-models:/opt/settlex/models:rw game node scripts/bots/promote.mjs \
  --directory /opt/settlex/models --model /opt/settlex/models/incumbent-007/model.ctnn \
  --checkpoint 007 --sha256 88ef6db4c7cf1958774e8e0bcbda0eeb49ac683f50b960bd2cdb67a381e2df79
```

Use the actual host directory if customised. The old 007 mount is preserved. Deploy the new infrastructure with explicit approval, verify it still serves 007, then use the routine activation command to select 008. Use the thorough release lane for this initial Docker/deploy change. No production action is implied by these instructions.

The approved 008 SHA-256 is `d3896b710bd8d90ad98838ca89aa298800039c73efaff0fbb5a2435ac21f7e35`. Historical sealed-loader hashes remain for direct legacy callers and archived tests; current product selections use the supplied hash, so new compatible checkpoints need no whitelist edits.
