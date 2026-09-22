use catan_core::game::{Action, CatanGame, GamePhase, TurnPhase};
use catan_core::trading::get_bank_trade_rate;
use catan_env_contract::{decode_action, fill_action_mask, SettleGraphScratch, NUM_ACTIONS};
use serde::Serialize;
use serde_json::{json, Value};

use crate::snapshot::ImportedSnapshot;
use crate::topology::TopologyMap;
use crate::{RuntimeContract, VerifiedModel};

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct PlannedMove {
    #[serde(rename = "move")]
    pub move_name: String,
    pub args: Vec<Value>,
}

impl PlannedMove {
    pub fn new(move_name: impl Into<String>, args: Vec<Value>) -> Self {
        Self {
            move_name: move_name.into(),
            args,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DecisionOutput {
    pub planned_moves: Vec<PlannedMove>,
    pub action_ids: Vec<usize>,
    pub value: f32,
    pub legal_action_count: usize,
}

fn resource_name(resource: u8) -> Result<&'static str, String> {
    match resource {
        0 => Ok("Wheat"),
        1 => Ok("Sheep"),
        2 => Ok("Wood"),
        3 => Ok("Brick"),
        4 => Ok("Ore"),
        _ => Err(format!("native resource id {resource} is outside 0..5")),
    }
}

fn website_edge_id([a, b]: [i32; 2]) -> String {
    if a < b {
        format!("{a},{b}")
    } else {
        format!("{b},{a}")
    }
}

pub fn select_highest_legal(
    logits: &[f32; NUM_ACTIONS],
    mask: &[bool; NUM_ACTIONS],
) -> Option<usize> {
    let mut best = None;
    let mut best_logit = f32::NEG_INFINITY;
    for (action, (&logit, &legal)) in logits.iter().zip(mask).enumerate() {
        if legal && logit > best_logit {
            best = Some(action);
            best_logit = logit;
        }
    }
    best
}

pub fn plan_for_action(
    game: &CatanGame,
    topology: &TopologyMap,
    action: &Action,
) -> Result<Vec<PlannedMove>, String> {
    let one = |move_name: &str, args: Vec<Value>| Ok(vec![PlannedMove::new(move_name, args)]);
    match *action {
        Action::PlaceInitialSettlement { vertex, .. } | Action::BuildSettlement { vertex, .. } => {
            one(
                "placeSettlement",
                vec![json!(topology.native_to_website_vertex[vertex as usize])],
            )
        }
        Action::BuildCity { vertex, .. } => one(
            "placeCity",
            vec![json!(topology.native_to_website_vertex[vertex as usize])],
        ),
        Action::PlaceInitialRoad { edge, .. } | Action::BuildRoad { edge, .. } => {
            let move_name = if game.game_phase == GamePhase::SetupForward
                || game.game_phase == GamePhase::SetupBackward
            {
                "placeRoad"
            } else if game.turn_phase == TurnPhase::RoadBuilding {
                "placeRoadFromDevCard"
            } else {
                "placeRoad"
            };
            one(
                move_name,
                vec![json!(website_edge_id(
                    topology.native_edge_website_vertices(edge as usize)
                ))],
            )
        }
        Action::MoveRobber { tile, .. } => one(
            "moveRobber",
            vec![json!(topology.native_to_website_tile[tile as usize])],
        ),
        Action::DiscardResource { .. } => {
            Err("native discard actions must be combined with collect_discard_plan_with".to_owned())
        }
        Action::PlayMonopoly { resource, .. } => Ok(vec![
            PlannedMove::new("playDevCardStart", vec![json!("monopoly")]),
            PlannedMove::new("confirmDevCardPlay", vec![json!(resource_name(resource)?)]),
        ]),
        Action::PlayYearOfPlenty { r1, r2, .. } => Ok(vec![
            PlannedMove::new("playDevCardStart", vec![json!("yearOfPlenty")]),
            PlannedMove::new(
                "confirmDevCardPlay",
                vec![json!([resource_name(r1)?, resource_name(r2)?])],
            ),
        ]),
        Action::TradeWithBank { player, give, recv } => {
            let amount = get_bank_trade_rate(&game.state, player as usize, give as usize);
            if amount <= 0 {
                return Err(format!(
                    "native bank trade returned invalid give amount {amount}"
                ));
            }
            let give_name = resource_name(give)?;
            let receive_name = resource_name(recv)?;
            one(
                "maritimeTrade",
                vec![json!({
                    "give": vec![give_name; amount as usize],
                    "receive": [receive_name]
                })],
            )
        }
        Action::RollDice { .. } => one("rollDice", vec![]),
        Action::BuyDevCard { .. } => one("buyDevCard", vec![]),
        Action::PlayKnight { .. } => one("playDevCardStart", vec![json!("knight")]),
        Action::PlayRoadBuilding { .. } => one("playDevCardStart", vec![json!("roadBuilding")]),
        Action::EndTurn { .. } => one("endTurn", vec![]),
        Action::StealResource { .. } => Err(
            "website duel resolves the sole legal robber steal atomically with moveRobber"
                .to_owned(),
        ),
        Action::ProposeTrade { .. } | Action::RespondTrade { .. } | Action::ConfirmTrade { .. } => {
            Err("native player-trade actions are disabled in the duel contract".to_owned())
        }
    }
}

pub fn collect_discard_plan_with<F>(
    game: &mut CatanGame,
    actor: usize,
    mut choose: F,
) -> Result<(PlannedMove, Vec<usize>), String>
where
    F: FnMut(&CatanGame, &[bool; NUM_ACTIONS]) -> Result<usize, String>,
{
    if game.turn_phase != TurnPhase::RobberDiscard || game.current_player() != actor {
        return Err(format!(
            "native actor {actor} is not the current robber-discard actor"
        ));
    }
    let required = game
        .pending_discards
        .get(game.discard_idx)
        .map(|(_, remaining)| *remaining as usize)
        .ok_or_else(|| "native robber-discard state has no pending count".to_owned())?;
    if required == 0 {
        return Err("native robber-discard count is zero".to_owned());
    }

    let mut resources = Vec::with_capacity(required);
    let mut action_ids = Vec::with_capacity(required);
    let mut action_scratch = Vec::with_capacity(NUM_ACTIONS);
    while game.turn_phase == TurnPhase::RobberDiscard && game.current_player() == actor {
        let mut mask = [false; NUM_ACTIONS];
        fill_action_mask(game, &mut action_scratch, &mut mask);
        let action_id = choose(game, &mask)?;
        if action_id >= NUM_ACTIONS || !mask[action_id] {
            return Err(format!(
                "discard chooser returned illegal native action {action_id}"
            ));
        }
        let action = decode_action(game, action_id);
        let resource = match action {
            Action::DiscardResource { player, resource } if player as usize == actor => resource,
            other => {
                return Err(format!(
                    "discard chooser returned non-discard native action {other:?}"
                ))
            }
        };
        resources.push(resource_name(resource)?);
        action_ids.push(action_id);
        if !game.execute_action(&action) {
            return Err(format!(
                "native engine rejected legal discard action {action_id}"
            ));
        }
    }
    if resources.len() != required {
        return Err(format!(
            "native discard plan selected {} cards, expected {required}",
            resources.len()
        ));
    }
    Ok((
        PlannedMove::new("discardResources", vec![json!(resources)]),
        action_ids,
    ))
}

pub struct DecisionEngine {
    net: catan_env_contract::SettleGraphNet,
    scratch: SettleGraphScratch,
    logits: [f32; NUM_ACTIONS],
    pub model_sha256: String,
    pub contract: RuntimeContract,
}

impl DecisionEngine {
    pub fn new(model: VerifiedModel) -> Self {
        let scratch = model.net.new_scratch();
        Self {
            net: model.net,
            scratch,
            logits: [0.0; NUM_ACTIONS],
            model_sha256: model.sha256,
            contract: model.contract,
        }
    }

    fn choose_game(
        &mut self,
        game: &CatanGame,
        actor: usize,
        mask: &[bool; NUM_ACTIONS],
    ) -> Result<(usize, f32), String> {
        let mut observation = self.net.new_observation();
        observation.encode(game, actor);
        let value =
            self.net
                .forward_raw(observation.as_ref(), &mut self.scratch, &mut self.logits)?;
        let action = select_highest_legal(&self.logits, mask)
            .ok_or_else(|| "SettleGraph V2 produced no legal action".to_owned())?;
        Ok((action, value))
    }

    pub fn decide(&mut self, mut imported: ImportedSnapshot) -> Result<DecisionOutput, String> {
        let legal_action_count = imported.action_mask.iter().filter(|legal| **legal).count();
        if legal_action_count == 0 {
            return Err("SettleGraph V2 snapshot has no legal native action".to_owned());
        }

        if imported.game.turn_phase == TurnPhase::RobberDiscard {
            let mut values = Vec::new();
            let actor = imported.actor;
            let (planned, action_ids) =
                collect_discard_plan_with(&mut imported.game, actor, |game, mask| {
                    let (action, value) = self.choose_game(game, actor, mask)?;
                    values.push(value);
                    Ok(action)
                })?;
            return Ok(DecisionOutput {
                planned_moves: vec![planned],
                action_ids,
                value: values.first().copied().unwrap_or(0.0),
                legal_action_count,
            });
        }

        let (action_id, value) =
            self.choose_game(&imported.game, imported.actor, &imported.action_mask)?;
        let action = decode_action(&imported.game, action_id);
        let planned_moves = plan_for_action(&imported.game, &imported.topology, &action)?;
        if planned_moves.is_empty() {
            return Err(format!(
                "native action {action_id} produced an empty website plan"
            ));
        }
        Ok(DecisionOutput {
            planned_moves,
            action_ids: vec![action_id],
            value,
            legal_action_count,
        })
    }
}
