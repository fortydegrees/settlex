# SettleGraph 007 current default

Exact qualified A-renewal, direct CTNN-v3 policy (1,464 observations / 299 actions):
`88ef6db4c7cf1958774e8e0bcbda0eeb49ac683f50b960bd2cdb67a381e2df79`.

Local package: `/Users/david/coding/settlex-ai/research/reports/2026-10-01-incumbent-007-promotion/incumbent-007/model.ctnn`.
Release mount: `/srv/settlex-models/incumbent-007/model.ctnn`, exposed read-only inside the game container as `/opt/settlex/models/incumbent-007/model.ctnn`.

The existing single **Play vs Bot** action and bot key are unchanged. New native-bot matches display **SettleGraph 007**. The worker and JavaScript client accept the exact 007 hash with the existing V3 shape and contract, and pin all later decisions to the same model. Production preflight rejects an older model served as this release.

Build the existing worker and run the same `settleGraphV2.e2e.test.js` smoke from README with `SETTLEX_EXPECTED_MODEL_SHA256` set to the hash above and `SETTLEX_SETTLEGRAPH_V2_MODEL` pointing to this package. Set `SETTLEX_E2E_RECEIPT` to save the setup/main-turn decisions and selected model identities. No extra benchmark or full-game strength study is part of promotion.

Keep the 006 model mount and prior release images. To roll back, restore the prior release's manifest, model path and labels together; the new worker also continues accepting exact 006. Its unchanged model is `299c23241e1ca32c4b9203206a9b2c17fc7f6246d4adff0f6d3a9ad6404b736b`. Do not disable the production hash check to substitute another model.

Deployed with David's explicit approval on 1 October 2026 at `c7869de` through GitHub Actions run `36838178786`. Full CI verification and both Linux container builds passed. Live preflight authenticated this exact 007 artifact; a match created through Play vs Bot completed setup and normal 007 turns without native fallback. The task-owned match was resigned and browser closed. The public badge retained the approved Beta wording. See the canonical promotion report for live receipt and screenshot.
