use std::collections::BTreeMap;

use catan_core::balanced_dice::BalancedDiceState;
use catan_core::board::{
    topology, NUM_EDGES, NUM_PORTS, NUM_TILES, NUM_VERTICES, RESOURCE_BRICK, RESOURCE_DESERT,
    RESOURCE_SHEEP, RESOURCE_STONE, RESOURCE_WHEAT, RESOURCE_WOOD,
};
use catan_core::building::longest_road_length;
use catan_core::game::{CatanGame, GamePhase, PublicRoll, TurnPhase};
use catan_core::rules::GameRules;
use catan_core::state::{
    DEV_DECK_SIZE, DEV_KNIGHT, DEV_MONOPOLY, DEV_ROAD_BUILDING, DEV_VICTORY_POINT,
    DEV_YEAR_OF_PLENTY, NUM_DEV_CARD_TYPES, NUM_RESOURCES,
};
use catan_env_contract::{encode_obs_v2, fill_action_mask, NUM_ACTIONS, OBS_V2_DIM};

use crate::protocol::{WebsiteGameLogEntry, WebsiteSnapshot, WebsiteTile};
use crate::topology::{TopologyMap, WebsiteLandTile};

pub const EXPECTED_BOARD_SOURCE_ID: &str = "settlegraph-v2-native-v1";

pub struct ImportedSnapshot {
    pub game: CatanGame,
    pub topology: TopologyMap,
    pub actor: usize,
    pub observation: [f32; OBS_V2_DIM],
    pub action_mask: [bool; NUM_ACTIONS],
}

fn seat_of(players: &[String], player_id: &str) -> Result<usize, String> {
    players
        .iter()
        .position(|candidate| candidate == player_id)
        .ok_or_else(|| format!("unknown website player id {player_id:?}"))
}

fn resource_index(resource: &str) -> Result<usize, String> {
    match resource {
        "Wheat" => Ok(RESOURCE_WHEAT as usize),
        "Sheep" => Ok(RESOURCE_SHEEP as usize),
        "Wood" => Ok(RESOURCE_WOOD as usize),
        "Brick" => Ok(RESOURCE_BRICK as usize),
        "Ore" => Ok(RESOURCE_STONE as usize),
        _ => Err(format!("unsupported website resource {resource:?}")),
    }
}

fn tile_resource(resource: &str) -> Result<i8, String> {
    if resource == "Desert" {
        Ok(RESOURCE_DESERT)
    } else {
        resource_index(resource).map(|index| index as i8)
    }
}

fn port_type(resource: &str) -> Result<i8, String> {
    if resource == "Any" {
        Ok(0)
    } else {
        resource_index(resource).map(|index| index as i8 + 1)
    }
}

fn dev_card_index(card: &str) -> Result<usize, String> {
    match card {
        "knight" => Ok(DEV_KNIGHT),
        "victoryPoint" => Ok(DEV_VICTORY_POINT),
        "roadBuilding" => Ok(DEV_ROAD_BUILDING),
        "yearOfPlenty" => Ok(DEV_YEAR_OF_PLENTY),
        "monopoly" => Ok(DEV_MONOPOLY),
        _ => Err(format!("unsupported website development card {card:?}")),
    }
}

fn count_resources(resources: &[String]) -> Result<[i16; NUM_RESOURCES], String> {
    let mut counts = [0; NUM_RESOURCES];
    for resource in resources {
        let index = resource_index(resource)?;
        counts[index] += 1;
    }
    Ok(counts)
}

fn count_dev_cards(cards: &[String]) -> Result<[i8; NUM_DEV_CARD_TYPES], String> {
    let mut counts = [0i8; NUM_DEV_CARD_TYPES];
    for card in cards {
        let index = dev_card_index(card)?;
        counts[index] = counts[index]
            .checked_add(1)
            .ok_or_else(|| format!("too many development cards of type {card:?}"))?;
    }
    Ok(counts)
}

