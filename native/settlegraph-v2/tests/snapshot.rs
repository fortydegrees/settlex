use catan_core::game::{Action, GamePhase, TurnPhase};
use catan_env_contract::codec::NUM_ACTIONS;
use catan_env_contract::obs::{SELF_PRIVATE, VERTEX_STRIDE, VERTICES};
use catan_env_contract::obs_v2::{OPPONENT_RESOURCES, RECENT_ROLLS};
use serde_json::{json, Value};
use settlegraph_v2::decision::{
    collect_discard_plan_with, plan_for_action, select_highest_legal, DecisionEngine,
};
use settlegraph_v2::load_verified_model;
use settlegraph_v2::protocol::WebsiteSnapshot;
use settlegraph_v2::snapshot::import_snapshot;
use std::path::Path;

fn cards(counts: &[(&str, usize)]) -> Vec<Value> {
    let mut result = Vec::new();
    for (card, count) in counts {
        result.extend((0..*count).map(|_| json!(card)));
    }
    result
}

fn standard_tiles() -> Vec<Value> {
    let land = [
        (0, [-2, 0, 2], [0, 1, 2, 3, 4, 5], "Wood", 5),
        (1, [-2, 1, 1], [6, 7, 0, 5, 8, 9], "Brick", 2),
        (2, [-2, 2, 0], [10, 11, 6, 9, 12, 13], "Sheep", 6),
        (3, [-1, -1, 2], [14, 15, 16, 17, 2, 1], "Wheat", 3),
        (4, [-1, 0, 1], [18, 19, 14, 1, 0, 7], "Ore", 8),
        (5, [-1, 1, 0], [20, 21, 18, 7, 6, 11], "Wood", 10),
        (6, [-1, 2, -1], [22, 23, 20, 11, 10, 24], "Sheep", 9),
        (7, [0, -2, 2], [25, 26, 27, 28, 16, 15], "Brick", 12),
        (8, [0, -1, 1], [29, 30, 25, 15, 14, 19], "Wheat", 11),
        (9, [0, 0, 0], [31, 32, 29, 19, 18, 21], "Desert", 0),
        (10, [0, 1, -1], [33, 34, 31, 21, 20, 23], "Ore", 4),
        (11, [0, 2, -2], [35, 36, 33, 23, 22, 37], "Wood", 8),
        (12, [1, -2, 1], [38, 39, 40, 26, 25, 30], "Sheep", 10),
        (13, [1, -1, 0], [41, 42, 38, 30, 29, 32], "Wheat", 9),
        (14, [1, 0, -1], [43, 44, 41, 32, 31, 34], "Ore", 4),
        (15, [1, 1, -2], [45, 46, 43, 34, 33, 36], "Wood", 5),
        (16, [2, -2, 0], [47, 48, 49, 39, 38, 42], "Sheep", 6),
        (17, [2, -1, -1], [50, 51, 47, 42, 41, 44], "Brick", 3),
        (18, [2, 0, -2], [52, 53, 50, 44, 43, 46], "Wheat", 11),
    ];
    let mut tiles: Vec<Value> = land
        .into_iter()
        .map(|(id, coordinate, nodes, resource, number)| {
            json!({
                "coordinate": coordinate,
                "type": "Land",
                "tile": {
                    "id": id,
                    "resource": resource,
                    "number": if number == 0 { Value::Null } else { json!(number) },
                    "nodes": {
                        "NORTH": nodes[0],
                        "NORTHEAST": nodes[1],
                        "SOUTHEAST": nodes[2],
                        "SOUTH": nodes[3],
                        "SOUTHWEST": nodes[4],
                        "NORTHWEST": nodes[5]
                    },
                    "edges": {}
                }
            })
        })
        .collect();

    let ports = [
        (19, [1, 2, -3], [35, 36], "NORTHEAST", "Any"),
        (20, [2, 1, -3], [46, 52], "NORTHWEST", "Brick"),
        (21, [3, -1, -2], [50, 51], "NORTHEAST", "Ore"),
        (22, [3, -3, 0], [48, 49], "EAST", "Sheep"),
        (23, [1, -3, 2], [40, 26], "SOUTHEAST", "Wood"),
        (24, [-1, -2, 3], [16, 28], "SOUTHWEST", "Wheat"),
        (25, [-2, -1, 3], [2, 3], "SOUTHEAST", "Any"),
        (26, [-3, 1, 2], [5, 8], "SOUTHWEST", "Any"),
        (27, [-3, 3, 0], [12, 13], "WEST", "Any"),
    ];
    tiles.extend(
        ports
            .into_iter()
            .map(|(id, coordinate, nodes, direction, resource)| {
                json!({
                    "coordinate": coordinate,
                    "type": "Port",
                    "tile": {
                        "id": id,
                        "resource": resource,
                        "direction": direction,
                        "nodes": nodes,
                        "edges": {}
                    }
                })
            }),
    );
    tiles
}

