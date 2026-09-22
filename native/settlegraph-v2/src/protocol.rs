use std::collections::BTreeMap;

use serde::Deserialize;
use serde_json::Value;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteSnapshot {
    #[serde(rename = "G")]
    pub game: WebsiteGame,
    pub ctx: WebsiteContext,
    #[serde(rename = "_stateID", default)]
    pub state_id: i64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteGame {
    pub core: WebsiteCore,
    pub tiles: Vec<WebsiteTile>,
    pub mode_id: String,
    pub ruleset_id: String,
    pub board_source_id: String,
    #[serde(default)]
    pub dice_roll: Vec<i32>,
    #[serde(default)]
    pub dev_card_play: Option<WebsiteDevCardPlay>,
    #[serde(default)]
    pub robber_return_to_stage: Option<String>,
    #[serde(default)]
    pub game_log: Vec<WebsiteGameLogEntry>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteContext {
    pub num_players: usize,
    pub turn: u32,
    pub current_player: String,
    pub play_order: Vec<String>,
    pub phase: String,
    #[serde(default)]
    pub active_players: BTreeMap<String, Value>,
    #[serde(default)]
    pub gameover: Option<Value>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct WebsiteTile {
    pub coordinate: [i32; 3],
    #[serde(rename = "type")]
    pub kind: String,
    pub tile: WebsiteTileData,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteTileData {
    pub id: i32,
    #[serde(default)]
    pub resource: Option<String>,
    #[serde(default)]
    pub number: Option<i32>,
    #[serde(default)]
    pub nodes: Value,
    #[serde(default)]
    pub direction: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteCore {
    pub phase: String,
    pub players: Vec<String>,
    pub buildings_by_node_id: BTreeMap<String, WebsiteBuilding>,
    pub roads_by_edge_id: BTreeMap<String, String>,
    pub awards: WebsiteAwards,
    #[serde(default)]
    pub game_over: Option<WebsiteGameOver>,
    pub ruleset: WebsiteRuleset,
    pub bank: WebsiteBank,
    pub player_state_by_id: BTreeMap<String, WebsitePlayerState>,
    pub turn: WebsiteTurn,
    pub robber_tile_id: Option<i32>,
    pub dev_deck: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteBuilding {
    pub owner_id: String,
    #[serde(rename = "type")]
    pub kind: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteAwards {
    #[serde(default)]
    pub longest_road_owner_id: Option<String>,
    #[serde(default)]
    pub largest_army_owner_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteGameOver {
    pub winner_id: String,
    pub reason: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteRuleset {
    pub victory_points_to_win: i32,
    pub discard_limit: i16,
    pub dice_mode: String,
    pub friendly_robber: WebsiteFriendlyRobber,
    pub allow_player_trades: bool,
    pub dev_cards_enabled: bool,
    pub piece_limits: WebsitePieceLimits,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteFriendlyRobber {
    pub enabled: bool,
    pub vp_threshold: i32,
}

#[derive(Clone, Debug, Deserialize)]
pub struct WebsitePieceLimits {
    pub roads: u8,
    pub settlements: u8,
    pub cities: u8,
}

#[derive(Clone, Debug, Deserialize)]
pub struct WebsiteBank {
    pub resources: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsitePlayerState {
    pub resources: Vec<String>,
    pub victory_points: i32,
    pub roads_remaining: u8,
    pub settlements_remaining: u8,
    pub cities_remaining: u8,
    pub dev_cards: Vec<String>,
    pub dev_cards_bought_this_turn: Vec<String>,
    pub dev_cards_played_this_turn: u8,
    pub knights_played: i8,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteTurn {
    pub phase: String,
    pub has_rolled: bool,
    #[serde(default)]
    pub last_roll_total: Option<i32>,
    #[serde(default)]
    pub pending_discards: Vec<String>,
    pub current_player_id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteDevCardPlay {
    #[serde(rename = "type")]
    pub kind: String,
    pub player_id: String,
    #[serde(default)]
    pub pending_roads: i32,
    #[serde(default)]
    pub started_from_stage: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteGameLogEntry {
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(default)]
    pub actor_id: Option<String>,
    #[serde(default)]
    pub data: Value,
    #[serde(default)]
    pub turn: Option<u32>,
    #[serde(default)]
    pub phase: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(deny_unknown_fields)]
pub struct WorkerRequest {
    pub id: String,
    #[serde(default = "default_worker_mode")]
    pub mode: String,
    #[serde(default)]
    pub player_id: Option<String>,
    #[serde(default)]
    pub state: Option<WebsiteSnapshot>,
}

fn default_worker_mode() -> String {
    "decide".to_owned()
}