fn land_nodes(tile: &WebsiteTile) -> Result<[i32; 6], String> {
    let object = tile
        .tile
        .nodes
        .as_object()
        .ok_or_else(|| format!("land tile {} nodes must be an object", tile.tile.id))?;
    let mut nodes = [0; 6];
    for (index, direction) in [
        "NORTH",
        "NORTHEAST",
        "SOUTHEAST",
        "SOUTH",
        "SOUTHWEST",
        "NORTHWEST",
    ]
    .iter()
    .enumerate()
    {
        let value = object
            .get(*direction)
            .and_then(|value| value.as_i64())
            .ok_or_else(|| {
                format!(
                    "land tile {} is missing integer node {direction}",
                    tile.tile.id
                )
            })?;
        nodes[index] = i32::try_from(value)
            .map_err(|_| format!("website node {value} is outside i32 range"))?;
    }
    Ok(nodes)
}

fn port_nodes(tile: &WebsiteTile) -> Result<[i32; 2], String> {
    let nodes = tile
        .tile
        .nodes
        .as_array()
        .ok_or_else(|| format!("port tile {} nodes must be an array", tile.tile.id))?;
    if nodes.len() != 2 {
        return Err(format!(
            "port tile {} must attach to two nodes, received {}",
            tile.tile.id,
            nodes.len()
        ));
    }
    let parse = |value: &serde_json::Value| {
        let value = value
            .as_i64()
            .ok_or_else(|| format!("port tile {} has a non-integer node", tile.tile.id))?;
        i32::try_from(value).map_err(|_| format!("website node {value} is outside i32 range"))
    };
    Ok([parse(&nodes[0])?, parse(&nodes[1])?])
}

fn canonical_edge([a, b]: [i32; 2]) -> (i32, i32) {
    if a < b {
        (a, b)
    } else {
        (b, a)
    }
}

fn parse_website_edge(edge: &str) -> Result<[i32; 2], String> {
    let mut parts = edge.split(',');
    let a = parts
        .next()
        .ok_or_else(|| format!("invalid website edge id {edge:?}"))?
        .parse::<i32>()
        .map_err(|_| format!("invalid website edge id {edge:?}"))?;
    let b = parts
        .next()
        .ok_or_else(|| format!("invalid website edge id {edge:?}"))?
        .parse::<i32>()
        .map_err(|_| format!("invalid website edge id {edge:?}"))?;
    if parts.next().is_some() || a == b {
        return Err(format!("invalid website edge id {edge:?}"));
    }
    Ok([a, b])
}

fn validate_contract(snapshot: &WebsiteSnapshot) -> Result<(), String> {
    let game = &snapshot.game;
    let core = &game.core;
    let rules = &core.ruleset;
    if snapshot.ctx.num_players != 2
        || core.players != ["0".to_owned(), "1".to_owned()]
        || snapshot.ctx.play_order != core.players
    {
        return Err("SettleGraph V2 requires website seats [\"0\", \"1\"]".to_owned());
    }
    if game.mode_id != "duel" || game.ruleset_id != "duel" {
        return Err("SettleGraph V2 requires the duel mode and duel ruleset".to_owned());
    }
    if game.board_source_id != EXPECTED_BOARD_SOURCE_ID {
        return Err(format!(
            "SettleGraph V2 requires board source {EXPECTED_BOARD_SOURCE_ID:?}, received {:?}",
            game.board_source_id
        ));
    }
    if rules.victory_points_to_win != 15
        || rules.discard_limit != 9
        || rules.dice_mode != "balanced"
        || !rules.friendly_robber.enabled
        || rules.friendly_robber.vp_threshold != 2
        || rules.allow_player_trades
        || !rules.dev_cards_enabled
        || rules.piece_limits.roads != 15
        || rules.piece_limits.settlements != 5
        || rules.piece_limits.cities != 4
    {
        return Err(
            "website rules do not match the two-player target-15 SettleGraph V2 contract"
                .to_owned(),
        );
    }
    Ok(())
}

type ImportedBoard = (
    TopologyMap,
    [i8; NUM_TILES],
    [i8; NUM_TILES],
    [i8; NUM_PORTS],
);