fn base_snapshot_value() -> Value {
    let player_zero_resources = cards(&[("Wood", 1), ("Sheep", 1), ("Wheat", 1)]);
    let player_one_resources = cards(&[
        ("Brick", 2),
        ("Wood", 1),
        ("Sheep", 1),
        ("Wheat", 1),
        ("Ore", 3),
    ]);
    let mut bank_counts = [
        ("Wood", 19usize),
        ("Brick", 19),
        ("Sheep", 19),
        ("Wheat", 19),
        ("Ore", 19),
    ];
    for resource in player_zero_resources.iter().chain(&player_one_resources) {
        let resource = resource.as_str().expect("resource string");
        bank_counts
            .iter_mut()
            .find(|(name, _)| *name == resource)
            .expect("known resource")
            .1 -= 1;
    }

    json!({
        "_stateID": 17,
        "G": {
            "core": {
                "phase": "normal",
                "players": ["0", "1"],
                "buildingsByNodeId": {
                    "35": { "ownerId": "0", "type": "settlement" },
                    "46": { "ownerId": "1", "type": "city" }
                },
                "roadsByEdgeId": { "35,36": "0", "45,46": "1" },
                "pendingRoadFromNodeIdByPlayer": { "0": null, "1": null },
                "caches": { "buildableNodeIdsByPlayer": {}, "buildableEdgeIdsByPlayer": {} },
                "awards": { "longestRoadOwnerId": null, "largestArmyOwnerId": null },
                "gameOver": null,
                "ruleset": {
                    "victoryPointsToWin": 15,
                    "discardLimit": 9,
                    "diceMode": "balanced",
                    "friendlyRobber": { "enabled": true, "vpThreshold": 2 },
                    "bank": { "finite": true, "resourceCounts": {} },
                    "allowPlayerTrades": false,
                    "tradeRates": { "bank": 4, "genericPort": 3, "specificPort": 2 },
                    "devCardsEnabled": true,
                    "devCardCounts": { "knight": 14, "victoryPoint": 5, "roadBuilding": 2, "yearOfPlenty": 2, "monopoly": 2 },
                    "longestRoadMinLength": 5,
                    "largestArmyMinKnights": 3,
                    "pieceLimits": { "roads": 15, "settlements": 5, "cities": 4 },
                    "buildCosts": {}
                },
                "bank": { "resources": cards(&bank_counts) },
                "playerStateById": {
                    "0": {
                        "resources": player_zero_resources,
                        "victoryPoints": 2,
                        "roadsRemaining": 14,
                        "settlementsRemaining": 4,
                        "citiesRemaining": 4,
                        "devCards": ["victoryPoint"],
                        "devCardsBoughtThisTurn": [],
                        "devCardsPlayedThisTurn": 1,
                        "knightsPlayed": 1
                    },
                    "1": {
                        "resources": player_one_resources,
                        "victoryPoints": 2,
                        "roadsRemaining": 14,
                        "settlementsRemaining": 5,
                        "citiesRemaining": 3,
                        "devCards": ["roadBuilding", "monopoly"],
                        "devCardsBoughtThisTurn": ["roadBuilding", "monopoly"],
                        "devCardsPlayedThisTurn": 0,
                        "knightsPlayed": 0
                    }
                },
                "turn": {
                    "phase": "postRoll",
                    "hasRolled": true,
                    "lastRollTotal": 8,
                    "pendingDiscards": [],
                    "currentPlayerId": "1"
                },
                "robberTileId": 9,
                "devDeck": cards(&[("knight", 13), ("victoryPoint", 4), ("roadBuilding", 1), ("yearOfPlenty", 2), ("monopoly", 1)])
            },
            "tiles": standard_tiles(),
            "modeId": "duel",
            "rulesetId": "duel",
            "boardSourceId": "settlegraph-v2-native-v1",
            "diceRoll": [4, 4],
            "diceState": {
                "mode": "balanced",
                "deck": [],
                "cardsLeft": 34,
                "recentTotals": [6, 8],
                "sevensRolledByPlayer": { "0": 0, "1": 0 },
                "sevenStreak": { "playerId": null, "streakCount": 0 }
            },
            "devCardPlay": null,
            "robberReturnToStage": null,
            "gameLog": [
                { "id": 1, "turn": 5, "phase": "main", "type": "roll", "actorId": "0", "data": { "dice": [3, 3], "total": 6 } },
                { "id": 2, "turn": 5, "phase": "main", "type": "dev:buy", "actorId": "0", "data": {} },
                { "id": 3, "turn": 5, "phase": "main", "type": "dev:buy", "actorId": "0", "data": {} },
                { "id": 4, "turn": 5, "phase": "main", "type": "dev:play", "actorId": "0", "data": { "cardType": "knight" } },
                { "id": 5, "turn": 5, "phase": "main", "type": "turn:end", "actorId": "0", "data": {} },
                { "id": 6, "turn": 6, "phase": "main", "type": "roll", "actorId": "1", "data": { "dice": [4, 4], "total": 8 } },
                { "id": 7, "turn": 6, "phase": "main", "type": "dev:buy", "actorId": "1", "data": {} },
                { "id": 8, "turn": 6, "phase": "main", "type": "dev:buy", "actorId": "1", "data": {} }
            ],
            "gameLogSeq": 8
        },
        "ctx": {
            "numPlayers": 2,
            "turn": 6,
            "currentPlayer": "1",
            "playOrder": ["0", "1"],
            "phase": "main",
            "activePlayers": { "1": "postRoll" },
            "gameover": null
        }
    })
}

