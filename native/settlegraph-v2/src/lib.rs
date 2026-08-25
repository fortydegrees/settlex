use std::fs;
use std::path::Path;

use catan_env_contract::{
    settlegraph_contract_sha256, SettleGraphNet, CODEC_VERSION, NUM_ACTIONS, OBS_V2_DIM,
    OBS_V2_VERSION,
};
use serde::Serialize;
use sha2::{Digest, Sha256};

pub mod topology;

pub const EXPECTED_CTNN_SHA256: &str =
    "072906d17077f1ed3fa4e9254999a8920ec243bdda3ab42575258492b58465c8";
pub const EXPECTED_CONTRACT_SHA256: &str =
    "a64b9d0daaa3bb6f60f0c0c42bfc52b53ba4a4672263b85d899805323bc97e55";

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct RuntimeContract {
    pub model_kind: &'static str,
    pub observation_version: u32,
    pub observation_dim: usize,
    pub codec_version: u32,
    pub action_count: usize,
    pub contract_sha256: String,
}

pub struct VerifiedModel {
    pub sha256: String,
    pub contract: RuntimeContract,
    pub net: SettleGraphNet,
}

fn lowercase_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push(HEX[(byte >> 4) as usize] as char);
        output.push(HEX[(byte & 0x0f) as usize] as char);
    }
    output
}

pub fn runtime_contract() -> RuntimeContract {
    RuntimeContract {
        model_kind: "SettleGraph/CTNN-v2",
        observation_version: OBS_V2_VERSION,
        observation_dim: OBS_V2_DIM,
        codec_version: CODEC_VERSION,
        action_count: NUM_ACTIONS,
        contract_sha256: lowercase_hex(&settlegraph_contract_sha256()),
    }
}

pub fn load_verified_model(path: &Path) -> Result<VerifiedModel, String> {
    let bytes = fs::read(path)
        .map_err(|error| format!("cannot read sealed CTNN-v2 {}: {error}", path.display()))?;
    let sha256 = lowercase_hex(&Sha256::digest(&bytes));
    if sha256 != EXPECTED_CTNN_SHA256 {
        return Err(format!(
            "sealed CTNN-v2 SHA-256 mismatch: expected {EXPECTED_CTNN_SHA256}, received {sha256}"
        ));
    }

    let net = SettleGraphNet::from_bytes(&bytes)?;
    let contract = runtime_contract();
    if contract.contract_sha256 != EXPECTED_CONTRACT_SHA256 {
        return Err(format!(
            "native SettleGraph contract SHA-256 mismatch: expected {EXPECTED_CONTRACT_SHA256}, received {}",
            contract.contract_sha256
        ));
    }

    Ok(VerifiedModel {
        sha256,
        contract,
        net,
    })
}