fn import_topology_and_board(snapshot: &WebsiteSnapshot) -> Result<ImportedBoard, String> {
    let mut land = Vec::new();
    let mut land_by_id = BTreeMap::new();
    let mut ports = Vec::new();
    for tile in &snapshot.game.tiles {
        match tile.kind.as_str() {
            "Land" => {
                let website = WebsiteLandTile {
                    id: tile.tile.id,
                    coordinate: tile.coordinate,
                    nodes: land_nodes(tile)?,
                };
                if land_by_id.insert(tile.tile.id, tile).is_some() {
                    return Err(format!("website repeats land tile id {}", tile.tile.id));
                }
                land.push(website);
            }
            "Port" => ports.push((port_nodes(tile)?, tile)),
            other => {
                return Err(format!(
                    "SettleGraph V2 board contains unsupported tile type {other:?}"
                ))
            }
        }
    }

    let topology_map = TopologyMap::from_land_tiles(&land)?;
    let port_edges: Vec<_> = ports.iter().map(|(nodes, _)| *nodes).collect();
    topology_map.validate_native_port_edges(&port_edges)?;

    let mut tile_resources = [0; NUM_TILES];
    let mut tile_numbers = [0; NUM_TILES];
    for native_tile in 0..NUM_TILES {
        let website_id = topology_map.native_to_website_tile[native_tile];
        let website = land_by_id
            .get(&website_id)
            .ok_or_else(|| format!("missing website land tile {website_id}"))?;
        let resource = website
            .tile
            .resource
            .as_deref()
            .ok_or_else(|| format!("website land tile {website_id} has no resource"))?;
        tile_resources[native_tile] = tile_resource(resource)?;
        tile_numbers[native_tile] = website.tile.number.unwrap_or(0).try_into().map_err(|_| {
            format!(
                "website land tile {website_id} number {:?} is outside i8 range",
                website.tile.number
            )
        })?;
    }

    let expected_ports = topology_map.native_port_website_vertices();
    let mut port_types = [-1; NUM_PORTS];
    for (native_port, edge) in expected_ports.into_iter().enumerate() {
        let (_, website) = ports
            .iter()
            .find(|(nodes, _)| canonical_edge(*nodes) == canonical_edge(edge))
            .ok_or_else(|| format!("website is missing native port slot {native_port}"))?;
        let resource = website
            .tile
            .resource
            .as_deref()
            .ok_or_else(|| format!("port tile {} has no resource", website.tile.id))?;
        port_types[native_port] = port_type(resource)?;
    }

    let desert_count = tile_resources
        .iter()
        .filter(|resource| **resource == RESOURCE_DESERT)
        .count();
    if desert_count != 1 {
        return Err(format!(
            "SettleGraph V2 board must contain one desert, received {desert_count}"
        ));
    }
    Ok((topology_map, tile_resources, tile_numbers, port_types))
}