fn base_snapshot() -> WebsiteSnapshot {
    serde_json::from_value(base_snapshot_value()).expect("complete website snapshot")
}

#[test]
fn rejects_invalid_public_tile_numbers_before_inference() {
    for number in [1, 7, 13] {
        let mut snapshot = base_snapshot();
        snapshot.game.tiles[0].tile.number = Some(number);
        let error = import_snapshot(&snapshot, "1")
            .err()
            .expect("invalid production number must fail");
        assert!(error.contains("invalid production number"), "{error}");
    }

    let mut snapshot = base_snapshot();
    let desert = snapshot
        .game
        .tiles
        .iter_mut()
        .find(|tile| tile.tile.resource.as_deref() == Some("Desert"))
        .expect("desert tile");
    desert.tile.number = Some(6);
    let error = import_snapshot(&snapshot, "1")
        .err()
        .expect("numbered desert must fail");
    assert!(error.contains("invalid production number"), "{error}");
}

#[test]
fn imports_post_roll_state_history_ports_observation_and_legality() {
    let imported = import_snapshot(&base_snapshot(), "1").expect("import post-roll snapshot");
    let state = &imported.game.state;

    assert_eq!(imported.actor, 1);
    assert_eq!(imported.game.game_phase, GamePhase::Playing);
    assert_eq!(imported.game.turn_phase, TurnPhase::Main);
    assert_eq!(state.current_player, 1);
    assert_eq!(state.turn, 1);
    assert_eq!(state.tile_resources[0], 2); // native tile 0 <- website tile 11 Wood
    assert_eq!(state.tile_numbers[0], 8);
    assert_eq!(state.robber_tile, 9); // website tile 9 is native tile 9
    assert_eq!(state.vertices[0], 0); // website node 35, player 0 settlement
    assert_eq!(state.vertices[7], 5); // website node 46, player 1 city
    assert_eq!(state.edges[0], 0); // website edge 35,36
    assert_eq!(state.edges[10], 1); // website edge 45,46
    assert_eq!(state.resources[0], [1, 1, 1, 0, 0]);
    assert_eq!(state.resources[1], [1, 1, 1, 2, 3]);
    assert!(state.port_any[0]);
    assert!(state.port_resource[1][3]); // Brick 2:1 at native port slot 1
    assert_eq!(state.dev_cards[0], [0, 1, 0, 0, 0]);
    assert_eq!(state.dev_cards[1], [0, 0, 1, 0, 1]);
    assert_eq!(state.dev_cards_bought_this_turn, [0, 0, 1, 0, 1]);
    assert_eq!(state.dev_deck_idx, 4);

    assert_eq!(imported.game.public_history.rolls.len(), 2);
    assert_eq!(imported.game.public_history.rolls[0].player, 0);
    assert_eq!(imported.game.public_history.rolls[0].total, 6);
    assert_eq!(imported.game.public_history.dev_buys_by_player[0], 2);
    assert_eq!(imported.game.public_history.dev_buys_by_player[1], 2);
    assert_eq!(imported.game.public_history.dev_plays_by_player[0][0], 1);
    assert_eq!(imported.game.public_history.dev_buys_this_turn, 2);

    assert_eq!(
        &imported.observation[OPPONENT_RESOURCES..OPPONENT_RESOURCES + 5],
        &[1.0, 1.0, 1.0, 0.0, 0.0]
    );
    assert_eq!(imported.observation[RECENT_ROLLS + 3 * 12 + 5], 1.0);
    assert_eq!(imported.observation[RECENT_ROLLS + 4 * 12 + 7], 1.0);
    assert_eq!(imported.observation[VERTICES + 2], 1.0);
    assert_eq!(imported.observation[VERTICES + 7 * VERTEX_STRIDE + 1], 1.0);
    assert_eq!(
        imported.observation[SELF_PRIVATE..SELF_PRIVATE + 5],
        [1.0 / 19.0, 1.0 / 19.0, 1.0 / 19.0, 2.0 / 19.0, 3.0 / 19.0]
    );

    assert_eq!(imported.action_mask.len(), NUM_ACTIONS);
    assert!(imported.action_mask[240]); // Brick -> Wheat is legal with the 2:1 port.
    assert!(imported.action_mask[295]); // Buy development card.
    assert!(imported.action_mask[298]); // End turn.
}

