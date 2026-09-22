use std::fs;
use std::path::Path;

use catan_env_contract::{
    settlegraph_contract_sha256, SettleGraphNet, CODEC_VERSION, NUM_ACTIONS, OBS_V2_DIM,
    OBS_V2_VERSION,
};
use serde::Serialize;
use sha2::{Digest, Sha256};

pub mod decision;
pub mod protocol;
pub mod snapshot;
pub mod topology;

pub const EXPECTED_CTNN_SHA256: &str =
    "072906d17077f1ed3fa4e9254999a8920ec243bdda3ab42575258492b58465c8";
pub const INCUMBENT_005_CTNN_SHA256: &str =
    "382a8708312d469efdbb7333891a3469bd204d46d85ec02e218e0c0b377437ca";
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
        .map_err(|error| format!("cannot read sealed CTNN {}: {error}", path.display()))?;
    let sha256 = lowercase_hex(&Sha256::digest(&bytes));
    let expected_version = match sha256.as_str() {
        EXPECTED_CTNN_SHA256 => 2,
        INCUMBENT_005_CTNN_SHA256 => 3,
        _ => {
            return Err(format!(
                "sealed CTNN SHA-256 mismatch: expected approved V2 or 005, received {sha256}"
            ))
        }
    };

    let net = SettleGraphNet::from_bytes(&bytes)?;
    if net.observation_version() != expected_version {
        return Err(format!(
            "sealed model observation version mismatch: hash requires V{expected_version}, header reports V{}",
            net.observation_version()
        ));
    }
    let mut contract = runtime_contract();
    contract.observation_version = net.observation_version();
    contract.observation_dim = net.observation_dim();
    if expected_version == 3 {
        contract.model_kind = "SettleGraph/CTNN-v3";
    }
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