fn import_public_history(
    game: &mut CatanGame,
    players: &[String],
    log: &[WebsiteGameLogEntry],
    dev_buys_this_turn: usize,
) -> Result<(), String> {
    game.public_history.rolls.clear();
    game.public_history.dev_buys_by_player.fill(0);
    game.public_history
        .dev_plays_by_player
        .fill([0; NUM_DEV_CARD_TYPES]);
    game.public_history.dev_buys_this_turn = u8::try_from(dev_buys_this_turn)
        .map_err(|_| "too many development-card buys in the current turn".to_owned())?;

    let mut normal_turns = 0u32;
    for entry in log {
        match entry.kind.as_str() {
            "roll" => {
                let actor = entry
                    .actor_id
                    .as_deref()
                    .ok_or_else(|| "roll log entry has no actor".to_owned())?;
                let player = seat_of(players, actor)?;
                let total = entry
                    .data
                    .get("total")
                    .and_then(|value| value.as_u64())
                    .ok_or_else(|| "roll log entry has no total".to_owned())?;
                let total = u8::try_from(total)
                    .map_err(|_| format!("roll total {total} is outside u8 range"))?;
                if !(2..=12).contains(&total) {
                    return Err(format!("roll total {total} is outside 2..=12"));
                }
                game.public_history.rolls.push(PublicRoll {
                    player: player as u8,
                    total,
                });
            }
            "dev:buy" => {
                let actor = entry
                    .actor_id
                    .as_deref()
                    .ok_or_else(|| "development-card buy log has no actor".to_owned())?;
                let player = seat_of(players, actor)?;
                game.public_history.dev_buys_by_player[player] =
                    game.public_history.dev_buys_by_player[player]
                        .checked_add(1)
                        .ok_or_else(|| "development-card buy history overflow".to_owned())?;
            }
            "dev:play" => {
                let actor = entry
                    .actor_id
                    .as_deref()
                    .ok_or_else(|| "development-card play log has no actor".to_owned())?;
                let player = seat_of(players, actor)?;
                let card = entry
                    .data
                    .get("cardType")
                    .and_then(|value| value.as_str())
                    .ok_or_else(|| "development-card play log has no cardType".to_owned())?;
                let card = dev_card_index(card)?;
                game.public_history.dev_plays_by_player[player][card] =
                    game.public_history.dev_plays_by_player[player][card]
                        .checked_add(1)
                        .ok_or_else(|| "development-card play history overflow".to_owned())?;
            }
            "turn:end" => {
                let placement = entry.phase.as_deref() == Some("placement")
                    || entry.data.get("phase").and_then(|value| value.as_str())
                        == Some("placement");
                if !placement {
                    normal_turns = normal_turns
                        .checked_add(1)
                        .ok_or_else(|| "normal turn history overflow".to_owned())?;
                }
            }
            _ => {}
        }
    }
    game.state.turn = normal_turns;
    game.state.balanced_dice = BalancedDiceState::from_public_roll_iter(
        game.public_history
            .rolls
            .iter()
            .map(|roll| (roll.player as usize, roll.total)),
    );
    Ok(())
}