#[test]
fn imports_the_serial_native_discard_actor_and_exact_remaining_count() {
    let mut value = base_snapshot_value();
    value["G"]["core"]["turn"] = json!({
        "phase": "robberDiscard",
        "hasRolled": true,
        "lastRollTotal": 7,
        "pendingDiscards": ["1"],
        "currentPlayerId": "1"
    });
    value["G"]["diceRoll"] = json!([3, 4]);
    value["G"]["gameLog"].as_array_mut().unwrap().push(json!({
        "id": 9, "turn": 6, "phase": "main", "type": "roll", "actorId": "1", "data": { "dice": [3, 4], "total": 7 }
    }));
    value["ctx"]["activePlayers"] = json!({ "1": "robberDiscard" });
    let snapshot: WebsiteSnapshot = serde_json::from_value(value).expect("discard snapshot");

    let imported = import_snapshot(&snapshot, "1").expect("import discard snapshot");
    assert_eq!(imported.game.turn_phase, TurnPhase::RobberDiscard);
    assert_eq!(imported.game.current_player(), 1);
    assert_eq!(imported.game.pending_discards, vec![(1, 4)]);
    for action in 203..208 {
        assert!(imported.action_mask[action]);
    }
    assert!(!imported.action_mask[298]);
}

#[test]
fn imports_setup_and_exposes_only_initial_settlement_actions() {
    let mut value = base_snapshot_value();
    value["G"]["core"]["phase"] = json!("placement");
    value["G"]["core"]["buildingsByNodeId"] = json!({});
    value["G"]["core"]["roadsByEdgeId"] = json!({});
    value["G"]["core"]["turn"] = json!({
        "phase": "preRoll",
        "hasRolled": false,
        "lastRollTotal": null,
        "pendingDiscards": [],
        "currentPlayerId": "0"
    });
    value["G"]["core"]["playerStateById"]["0"] = json!({
        "resources": [],
        "victoryPoints": 0,
        "roadsRemaining": 15,
        "settlementsRemaining": 5,
        "citiesRemaining": 4,
        "devCards": [],
        "devCardsBoughtThisTurn": [],
        "devCardsPlayedThisTurn": 0,
        "knightsPlayed": 0
    });
    value["G"]["core"]["playerStateById"]["1"] = value["G"]["core"]["playerStateById"]["0"].clone();
    value["G"]["core"]["bank"]["resources"] = Value::Array(cards(&[
        ("Wood", 19),
        ("Brick", 19),
        ("Sheep", 19),
        ("Wheat", 19),
        ("Ore", 19),
    ]));
    value["G"]["core"]["devDeck"] = Value::Array(cards(&[
        ("knight", 14),
        ("victoryPoint", 5),
        ("roadBuilding", 2),
        ("yearOfPlenty", 2),
        ("monopoly", 2),
    ]));
    value["G"]["diceRoll"] = json!([]);
    value["G"]["gameLog"] = json!([]);
    value["G"]["gameLogSeq"] = json!(0);
    value["ctx"]["turn"] = json!(0);
    value["ctx"]["currentPlayer"] = json!("1");
    value["ctx"]["phase"] = json!("placement");
    value["ctx"]["playOrder"] = json!(["0", "1", "1", "0"]);
    value["ctx"]["activePlayers"] = json!({ "1": "placementSettlement" });

    let snapshot: WebsiteSnapshot = serde_json::from_value(value).expect("setup snapshot");
    let imported = import_snapshot(&snapshot, "1").expect("import setup snapshot");

    assert_eq!(imported.game.game_phase, GamePhase::SetupForward);
    assert_eq!(imported.game.current_player(), 1);
    assert!(imported.action_mask[..54].iter().any(|legal| *legal));
    assert!(imported.action_mask[54..].iter().all(|legal| !*legal));
}

