use rand::Rng;

use crate::state::MAX_PLAYERS;

const MINIMUM_CARDS_BEFORE_RESHUFFLING: u8 = 13;
const RECENT_ROLL_MEMORY: usize = 5;
const RECENT_ROLL_PENALTY: f64 = 0.34;
const SEVEN_STREAK_PENALTY: f64 = 0.4;

const fn standard_pair_count(total: usize) -> u8 {
    if total < 2 || total > 12 {
        0
    } else if total <= 7 {
        (total - 1) as u8
    } else {
        (13 - total) as u8
    }
}

const fn full_pair_masks() -> [u8; 13] {
    let mut masks = [0; 13];
    let mut total = 2;
    while total <= 12 {
        masks[total] = (1u8 << standard_pair_count(total)) - 1;
        total += 1;
    }
    masks
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BalancedDiceState {
    pair_masks: [u8; 13],
    pub cards_left: u8,
    recent_totals: [u8; RECENT_ROLL_MEMORY],
    pub recent_len: u8,
    recent_next: u8,
    pub sevens_by_player: [u16; MAX_PLAYERS],
    pub total_sevens: u16,
    pub seven_streak_player: i8,
    pub seven_streak_count: u16,
}

impl BalancedDiceState {
    pub const fn new() -> Self {
        Self {
            pair_masks: full_pair_masks(),
            cards_left: 36,
            recent_totals: [0; RECENT_ROLL_MEMORY],
            recent_len: 0,
            recent_next: 0,
            sevens_by_player: [0; MAX_PLAYERS],
            total_sevens: 0,
            seven_streak_player: -1,
            seven_streak_count: 0,
        }
    }

    /// Reconstruct every probability-relevant field from the publicly
    /// observed player/total sequence, without copying a source game's
    /// private pair-mask or recency internals.
    pub fn from_public_rolls(rolls: &[(usize, u8)]) -> Self {
        Self::from_public_roll_iter(rolls.iter().copied())
    }

    /// Reconstruct every probability-relevant field from a public roll
    /// iterator, without exposing pair identities or random-generator state.
    pub fn from_public_roll_iter(rolls: impl IntoIterator<Item = (usize, u8)>) -> Self {
        let mut state = Self::new();
        for (player, total) in rolls {
            assert!((2..=12).contains(&total), "public dice total out of range");
            assert!(player < MAX_PLAYERS, "public dice player out of range");
            state.observe_forced_total(total, player);
        }
        state
    }

    /// Number of remaining ordered pairs for totals 2 through 12.
    pub fn remaining_pair_counts(&self) -> [u8; 11] {
        std::array::from_fn(|index| self.pair_masks[index + 2].count_ones() as u8)
    }

    /// Public recent totals ordered from oldest to newest, plus their count.
    /// Entries after `len` are zero and should be treated as absent.
    pub fn recent_totals_oldest(&self) -> ([u8; RECENT_ROLL_MEMORY], usize) {
        let len = self.recent_len as usize;
        let mut totals = [0; RECENT_ROLL_MEMORY];
        let oldest = if len == RECENT_ROLL_MEMORY {
            self.recent_next as usize
        } else {
            0
        };
        for (index, total) in totals.iter_mut().take(len).enumerate() {
            *total = self.recent_totals[(oldest + index) % RECENT_ROLL_MEMORY];
        }
        (totals, len)
    }

    pub fn draw<R: Rng + ?Sized>(
        &mut self,
        rng: &mut R,
        player: usize,
        num_players: usize,
    ) -> (u8, u8, u8) {
        self.reshuffle_if_needed();

        let mut weights = [0.0; 13];
        let mut total_weight = 0.0;
        for (total, weight_slot) in weights.iter_mut().enumerate().skip(2) {
            let weight = self.weight_for_total(total as u8, player, num_players);
            *weight_slot = weight;
            total_weight += weight;
        }
        debug_assert!(total_weight > 0.0);

        let target = rng.gen::<f64>() * total_weight;
        let selected_total = select_weighted_total(&weights, target)
            .expect("balanced dice deck has no drawable total");

        let mask = self.pair_masks[selected_total];
        let pair_index = rng.gen_range(0..mask.count_ones() as u8);
        let pair_bit = nth_set_bit(mask, pair_index);
        self.consume_pair(selected_total as u8, pair_bit, player);
        pair_for(selected_total as u8, pair_bit)
    }

    pub fn observe_forced_total(&mut self, total: u8, player: usize) {
        debug_assert!((2..=12).contains(&total));
        if self.cards_left < MINIMUM_CARDS_BEFORE_RESHUFFLING
            || self.pair_masks[total as usize] == 0
        {
            self.reshuffle();
        }
        let pair_bit = self.pair_masks[total as usize].trailing_zeros() as u8;
        self.consume_pair(total, pair_bit, player);
    }

    fn reshuffle_if_needed(&mut self) {
        if self.cards_left < MINIMUM_CARDS_BEFORE_RESHUFFLING {
            self.reshuffle();
        }
    }

    fn reshuffle(&mut self) {
        self.pair_masks = full_pair_masks();
        self.cards_left = 36;
    }

    fn consume_pair(&mut self, total: u8, pair_bit: u8, player: usize) {
        self.pair_masks[total as usize] &= !(1 << pair_bit);
        self.cards_left -= 1;
        self.remember(total);
        if total == 7 {
            self.total_sevens += 1;
            self.sevens_by_player[player] += 1;
            if self.seven_streak_player == player as i8 {
                self.seven_streak_count += 1;
            } else {
                self.seven_streak_player = player as i8;
                self.seven_streak_count = 1;
            }
        }
    }

    fn remember(&mut self, total: u8) {
        self.recent_totals[self.recent_next as usize] = total;
        self.recent_next = (self.recent_next + 1) % RECENT_ROLL_MEMORY as u8;
        self.recent_len = (self.recent_len + 1).min(RECENT_ROLL_MEMORY as u8);
    }

    fn recent_count(&self, total: u8) -> u8 {
        self.recent_totals[..self.recent_len as usize]
            .iter()
            .filter(|&&seen| seen == total)
            .count() as u8
    }

    fn weight_for_total(&self, total: u8, player: usize, num_players: usize) -> f64 {
        if self.cards_left == 0 {
            return 0.0;
        }
        let remaining = self.pair_masks[total as usize].count_ones() as f64;
        let recent_multiplier =
            (1.0 - self.recent_count(total) as f64 * RECENT_ROLL_PENALTY).max(0.0);
        let seven_multiplier = if total == 7 {
            self.seven_adjustment(player, num_players)
        } else {
            1.0
        };
        (remaining / self.cards_left as f64) * recent_multiplier * seven_multiplier
    }

    fn seven_adjustment(&self, player: usize, num_players: usize) -> f64 {
        if num_players < 2 {
            return 1.0;
        }
        let streak = self.seven_streak_adjustment(player);
        if self.total_sevens < num_players as u16 {
            return streak.clamp(0.0, 2.0);
        }
        let player_share = self.sevens_by_player[player] as f64 / self.total_sevens as f64;
        let ideal_share = 1.0 / num_players as f64;
        let imbalance = 1.0 + (ideal_share - player_share) / ideal_share;
        (imbalance + streak - 1.0).clamp(0.0, 2.0)
    }

    fn seven_streak_adjustment(&self, player: usize) -> f64 {
        if self.seven_streak_player < 0 || self.seven_streak_count == 0 {
            return 1.0;
        }
        let direction = if self.seven_streak_player == player as i8 {
            -1.0
        } else {
            1.0
        };
        1.0 + SEVEN_STREAK_PENALTY * self.seven_streak_count as f64 * direction
    }
}

impl Default for BalancedDiceState {
    fn default() -> Self {
        Self::new()
    }
}

fn nth_set_bit(mask: u8, mut index: u8) -> u8 {
    for bit in 0..6 {
        if mask & (1 << bit) != 0 {
            if index == 0 {
                return bit;
            }
            index -= 1;
        }
    }
    unreachable!("pair mask has fewer cards than its count")
}

fn pair_for(total: u8, pair_bit: u8) -> (u8, u8, u8) {
    let first = (total.saturating_sub(6)).max(1) + pair_bit;
    (first, total - first, total)
}

fn select_weighted_total(weights: &[f64; 13], mut target: f64) -> Option<usize> {
    for (total, &weight) in weights.iter().enumerate().skip(2) {
        if weight <= 0.0 {
            continue;
        }
        if target < weight {
            return Some(total);
        }
        target -= weight;
    }
    weights
        .iter()
        .enumerate()
        .skip(2)
        .find_map(|(total, &weight)| (weight > 0.0).then_some(total))
}

#[cfg(test)]
mod tests {
    use super::{select_weighted_total, BalancedDiceState};

    #[test]
    fn public_roll_replay_reconstructs_balanced_state() {
        let rolls = [(0usize, 6u8), (1, 7), (0, 4), (1, 8), (0, 6)];
        let mut expected = BalancedDiceState::new();
        for &(player, total) in &rolls {
            expected.observe_forced_total(total, player);
        }

        assert_eq!(BalancedDiceState::from_public_rolls(&rolls), expected,);
    }

    #[test]
    fn public_roll_iterator_exposes_only_public_dice_summaries() {
        let state = BalancedDiceState::from_public_roll_iter([
            (0usize, 2u8),
            (0, 7),
            (0, 6),
            (0, 7),
            (1, 8),
            (1, 9),
        ]);

        assert_eq!(
            state.remaining_pair_counts(),
            [0, 2, 3, 4, 4, 4, 4, 3, 3, 2, 1]
        );
        assert_eq!(state.recent_totals_oldest(), ([7, 6, 7, 8, 9], 5));
        assert_eq!(state.sevens_by_player, [2, 0, 0, 0]);
        assert_eq!(state.total_sevens, 2);
        assert_eq!(state.seven_streak_player, 0);
        assert_eq!(state.seven_streak_count, 2);
    }

    #[test]
    fn weighted_selection_miss_falls_back_to_first_positive_total() {
        let mut weights = [0.0; 13];
        weights[0] = 99.0;
        weights[4] = 2.0;
        weights[9] = 3.0;

        assert_eq!(select_weighted_total(&weights, 5.0), Some(4));
    }

    #[test]
    fn forced_totals_remove_each_ordered_pair_once() {
        let mut state = BalancedDiceState::new();
        assert_eq!(state.pair_masks[4], 0b111);

        state.observe_forced_total(4, 0);
        assert_eq!(state.pair_masks[4], 0b110);
        state.observe_forced_total(4, 0);
        assert_eq!(state.pair_masks[4], 0b100);
        state.observe_forced_total(4, 0);
        assert_eq!(state.pair_masks[4], 0);
        assert_eq!(state.cards_left, 33);
    }

    #[test]
    fn recent_penalty_uses_point_three_four_over_five_total_memory() {
        let mut state = BalancedDiceState::new();
        assert!((state.weight_for_total(6, 0, 2) - 0.138_888_888_888_888_9).abs() < 1e-12);

        state.remember(6);
        assert!((state.weight_for_total(6, 0, 2) - 0.091_666_666_666_666_67).abs() < 1e-12);
        state.remember(6);
        state.remember(6);
        state.remember(8);
        state.remember(9);
        assert_eq!(state.recent_len, 5);
        assert_eq!(state.weight_for_total(6, 0, 2), 0.0);

        state.remember(10);
        assert!((state.weight_for_total(6, 0, 2) - 0.044_444_444_444_444_44).abs() < 1e-12);
    }

    #[test]
    fn seven_adjustment_balances_players_applies_streak_and_clamps() {
        let mut state = BalancedDiceState::new();
        state.sevens_by_player = [1, 1, 0, 0];
        state.total_sevens = 2;
        state.seven_streak_player = 0;
        state.seven_streak_count = 1;
        assert!((state.seven_adjustment(0, 2) - 0.6).abs() < 1e-12);
        assert!((state.seven_adjustment(1, 2) - 1.4).abs() < 1e-12);

        state.sevens_by_player = [2, 0, 0, 0];
        state.seven_streak_player = -1;
        state.seven_streak_count = 0;
        assert_eq!(state.seven_adjustment(0, 2), 0.0);
        assert_eq!(state.seven_adjustment(1, 2), 2.0);

        state.sevens_by_player = [1, 1, 0, 0];
        state.seven_streak_player = 0;
        state.seven_streak_count = 3;
        assert_eq!(state.seven_adjustment(0, 2), 0.0);
        assert_eq!(state.seven_adjustment(1, 2), 2.0);
    }

    #[test]
    fn reshuffle_restores_pairs_but_retains_recent_penalty() {
        let mut state = BalancedDiceState::new();
        state.observe_forced_total(7, 0);
        state.observe_forced_total(6, 1);
        state.observe_forced_total(7, 0);
        state.observe_forced_total(6, 1);
        state.observe_forced_total(6, 1);
        state.pair_masks[2] = 0;
        state.cards_left = 12;

        state.reshuffle_if_needed();

        assert_eq!(state.cards_left, 36);
        assert_eq!(state.pair_masks[2], 0b1);
        assert_eq!(state.recent_len, 5);
        assert_eq!(state.recent_totals_oldest(), ([7, 6, 7, 6, 6], 5));
        assert_eq!(state.sevens_by_player, [2, 0, 0, 0]);
        assert_eq!(state.total_sevens, 2);
        assert_eq!(state.seven_streak_player, 0);
        assert_eq!(state.seven_streak_count, 2);
        assert_eq!(state.weight_for_total(6, 0, 2), 0.0);
    }
}