pub fn import_snapshot(
    snapshot: &WebsiteSnapshot,
    actor_id: &str,
) -> Result<ImportedSnapshot, String> {
    validate_contract(snapshot)?;
    let core = &snapshot.game.core;
    let players = &core.players;
    let actor = seat_of(players, actor_id)?;
    let current_player = seat_of(players, &core.turn.current_player_id)?;
    let context_player = seat_of(players, &snapshot.ctx.current_player)?;
    if current_player != context_player {
        return Err(format!(
            "website core/context current-player mismatch: {current_player} != {context_player}"
        ));
    }

    let (topology_map, tile_resources, tile_numbers, port_types) =
        import_topology_and_board(snapshot)?;

    if core.dev_deck.len() > DEV_DECK_SIZE {
        return Err(format!(
            "website development deck has {} cards, maximum is {DEV_DECK_SIZE}",
            core.dev_deck.len()
        ));
    }
    let dev_deck_idx = DEV_DECK_SIZE - core.dev_deck.len();
    let mut dev_deck = [0; DEV_DECK_SIZE];
    for (offset, card) in core.dev_deck.iter().enumerate() {
        dev_deck[dev_deck_idx + offset] = dev_card_index(card)? as i8;
    }

    let rules = GameRules::settlex_duel(15);
    let mut game = CatanGame::from_replay_with_rules(
        2,
        tile_resources,
        tile_numbers,
        port_types,
        dev_deck,
        rules,
    );
    let state = &mut game.state;
    state.dev_deck_idx = dev_deck_idx;
    state.max_roads = core.ruleset.piece_limits.roads;
    state.max_settlements = core.ruleset.piece_limits.settlements;
    state.max_cities = core.ruleset.piece_limits.cities;
    state.current_player = current_player;
    state.has_rolled = core.turn.has_rolled;
    state.dice_roll = core
        .turn
        .last_roll_total
        .unwrap_or(0)
        .try_into()
        .map_err(|_| "website last roll is outside u8 range".to_owned())?;

    let robber_tile = core
        .robber_tile_id
        .ok_or_else(|| "website snapshot has no robber tile".to_owned())?;
    state.robber_tile = topology_map
        .website_tile_to_native(robber_tile)
        .ok_or_else(|| format!("website robber tile {robber_tile} is not a land tile"))?;

    state.vertices.fill(-1);
    let mut board_settlements = [0u8; 2];
    let mut board_cities = [0u8; 2];
    for (website_node, building) in &core.buildings_by_node_id {
        let website_node = website_node
            .parse::<i32>()
            .map_err(|_| format!("invalid website node id {website_node:?}"))?;
        let native_node = topology_map
            .website_vertex_to_native(website_node)
            .ok_or_else(|| format!("website building node {website_node} is not on land"))?
            as usize;
        let owner = seat_of(players, &building.owner_id)?;
        state.vertices[native_node] = match building.kind.as_str() {
            "settlement" => {
                board_settlements[owner] += 1;
                owner as i8
            }
            "city" => {
                board_cities[owner] += 1;
                owner as i8 + 4
            }
            other => return Err(format!("unsupported website building type {other:?}")),
        };
    }

    state.edges.fill(-1);
    let mut board_roads = [0u8; 2];
    for (website_edge, owner_id) in &core.roads_by_edge_id {
        let [a, b] = parse_website_edge(website_edge)?;
        let native_edge = topology_map
            .website_edge_to_native(a, b)
            .ok_or_else(|| format!("website road edge {website_edge:?} is not on land"))?
            as usize;
        let owner = seat_of(players, owner_id)?;
        state.edges[native_edge] = owner as i8;
        board_roads[owner] += 1;
    }

    for player in 0..2 {
        let website = core
            .player_state_by_id
            .get(&players[player])
            .ok_or_else(|| format!("website snapshot has no state for player {player}"))?;
        state.resources[player] = count_resources(&website.resources)?;
        state.dev_cards[player] = count_dev_cards(&website.dev_cards)?;
        state.knights_played[player] = website.knights_played;
        state.settlements_built[player] = state
            .max_settlements
            .checked_sub(website.settlements_remaining)
            .ok_or_else(|| format!("player {player} has invalid settlementsRemaining"))?;
        state.cities_built[player] = state
            .max_cities
            .checked_sub(website.cities_remaining)
            .ok_or_else(|| format!("player {player} has invalid citiesRemaining"))?;
        state.roads_built[player] = state
            .max_roads
            .checked_sub(website.roads_remaining)
            .ok_or_else(|| format!("player {player} has invalid roadsRemaining"))?;
        if state.settlements_built[player] != board_settlements[player]
            || state.cities_built[player] != board_cities[player]
            || state.roads_built[player] != board_roads[player]
        {
            return Err(format!(
                "player {player} piece counters do not match the website board"
            ));
        }
    }
    state.bank = count_resources(&core.bank.resources)?;

    let current = core
        .player_state_by_id
        .get(&players[current_player])
        .ok_or_else(|| "website snapshot has no current-player state".to_owned())?;
    state.dev_cards_bought_this_turn = count_dev_cards(&current.dev_cards_bought_this_turn)?;
    state.dev_card_played_this_turn = current.dev_cards_played_this_turn > 0;

    let native_topology = topology();
    state.occupied_mask = 0;
    state.vertex_road_mask.fill(0);
    state.port_any.fill(false);
    state.port_resource.fill([false; NUM_RESOURCES]);
    for native_vertex in 0..NUM_VERTICES {
        let building = state.vertices[native_vertex];
        if building < 0 {
            continue;
        }
        state.occupied_mask |= 1u64 << native_vertex;
        let owner = (building % 4) as usize;
        let port = state.vertex_port_type(native_vertex);
        if port == 0 {
            state.port_any[owner] = true;
        } else if port > 0 {
            state.port_resource[owner][(port - 1) as usize] = true;
        }
    }
    for native_edge in 0..NUM_EDGES {
        let owner = state.edges[native_edge];
        if owner < 0 {
            continue;
        }
        let [a, b] = native_topology.edge_vertices[native_edge];
        state.vertex_road_mask[owner as usize] |= (1u64 << a) | (1u64 << b);
    }
    for player in 0..2 {
        state.road_lengths[player] = longest_road_length(state, player) as u8;
    }

    state.longest_road_player = match core.awards.longest_road_owner_id.as_deref() {
        Some(player) => seat_of(players, player)? as i8,
        None => -1,
    };
    state.longest_road_length = if state.longest_road_player >= 0 {
        state.road_lengths[state.longest_road_player as usize]
    } else {
        0
    };
    state.largest_army_player = match core.awards.largest_army_owner_id.as_deref() {
        Some(player) => seat_of(players, player)? as i8,
        None => -1,
    };
    state.largest_army_size = state.knights_played[..2].iter().copied().max().unwrap_or(0);

    let is_finished = core.game_over.is_some() || snapshot.ctx.gameover.is_some();
    if is_finished {
        game.game_phase = GamePhase::Finished;
        state.phase = 2;
        state.winner = match core.game_over.as_ref() {
            Some(game_over) => seat_of(players, &game_over.winner_id)? as i8,
            None => -1,
        };
    } else if snapshot.ctx.phase == "placement" || core.phase == "placement" {
        let total_roads: u8 = state.roads_built[..2].iter().sum();
        game.game_phase = if total_roads < 2 {
            GamePhase::SetupForward
        } else {
            GamePhase::SetupBackward
        };
        game.setup_player_idx = context_player as i32;
        state.phase = 0;
        // The pinned native engine uses setup_player_idx for the actor and
        // leaves state.current_player at seat zero throughout setup.
        state.current_player = 0;
    } else {
        game.game_phase = GamePhase::Playing;
        state.phase = 1;
        if let Some(dev_play) = &snapshot.game.dev_card_play {
            if dev_play.kind == "roadBuilding" {
                if seat_of(players, &dev_play.player_id)? != current_player {
                    return Err("Road Building owner is not the current player".to_owned());
                }
                game.turn_phase = TurnPhase::RoadBuilding;
                game.roads_to_place = dev_play.pending_roads;
            } else {
                return Err(format!(
                    "split website development-card choice {:?} cannot be reconstructed exactly",
                    dev_play.kind
                ));
            }
        } else {
            game.turn_phase = match core.turn.phase.as_str() {
                "preRoll" if state.dev_card_played_this_turn => TurnPhase::MustRoll,
                "preRoll" => TurnPhase::PreRoll,
                "postRoll" => TurnPhase::Main,
                "robberDiscard" => TurnPhase::RobberDiscard,
                "robberMove" => TurnPhase::RobberMove,
                "robberSteal" => TurnPhase::RobberSteal,
                other => return Err(format!("unsupported website turn phase {other:?}")),
            };
        }
    }

    game.post_robber_phase = if snapshot.game.robber_return_to_stage.as_deref() == Some("preRoll")
        || !state.has_rolled
    {
        TurnPhase::MustRoll
    } else {
        TurnPhase::Main
    };
    game.pending_discards.clear();
    for player_id in &core.turn.pending_discards {
        let player = seat_of(players, player_id)?;
        game.pending_discards
            .push((player, (state.total_resources(player) / 2) as u8));
    }
    game.discard_idx = 0;

    let dev_buys_this_turn = current.dev_cards_bought_this_turn.len();
    import_public_history(
        &mut game,
        players,
        &snapshot.game.game_log,
        dev_buys_this_turn,
    )?;

    if game.game_phase != GamePhase::Finished && game.current_player() != actor {
        return Err(format!(
            "SettleGraph V2 request actor {actor} is not the native actor {}",
            game.current_player()
        ));
    }

    let mut observation = [0.0; OBS_V2_DIM];
    encode_obs_v2(&game, actor, &mut observation);
    let mut action_mask = [false; NUM_ACTIONS];
    let mut action_scratch = Vec::with_capacity(NUM_ACTIONS);
    fill_action_mask(&game, &mut action_scratch, &mut action_mask);

    Ok(ImportedSnapshot {
        game,
        topology: topology_map,
        actor,
        observation,
        action_mask,
    })
}