#[test]
fn imports_forced_roll_after_preroll_knight_and_road_building_continuation() {
    let mut must_roll_value = base_snapshot_value();
    must_roll_value["G"]["core"]["turn"] = json!({
        "phase": "preRoll",
        "hasRolled": false,
        "lastRollTotal": null,
        "pendingDiscards": [],
        "currentPlayerId": "1"
    });
    must_roll_value["G"]["core"]["playerStateById"]["1"]["devCardsPlayedThisTurn"] = json!(1);
    must_roll_value["G"]["diceRoll"] = json!([]);
    must_roll_value["ctx"]["activePlayers"] = json!({ "1": "preRoll" });
    let must_roll: WebsiteSnapshot =
        serde_json::from_value(must_roll_value).expect("must-roll snapshot");
    let imported = import_snapshot(&must_roll, "1").expect("import must-roll snapshot");

    assert_eq!(imported.game.turn_phase, TurnPhase::MustRoll);
    assert_eq!(
        imported
            .action_mask
            .iter()
            .enumerate()
            .filter_map(|(id, legal)| legal.then_some(id))
            .collect::<Vec<_>>(),
        vec![294]
    );

    let mut road_value = base_snapshot_value();
    road_value["G"]["devCardPlay"] = json!({
        "type": "roadBuilding",
        "playerId": "1",
        "pendingRoads": 2
    });
    road_value["G"]["core"]["playerStateById"]["1"]["devCards"] = json!(["monopoly"]);
    road_value["G"]["core"]["playerStateById"]["1"]["devCardsBoughtThisTurn"] = json!(["monopoly"]);
    road_value["G"]["core"]["playerStateById"]["1"]["devCardsPlayedThisTurn"] = json!(1);
    road_value["ctx"]["activePlayers"] = json!({ "1": "roadBuilding" });
    let road_snapshot: WebsiteSnapshot =
        serde_json::from_value(road_value).expect("Road Building snapshot");
    let imported = import_snapshot(&road_snapshot, "1").expect("import Road Building continuation");

    assert_eq!(imported.game.turn_phase, TurnPhase::RoadBuilding);
    assert_eq!(imported.game.roads_to_place, 2);
    assert!(imported.action_mask[108..180].iter().any(|legal| *legal));
    assert!(imported.action_mask[..108]
        .iter()
        .chain(imported.action_mask[180..].iter())
        .all(|legal| !*legal));
}

#[test]
fn selects_only_the_highest_scoring_legal_action_with_a_stable_tie_break() {
    let mut logits = [0.0; NUM_ACTIONS];
    let mut mask = [false; NUM_ACTIONS];
    mask[7] = true;
    mask[240] = true;
    mask[298] = true;
    logits[7] = 12.0;
    logits[240] = 14.0;
    logits[298] = 14.0;

    assert_eq!(select_highest_legal(&logits, &mask), Some(240));
    mask[240] = false;
    assert_eq!(select_highest_legal(&logits, &mask), Some(298));
    mask.fill(false);
    assert_eq!(select_highest_legal(&logits, &mask), None);
}

