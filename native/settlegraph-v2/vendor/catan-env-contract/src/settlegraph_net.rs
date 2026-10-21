//! CTNN-v2/v3 inference with closed normal and twofold-wide specializations.
use crate::codec::NUM_ACTIONS;
use crate::obs_v3::SettleGraphObservation;
use std::path::Path;

mod normal {
    const ENTITY: usize = 64;
    const GLOBAL: usize = 128;
    const RELATION: usize = 16;
    include!("settlegraph_kernel.rs");
}
mod wide {
    const ENTITY: usize = 128;
    const GLOBAL: usize = 256;
    const RELATION: usize = 32;
    include!("settlegraph_kernel.rs");
}

enum Model {
    Normal(normal::SettleGraphNet),
    Wide(wide::SettleGraphNet),
}
enum Scratch {
    Normal(Box<normal::SettleGraphScratch>),
    Wide(Box<wide::SettleGraphScratch>),
}
/// Reusable buffers bound to the loaded model width. Forward passes allocate nothing.
pub struct SettleGraphScratch {
    inner: Scratch,
}
impl Default for SettleGraphScratch {
    fn default() -> Self {
        Self {
            inner: Scratch::Normal(Box::default()),
        }
    }
}
/// Native normal or twofold-wide SettleGraph model, with the original FP32 kernels.
pub struct SettleGraphNet {
    inner: Model,
}
impl SettleGraphNet {
    pub fn load(path: &Path) -> Result<Self, String> {
        Self::from_bytes(
            &std::fs::read(path)
                .map_err(|e| format!("cannot read CTNN {}: {e}", path.display()))?,
        )
    }
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, String> {
        if bytes.len() < 32 {
            return Err("CTNN graph header is truncated".into());
        }
        let dimension = |offset| u32::from_le_bytes(bytes[offset..offset + 4].try_into().unwrap());
        let inner = match (dimension(16), dimension(20), dimension(28)) {
            (64, 128, 16) => Model::Normal(normal::SettleGraphNet::from_bytes(bytes)?),
            (128, 256, 32) => Model::Wide(wide::SettleGraphNet::from_bytes(bytes)?),
            _ => return Err("unsupported native SettleGraph widths".into()),
        };
        Ok(Self { inner })
    }
    pub fn contract_sha256(&self) -> [u8; 32] {
        match &self.inner {
            Model::Normal(n) => n.contract_sha256(),
            Model::Wide(n) => n.contract_sha256(),
        }
    }
    pub fn observation_version(&self) -> u32 {
        match &self.inner {
            Model::Normal(n) => n.observation_version(),
            Model::Wide(n) => n.observation_version(),
        }
    }
    pub fn observation_dim(&self) -> usize {
        match &self.inner {
            Model::Normal(n) => n.observation_dim(),
            Model::Wide(n) => n.observation_dim(),
        }
    }
    pub fn new_observation(&self) -> SettleGraphObservation {
        match self.observation_version() {
            2 => SettleGraphObservation::V2([0.0; crate::obs_v2::OBS_V2_DIM]),
            3 => SettleGraphObservation::V3([0.0; crate::obs_v3::OBS_V3_DIM]),
            _ => unreachable!("loader validates observation version"),
        }
    }
    pub fn new_scratch(&self) -> SettleGraphScratch {
        SettleGraphScratch {
            inner: match &self.inner {
                Model::Normal(n) => Scratch::Normal(Box::new(n.new_scratch())),
                Model::Wide(n) => Scratch::Wide(Box::new(n.new_scratch())),
            },
        }
    }
    fn validate(&self, obs: &[f32], scratch: &SettleGraphScratch) -> Result<(), String> {
        match (&self.inner, &scratch.inner) {
            (Model::Normal(n), Scratch::Normal(_)) => n.validate_observation(obs),
            (Model::Wide(n), Scratch::Wide(_)) => n.validate_observation(obs),
            _ => Err("SettleGraph scratch width does not match model".into()),
        }
    }
    pub fn forward_raw(
        &self,
        obs: &[f32],
        scratch: &mut SettleGraphScratch,
        logits: &mut [f32; NUM_ACTIONS],
    ) -> Result<f32, String> {
        match (&self.inner, &mut scratch.inner) {
            (Model::Normal(n), Scratch::Normal(s)) => n.forward_raw(obs, s, logits),
            (Model::Wide(n), Scratch::Wide(s)) => n.forward_raw(obs, s, logits),
            _ => Err("SettleGraph scratch width does not match model".into()),
        }
    }
    pub fn forward_many_raw<T: AsRef<[f32]>>(
        &self,
        observations: &[T],
        scratches: &mut [SettleGraphScratch],
        logits: &mut [[f32; NUM_ACTIONS]],
        values: &mut [f32],
    ) -> Result<(), String> {
        let lanes = observations.len();
        if scratches.len() != lanes || logits.len() != lanes || values.len() != lanes {
            return Err("SettleGraph multi-state slices must have equal length".into());
        }
        for (obs, scratch) in observations.iter().zip(scratches.iter()) {
            self.validate(obs.as_ref(), scratch)?;
        }
        for lane in 0..lanes {
            values[lane] = self.forward_raw(
                observations[lane].as_ref(),
                &mut scratches[lane],
                &mut logits[lane],
            )?;
        }
        Ok(())
    }
}
