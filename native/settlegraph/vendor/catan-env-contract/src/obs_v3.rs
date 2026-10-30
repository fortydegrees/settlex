//! Additive public tile identity observation. The V2 prefix remains immutable.
use crate::obs_v2::{encode_obs_v2, OBS_V2_DIM};
use catan_core::game::CatanGame;

pub const OBS_V3_VERSION: u32 = 3;
pub const OBS_V3_DIM: usize = OBS_V2_DIM + 19;
pub const TILE_TOKEN_IDS: usize = OBS_V2_DIM;
pub const TILE_TOKEN_CATEGORIES: [i8; 11] = [0, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

/// Inline storage selected by the loaded model, also usable in batched search.
#[derive(Clone, Copy)]
pub enum SettleGraphObservation {
    V2([f32; OBS_V2_DIM]),
    V3([f32; OBS_V3_DIM]),
}

impl SettleGraphObservation {
    pub fn encode(&mut self, game: &CatanGame, seat: usize) {
        match self {
            Self::V2(out) => encode_obs_v2(game, seat, out),
            Self::V3(out) => encode_obs_v3(game, seat, out),
        }
    }
}

impl AsRef<[f32]> for SettleGraphObservation {
    fn as_ref(&self) -> &[f32] {
        match self {
            Self::V2(out) => out,
            Self::V3(out) => out,
        }
    }
}

pub fn encode_obs_v3(game: &CatanGame, seat: usize, out: &mut [f32]) {
    assert_eq!(out.len(), OBS_V3_DIM, "obs_v3 buffer must be OBS_V3_DIM");
    encode_obs_v2(game, seat, &mut out[..OBS_V2_DIM]);
    for (slot, token) in out[TILE_TOKEN_IDS..]
        .iter_mut()
        .zip(game.state.tile_numbers)
    {
        assert!(TILE_TOKEN_CATEGORIES.contains(&token), "invalid tile token");
        *slot = f32::from(token);
    }
}
