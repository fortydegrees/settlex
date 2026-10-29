# Selecting the Play vs Bot model

Current release metadata selects SettleGraph 009, SHA-256 `d87d121a332766667fb65481593472ba937c35386c2cc3478a654127115ecccf`, with V3 observations and direct legal-greedy play. The native runtime supports normal 64/128/16 and wide 128/256/32 families. 008 is the immediate rollback identity at SHA-256 `d3896b710bd8d90ad98838ca89aa298800039c73efaff0fbb5a2435ac21f7e35`. These are serving identities, not playing-strength or study-qualification claims. See [native provenance](../../native/settlegraph-v2/PROVENANCE.md) for source revisions and schema.

A compatible checkpoint upgrade changes the model store, not app source. The store contains retained `models/007/model.ctnn`, `models/008/model.ctnn` and current `models/009/model.ctnn`, `current.json` and `previous.json`. Current selection records checkpoint/name, expected SHA-256, supported observation/action contract and relative model path. Models are external to Git and images.

The web server uses the selected name for new matches. The game server passes the selected model path/hash to the native worker; worker startup verifies bytes, format and embedded probe, and the client pins identity across decisions and restarts. Neither server hot-reloads selection; restart both after switching. Existing match labels are historical snapshots; an active match may resume with the new policy after restart, as with an app release.

## Local

From this checkout, build the native worker once (again only when runtime code changes):

```sh
cargo build --release --locked --manifest-path native/settlegraph-v2/Cargo.toml
pnpm bot:promote -- --model /absolute/promoted-model.ctnn --checkpoint 009 --sha256 EXPECTED_SHA256
pnpm bot:check
```

The default store is `.local/bot`, ignored by Git and Docker builds. Set `SETTLEHEX_BOT_MODEL_MANIFEST=/absolute/store/current.json` for another store. Both local server processes must use the same selection and these flags:

```sh
export SETTLEHEX_SETTLEGRAPH_V2_ENABLED=1
export NEXT_PUBLIC_SETTLEHEX_SETTLEGRAPH_V2=1
pnpm serve  # game server; run pnpm dev in another shell with the same flags
```

After a selection change restart game/web. Roll back with `pnpm bot:promote -- --rollback`, then restart both. An installed model can also be selected again with its original model path/checkpoint/hash. A checkpoint directory cannot be overwritten with different bytes. Failed validation leaves current.json unchanged; unused candidate bytes may remain in their version directory. A per-store lock prevents simultaneous CLI installations; after a killed installer, verify no installer is running before removing its stale `.promotion-lock` directory.

If no local/external selection exists, `lib/server/bots/bot-model.json` provides bootstrap metadata. The old `SETTLEHEX_SETTLEGRAPH_V2_MODEL` override applies only to that bootstrap. An explicitly configured missing manifest fails startup; it never silently selects a fallback. An external current.json takes precedence over the checked-in release metadata.

## Production: routine model upgrade

After this infrastructure is deployed once, both web and game mount `/srv/settlex-models` read-only at `/opt/settlex/models` and read `/opt/settlex/models/current.json`. Set `SETTLEHEX_BOT_MODELS_DIR` for a different host store. Future compatible weight changes do not rebuild images or change the public release counter.

Upload the approved model to a new staging path on the server. From `/srv/settlex`, with explicit deployment authority:

```sh
bash infra/scripts/promote-bot.sh /absolute/staged-model.ctnn 009 EXPECTED_SHA256
```

The script verifies the existing selection, stops web/game, installs and checks the candidate using the existing game image, atomically changes the selection, and restarts both services without builds. Ordinary mounts stay read-only; only the isolated installer receives write access. If activated-model validation fails, it verifies/restores previous.json and restarts the old selection. The original failure is still reported. Keep the staging model available until activation finishes.

To roll back explicitly, run the same script with the retained prior model file, prior checkpoint and prior expected hash. Serialise production activations; do not run two activation scripts together. After success verify native preflight, the displayed opponent and actual Play vs Bot setup/main-turn behavior. Compatible here means the existing direct CTNN-v2/v3 runtime, topology and 299-action contract; architecture/observation/protocol changes still need a code release.

## Initial provisioning

For a new installation, prepare the external store before starting game/web. The routine activation script above requires an existing verified selection and cannot bootstrap an empty store. With explicit release authority, prepare `.env.prod` with bot serving enabled, choose the approved compatible model/checkpoint and expected SHA-256, and build the game/web images through the standard release workflow. The following example uses the current 009 release identity; obtain its external model separately.

From `/srv/settlex`, create the configured host store with permissions allowing the installer to write and both services to read it. Stage the approved model as `/absolute/staging/model.ctnn`. Use the same absolute store path as the Compose services (`/srv/settlex-models` by default):

```sh
export SETTLEHEX_BOT_MODELS_DIR=/srv/settlex-models
install -d "$SETTLEHEX_BOT_MODELS_DIR"
docker compose --env-file .env.prod -f infra/docker-compose.prod.yml run --rm --no-deps \
  --volume "$SETTLEHEX_BOT_MODELS_DIR:/opt/settlex/models:rw" \
  --volume /absolute/staging:/opt/settlex/candidate:ro \
  game node scripts/bots/promote.mjs \
  --directory /opt/settlex/models --model /opt/settlex/candidate/model.ctnn \
  --checkpoint 009 --sha256 d87d121a332766667fb65481593472ba937c35386c2cc3478a654127115ecccf

docker compose --env-file .env.prod -f infra/docker-compose.prod.yml run --rm --no-deps \
  game node scripts/bots/check-production-bot.mjs --require-enabled
```

The one-off installer overrides the model-store mount as writable; ordinary game/web mounts remain read-only. It verifies the supplied hash and native contract/probe before writing the initial `current.json`. An empty store has no previous selection, so `previous.json` rollback becomes available only after a later successful replacement. If bootstrap fails, leave services stopped and resolve the reported error before activation.

Deploy/start the infrastructure through the approved release workflow, restart both services after selection changes, then verify native preflight and a real selected-model match. Use the thorough release lane for initial Docker/deploy infrastructure changes. These are operator instructions, not authorization to perform production actions. Existing sealed-loader identities remain supported for legacy tools/tests; new compatible selections use the supplied manifest hash. Historical first-adoption/deployment and study-qualification receipts are preserved privately.
