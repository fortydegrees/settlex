use std::path::Path;

use catan_env_contract::NUM_ACTIONS;
use serde_json::Value;
use settlegraph_v2::decision::select_highest_legal;
use settlegraph_v2::{load_verified_model, INCUMBENT_005_CTNN_SHA256};

fn model_path() -> String {
    std::env::var("SETTLEX_INCUMBENT_005_MODEL").expect("set the sealed 005 model path")
}

#[test]
#[ignore = "requires external sealed 005 artifact and authenticated reference probes"]
fn incumbent_005_matches_research_outputs_and_legal_choices() {
    let model = load_verified_model(Path::new(&model_path())).expect("load promoted 005");
    assert_eq!(model.sha256, INCUMBENT_005_CTNN_SHA256);
    assert_eq!(model.contract.model_kind, "SettleGraph/CTNN-v3");
    assert_eq!(model.contract.observation_version, 3);
    assert_eq!(model.contract.observation_dim, 1_464);
    assert_eq!(model.contract.action_count, 299);

    let probes: Value = serde_json::from_slice(
        &std::fs::read(std::env::var("SETTLEX_005_REFERENCE_PROBES").unwrap()).unwrap(),
    )
    .unwrap();
    let rows = probes["rows"].as_array().unwrap();
    assert_eq!(rows.len(), 256);

    let mut scratch = model.net.new_scratch();
    let mut logits = [0.0; NUM_ACTIONS];
    for (index, row) in rows.iter().enumerate() {
        let observation: Vec<f32> = serde_json::from_value(row["observation"].clone()).unwrap();
        let expected_logits: Vec<f32> = serde_json::from_value(row["logits"].clone()).unwrap();
        let mask: [bool; NUM_ACTIONS] = serde_json::from_value::<Vec<bool>>(row["mask"].clone())
            .unwrap()
            .try_into()
            .unwrap();
        let value = model
            .net
            .forward_raw(&observation, &mut scratch, &mut logits)
            .unwrap();
        let expected_value = row["value"].as_f64().unwrap() as f32;
        assert!(
            (value - expected_value).abs() < 1e-4,
            "probe {index} value mismatch: {value} != {expected_value}"
        );
        for (action, (&actual, expected)) in logits.iter().zip(expected_logits).enumerate() {
            assert!(
                (actual - expected).abs() < 1e-4,
                "probe {index} logit {action} mismatch: {actual} != {expected}"
            );
        }
        assert_eq!(
            select_highest_legal(&logits, &mask),
            Some(row["action"].as_u64().unwrap() as usize),
            "probe {index} legal argmax mismatch"
        );
    }
}
