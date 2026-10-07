use settlegraph_v2::load_verified_model;
use std::path::Path;
#[test]
#[ignore = "requires exact external 009 artifact"]
fn incumbent_009_loads_and_runs_its_wide_v3_contract() {
    let path = std::env::var("SETTLEX_INCUMBENT_009_MODEL").expect("set exact 009 path");
    let model = load_verified_model(Path::new(&path)).expect("load checkpoint 009");
    assert_eq!(
        model.sha256,
        "d87d121a332766667fb65481593472ba937c35386c2cc3478a654127115ecccf"
    );
    assert_eq!(model.contract.observation_version, 3);
    assert_eq!(model.contract.observation_dim, 1464);
    assert_eq!(model.contract.action_count, 299);
    let mut scratch = model.net.new_scratch();
    let mut logits = [0.0; 299];
    let value = model
        .net
        .forward_raw(&[0.0; 1464], &mut scratch, &mut logits)
        .expect("forward");
    assert!(value.is_finite());
    assert!(logits.iter().all(|v| v.is_finite()));
}
