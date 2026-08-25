use std::path::Path;

use settlegraph_v2::{
    load_verified_model, runtime_contract, EXPECTED_CONTRACT_SHA256, EXPECTED_CTNN_SHA256,
};

const SEALED_MODEL: &str =
    "/Users/david/Documents/ChatGPT/settlex-v2-production-2026-08-25/accepted/accepted-v2.ctnn";

#[test]
fn runtime_contract_matches_the_sealed_product_contract() {
    let contract = runtime_contract();
    assert_eq!(contract.model_kind, "SettleGraph/CTNN-v2");
    assert_eq!(contract.observation_version, 2);
    assert_eq!(contract.observation_dim, 1_445);
    assert_eq!(contract.codec_version, 1);
    assert_eq!(contract.action_count, 299);
    assert_eq!(
        contract.contract_sha256,
        "a64b9d0daaa3bb6f60f0c0c42bfc52b53ba4a4672263b85d899805323bc97e55"
    );
    assert_eq!(contract.contract_sha256, EXPECTED_CONTRACT_SHA256);
}

#[test]
#[ignore = "requires the external sealed CTNN-v2 artifact"]
fn sealed_ctnn_matches_hash_contract_and_embedded_probe() {
    let path =
        std::env::var("SETTLEX_SETTLEGRAPH_V2_MODEL").unwrap_or_else(|_| SEALED_MODEL.to_owned());
    let loaded = load_verified_model(Path::new(&path)).expect("verified sealed model");
    assert_eq!(loaded.sha256, EXPECTED_CTNN_SHA256);
    assert_eq!(loaded.contract, runtime_contract());
}
