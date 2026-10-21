#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum RulesetId {
    Standard = 0,
    SettlexDuel = 1,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiceMode {
    Random,
    Balanced,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GameRules {
    pub id: RulesetId,
    pub victory_target: i32,
    pub discard_limit: i16,
    pub dice_mode: DiceMode,
    pub friendly_robber: bool,
    pub friendly_robber_vp_threshold: i32,
    pub allow_player_trades: bool,
}

impl GameRules {
    pub const fn standard() -> Self {
        Self {
            id: RulesetId::Standard,
            victory_target: 10,
            discard_limit: 7,
            dice_mode: DiceMode::Random,
            friendly_robber: false,
            friendly_robber_vp_threshold: 2,
            allow_player_trades: true,
        }
    }

    pub const fn settlex_duel(victory_target: i32) -> Self {
        assert!(victory_target >= 3 && victory_target <= 20);
        Self {
            id: RulesetId::SettlexDuel,
            victory_target,
            discard_limit: 9,
            dice_mode: DiceMode::Balanced,
            friendly_robber: true,
            friendly_robber_vp_threshold: 2,
            allow_player_trades: false,
        }
    }
}
