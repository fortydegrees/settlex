//! Duel-only realistic-information observation V2.
//!
//! V2 preserves the legacy realistic observation byte-for-byte, then appends
//! public sufficient statistics needed by the SettleGraph policy.

use catan_core::balanced_dice::BalancedDiceState;
use catan_core::game::CatanGame;
use catan_core::state::{
    DEV_MONOPOLY, DEV_ROAD_BUILDING, DEV_VICTORY_POINT, DEV_YEAR_OF_PLENTY,
    INITIAL_RESOURCES_PER_TYPE,
};

use crate::obs::{encode_obs, Visibility, OBS_DIM};

pub const OBS_V2_VERSION: u32 = 2;
pub const OBS_V2_DIM: usize = 1_445;
pub const OPPONENT_RESOURCES: usize = 1_350;
pub const BALANCED_PAIR_COUNTS: usize = 1_355;
pub const RECENT_ROLLS: usize = 1_366;
pub const SEVENS_BY_SEAT: usize = 1_426;
pub const TOTAL_SEVENS: usize = 1_428;
pub const SEVEN_STREAK_OWNER: usize = 1_429;
pub const SEVEN_STREAK_COUNT: usize = 1_432;
pub const DEV_BUYS_BY_SEAT: usize = 1_433;
pub const DEV_PLAYS_BY_SEAT: usize = 1_435;
pub const DEV_BUYS_THIS_TURN: usize = 1_443;
pub const DEV_PLAYED_THIS_TURN: usize = 1_444;

const RECENT_ROLL_SLOTS: usize = 5;
const RECENT_ROLL_CATEGORIES: usize = 12;
const NON_KNIGHT_DEV_TYPES: [usize; 4] = [
    DEV_VICTORY_POINT,
    DEV_ROAD_BUILDING,
    DEV_YEAR_OF_PLENTY,
    DEV_MONOPOLY,
];

/// Encode a Duel game from `seat` using realistic information only.
///
/// The first `OBS_DIM` entries are exactly `encode_obs(..., Realistic, ...)`.
/// The appended values are intentionally raw public counts; model parsers own
/// their fixed normalization.
pub fn encode_obs_v2(game: &CatanGame, seat: usize, out: &mut [f32]) {
    assert_eq!(out.len(), OBS_V2_DIM, "obs_v2 buffer must be OBS_V2_DIM");
    assert_eq!(game.state.num_players, 2, "obs_v2 is Duel-only");
    assert!(seat < 2, "seat {seat} out of range");

    out.fill(0.0);
    encode_obs(game, seat, Visibility::Realistic, &mut out[..OBS_DIM]);

    let state = &game.state;
    for resource in 0..5 {
        out[OPPONENT_RESOURCES + resource] = (INITIAL_RESOURCES_PER_TYPE
            - state.bank[resource]
            - state.resources[seat][resource]) as f32;
    }

    let dice = BalancedDiceState::from_public_roll_iter(
        game.public_history
            .rolls
            .iter()
            .map(|roll| (roll.player as usize, roll.total)),
    );
    for (index, count) in dice.remaining_pair_counts().into_iter().enumerate() {
        out[BALANCED_PAIR_COUNTS + index] = count as f32;
    }

    let (recent_totals, recent_len) = dice.recent_totals_oldest();
    let leading_empty = RECENT_ROLL_SLOTS - recent_len;
    for slot in 0..RECENT_ROLL_SLOTS {
        let total = if slot < leading_empty {
            0
        } else {
            recent_totals[slot - leading_empty]
        };
        let category = if total == 0 { 0 } else { total as usize - 1 };
        debug_assert!(category < RECENT_ROLL_CATEGORIES);
        out[RECENT_ROLLS + slot * RECENT_ROLL_CATEGORIES + category] = 1.0;
    }

    for relative_seat in 0..2 {
        let player = (seat + relative_seat) % 2;
        out[SEVENS_BY_SEAT + relative_seat] = dice.sevens_by_player[player] as f32;
        out[DEV_BUYS_BY_SEAT + relative_seat] =
            game.public_history.dev_buys_by_player[player] as f32;
        for (card_offset, card_type) in NON_KNIGHT_DEV_TYPES.iter().copied().enumerate() {
            out[DEV_PLAYS_BY_SEAT + relative_seat * NON_KNIGHT_DEV_TYPES.len() + card_offset] =
                game.public_history.dev_plays_by_player[player][card_type] as f32;
        }
    }
    out[TOTAL_SEVENS] = dice.total_sevens as f32;
    out[SEVEN_STREAK_OWNER] = 1.0;
    if dice.seven_streak_player >= 0 {
        let owner = dice.seven_streak_player as usize;
        assert!(owner < 2, "Duel public roll owner out of range");
        let relative_owner = (owner + 2 - seat) % 2;
        out[SEVEN_STREAK_OWNER] = 0.0;
        out[SEVEN_STREAK_OWNER + 1 + relative_owner] = 1.0;
    }
    out[SEVEN_STREAK_COUNT] = dice.seven_streak_count as f32;
    out[DEV_BUYS_THIS_TURN] = game.public_history.dev_buys_this_turn as f32;
    out[DEV_PLAYED_THIS_TURN] = f32::from(state.dev_card_played_this_turn);

    assert!(
        out.iter().all(|value| value.is_finite()),
        "obs_v2 must be finite"
    );
}