#[test]
fn translates_native_actions_to_existing_website_move_payloads() {
    let imported = import_snapshot(&base_snapshot(), "1").expect("import post-roll snapshot");
    let game = &imported.game;
    let topology = &imported.topology;

    let bank_trade = plan_for_action(
        game,
        topology,
        &Action::TradeWithBank {
            player: 1,
            give: 3,
            recv: 0,
        },
    )
    .expect("bank trade plan");
    assert_eq!(bank_trade[0].move_name, "maritimeTrade");
    assert_eq!(
        bank_trade[0].args,
        vec![json!({ "give": ["Brick", "Brick"], "receive": ["Wheat"] })]
    );

    let year_of_plenty = plan_for_action(
        game,
        topology,
        &Action::PlayYearOfPlenty {
            player: 1,
            r1: 0,
            r2: 4,
        },
    )
    .expect("Year of Plenty plan");
    assert_eq!(year_of_plenty[0].move_name, "playDevCardStart");
    assert_eq!(year_of_plenty[0].args, vec![json!("yearOfPlenty")]);
    assert_eq!(year_of_plenty[1].move_name, "confirmDevCardPlay");
    assert_eq!(year_of_plenty[1].args, vec![json!(["Wheat", "Ore"])]);

    let monopoly = plan_for_action(
        game,
        topology,
        &Action::PlayMonopoly {
            player: 1,
            resource: 3,
        },
    )
    .expect("Monopoly plan");
    assert_eq!(monopoly[0].args, vec![json!("monopoly")]);
    assert_eq!(monopoly[1].args, vec![json!("Brick")]);

    let settlement = plan_for_action(
        game,
        topology,
        &Action::BuildSettlement {
            player: 1,
            vertex: 0,
        },
    )
    .expect("settlement plan");
    assert_eq!(settlement[0].move_name, "placeSettlement");
    assert_eq!(settlement[0].args, vec![json!(35)]);

    let road = plan_for_action(
        game,
        topology,
        &Action::BuildRoad {
            player: 1,
            edge: 10,
        },
    )
    .expect("road plan");
    assert_eq!(road[0].move_name, "placeRoad");
    assert_eq!(road[0].args, vec![json!("45,46")]);

    let robber = plan_for_action(game, topology, &Action::MoveRobber { player: 1, tile: 9 })
        .expect("robber plan");
    assert_eq!(robber[0].move_name, "moveRobber");
    assert_eq!(robber[0].args, vec![json!(9)]);

    assert!(plan_for_action(
        game,
        topology,
        &Action::ProposeTrade {
            player: 1,
            give: 3,
            give_amount: 1,
            recv: 0,
        },
    )
    .expect_err("duel player trade must not map")
    .contains("player-trade"));
}

#[test]
fn combines_repeated_native_discard_decisions_into_one_website_move() {
    let mut value = base_snapshot_value();
    value["G"]["core"]["turn"] = json!({
        "phase": "robberDiscard",
        "hasRolled": true,
        "lastRollTotal": 7,
        "pendingDiscards": ["1"],
        "currentPlayerId": "1"
    });
    value["G"]["diceRoll"] = json!([3, 4]);
    value["ctx"]["activePlayers"] = json!({ "1": "robberDiscard" });
    let snapshot: WebsiteSnapshot = serde_json::from_value(value).expect("discard snapshot");
    let mut imported = import_snapshot(&snapshot, "1").expect("import discard snapshot");

    let (planned, action_ids) = collect_discard_plan_with(&mut imported.game, 1, |_, mask| {
        mask.iter()
            .position(|legal| *legal)
            .ok_or_else(|| "no legal discard".to_owned())
    })
    .expect("discard plan");

    assert_eq!(action_ids, vec![203, 204, 205, 206]);
    assert_eq!(planned.move_name, "discardResources");
    assert_eq!(
        planned.args,
        vec![json!(["Wheat", "Sheep", "Wood", "Brick"])]
    );
    assert_eq!(imported.game.turn_phase, TurnPhase::RobberMove);
}

#[test]
#[ignore = "requires the external sealed CTNN-v2 artifact"]
fn sealed_model_decision_is_deterministic_and_legal_for_imported_state() {
    let model_path =
        "/Users/david/Documents/ChatGPT/settlex-v2-production-2026-08-25/accepted/accepted-v2.ctnn";
    let verified = load_verified_model(Path::new(model_path)).expect("load sealed CTNN-v2");
    let mut engine = DecisionEngine::new(verified);
    let snapshot: WebsiteSnapshot =
        serde_json::from_value(base_snapshot_value()).expect("website snapshot");

    let first = import_snapshot(&snapshot, "1").expect("first import");
    let first_mask = first.action_mask;
    let first_decision = engine.decide(first).expect("first decision");

    let second = import_snapshot(&snapshot, "1").expect("second import");
    let second_decision = engine.decide(second).expect("second decision");

    assert_eq!(first_decision.action_ids, second_decision.action_ids);
    assert_eq!(first_decision.planned_moves, second_decision.planned_moves);
    assert!(!first_decision.action_ids.is_empty());
    for action_id in first_decision.action_ids {
        assert!(
            first_mask[action_id],
            "model selected illegal action {action_id}"
        );
        assert!(
            !(248..=294).contains(&action_id),
            "duel integration cannot dispatch player trade action {action_id}"
        );
    }
}
