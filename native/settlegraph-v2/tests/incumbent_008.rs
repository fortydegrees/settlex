use std::path::Path;

use settlegraph_v2::load_verified_model;

#[test]
#[ignore = "requires the exact external 008 artifact"]
fn incumbent_008_loads_with_its_sealed_v3_contract() {
    let path = std::env::var("SETTLEX_INCUMBENT_008_MODEL").expect("set the sealed 008 model path");
    let model = load_verified_model(Path::new(&path)).expect("load checkpoint 008");
    assert_eq!(
        model.sha256,
        "d3896b710bd8d90ad98838ca89aa298800039c73efaff0fbb5a2435ac21f7e35"
    );
    assert_eq!(model.contract.model_kind, "SettleGraph/CTNN-v3");
    assert_eq!(model.contract.observation_version, 3);
    assert_eq!(model.contract.observation_dim, 1_464);
    assert_eq!(model.contract.action_count, 299);
}
