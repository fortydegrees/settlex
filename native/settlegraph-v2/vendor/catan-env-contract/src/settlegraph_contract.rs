//! Canonical SettleGraph topology, action-descriptor, and symmetry contract.
//!
//! The action codec and board geometry remain the authorities. This module
//! projects them into immutable arrays for model runtimes and Python tooling.

use std::collections::{BTreeMap, BTreeSet};
use std::sync::OnceLock;

use catan_core::board::{topology, NUM_EDGES, NUM_TILES, NUM_VERTICES};
use catan_core::game::{Action, CatanGame};
use catan_core::state::{DEV_KNIGHT, DEV_MONOPOLY, DEV_ROAD_BUILDING, DEV_YEAR_OF_PLENTY};
use sha2::{Digest, Sha256};

use crate::codec::{decode_action, CODEC_VERSION, NUM_ACTIONS};
use crate::obs_v2::OBS_V2_VERSION;

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
#[repr(u8)]
pub enum ActionFamily {
    Settlement = 0,
    City = 1,
    Road = 2,
    Robber = 3,
    Steal = 4,
    StealSkip = 5,
    Discard = 6,
    Monopoly = 7,
    YearOfPlenty = 8,
    BankTrade = 9,
    ProposeTrade = 10,
    RespondTrade = 11,
    ConfirmTrade = 12,
    ConfirmCancel = 13,
    Roll = 14,
    BuyDev = 15,
    Knight = 16,
    RoadBuilding = 17,
    EndTurn = 18,
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
#[repr(u8)]
pub enum LocationKind {
    None = 0,
    Tile = 1,
    Vertex = 2,
    Edge = 3,
    Player = 4,
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
#[repr(u8)]
pub enum ActionMode {
    Settlement = 0,
    City = 1,
    Road = 2,
    Robber = 3,
    Steal = 4,
    StealSkip = 5,
    Discard = 6,
    Monopoly = 7,
    YearOfPlenty = 8,
    BankTrade = 9,
    ProposeOne = 10,
    ProposeTwo = 11,
    RespondAccept = 12,
    RespondReject = 13,
    ConfirmTrade = 14,
    ConfirmCancel = 15,
    Roll = 16,
    BuyDev = 17,
    Knight = 18,
    RoadBuilding = 19,
    EndTurn = 20,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ActionDescriptor {
    pub action_id: u16,
    pub family: ActionFamily,
    pub location_kind: LocationKind,
    pub primary_index: i16,
    pub target_player_slot: i8,
    pub give_resources: [u8; 5],
    pub receive_resources: [u8; 5],
    pub development_type: i8,
    pub mode: u8,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BoardSymmetry {
    pub tiles: [u8; NUM_TILES],
    pub vertices: [u8; NUM_VERTICES],
    pub edges: [u8; NUM_EDGES],
    pub actions: [u16; NUM_ACTIONS],
}

pub struct SettleGraphTopology {
    pub tile_neighbors: [[i8; 6]; NUM_TILES],
    pub tile_vertices: [[u8; 6]; NUM_TILES],
    pub tile_edges: [[i8; 6]; NUM_TILES],
    pub vertex_neighbors: [[i8; 3]; NUM_VERTICES],
    pub vertex_tiles: [[i8; 3]; NUM_VERTICES],
    pub vertex_edges: [[i8; 3]; NUM_VERTICES],
    pub edge_vertices: [[u8; 2]; NUM_EDGES],
    pub edge_tiles: [[i8; 2]; NUM_EDGES],
    pub tile_static: [[f32; 2]; NUM_TILES],
    pub vertex_static: [[f32; 2]; NUM_VERTICES],
    pub edge_static: [[f32; 2]; NUM_EDGES],
}

fn one_resource(resource: usize, amount: u8) -> [u8; 5] {
    let mut values = [0; 5];
    values[resource] = amount;
    values
}

fn describe_action(action_id: usize, action: Action) -> ActionDescriptor {
    let mut descriptor = ActionDescriptor {
        action_id: action_id as u16,
        family: ActionFamily::EndTurn,
        location_kind: LocationKind::None,
        primary_index: -1,
        target_player_slot: -1,
        give_resources: [0; 5],
        receive_resources: [0; 5],
        development_type: -1,
        mode: ActionMode::EndTurn as u8,
    };
    match action {
        Action::PlaceInitialSettlement { vertex, .. } | Action::BuildSettlement { vertex, .. } => {
            descriptor.family = ActionFamily::Settlement;
            descriptor.location_kind = LocationKind::Vertex;
            descriptor.primary_index = vertex as i16;
            descriptor.mode = ActionMode::Settlement as u8;
        }
        Action::BuildCity { vertex, .. } => {
            descriptor.family = ActionFamily::City;
            descriptor.location_kind = LocationKind::Vertex;
            descriptor.primary_index = vertex as i16;
            descriptor.mode = ActionMode::City as u8;
        }
        Action::PlaceInitialRoad { edge, .. } | Action::BuildRoad { edge, .. } => {
            descriptor.family = ActionFamily::Road;
            descriptor.location_kind = LocationKind::Edge;
            descriptor.primary_index = edge as i16;
            descriptor.mode = ActionMode::Road as u8;
        }
        Action::MoveRobber { tile, .. } => {
            descriptor.family = ActionFamily::Robber;
            descriptor.location_kind = LocationKind::Tile;
            descriptor.primary_index = tile as i16;
            descriptor.mode = ActionMode::Robber as u8;
        }
        Action::StealResource { victim, .. } if victim < 0 => {
            descriptor.family = ActionFamily::StealSkip;
            descriptor.mode = ActionMode::StealSkip as u8;
        }
        Action::StealResource { victim, .. } => {
            descriptor.family = ActionFamily::Steal;
            descriptor.location_kind = LocationKind::Player;
            descriptor.target_player_slot = victim;
            descriptor.mode = ActionMode::Steal as u8;
        }
        Action::DiscardResource { resource, .. } => {
            descriptor.family = ActionFamily::Discard;
            descriptor.give_resources = one_resource(resource as usize, 1);
            descriptor.mode = ActionMode::Discard as u8;
        }
        Action::PlayMonopoly { resource, .. } => {
            descriptor.family = ActionFamily::Monopoly;
            descriptor.receive_resources = one_resource(resource as usize, 1);
            descriptor.development_type = DEV_MONOPOLY as i8;
            descriptor.mode = ActionMode::Monopoly as u8;
        }
        Action::PlayYearOfPlenty { r1, r2, .. } => {
            descriptor.family = ActionFamily::YearOfPlenty;
            descriptor.receive_resources[r1 as usize] += 1;
            descriptor.receive_resources[r2 as usize] += 1;
            descriptor.development_type = DEV_YEAR_OF_PLENTY as i8;
            descriptor.mode = ActionMode::YearOfPlenty as u8;
        }
        Action::TradeWithBank { give, recv, .. } => {
            descriptor.family = ActionFamily::BankTrade;
            descriptor.give_resources = one_resource(give as usize, 1);
            descriptor.receive_resources = one_resource(recv as usize, 1);
            descriptor.mode = ActionMode::BankTrade as u8;
        }
        Action::ProposeTrade {
            give,
            give_amount,
            recv,
            ..
        } => {
            descriptor.family = ActionFamily::ProposeTrade;
            descriptor.give_resources = one_resource(give as usize, give_amount);
            descriptor.receive_resources = one_resource(recv as usize, 1);
            descriptor.mode = if give_amount == 1 {
                ActionMode::ProposeOne as u8
            } else {
                ActionMode::ProposeTwo as u8
            };
        }
        Action::RespondTrade { accept, .. } => {
            descriptor.family = ActionFamily::RespondTrade;
            descriptor.mode = if accept {
                ActionMode::RespondAccept as u8
            } else {
                ActionMode::RespondReject as u8
            };
        }
        Action::ConfirmTrade { partner, .. } if partner < 0 => {
            descriptor.family = ActionFamily::ConfirmCancel;
            descriptor.mode = ActionMode::ConfirmCancel as u8;
        }
        Action::ConfirmTrade { partner, .. } => {
            descriptor.family = ActionFamily::ConfirmTrade;
            descriptor.location_kind = LocationKind::Player;
            descriptor.target_player_slot = partner;
            descriptor.mode = ActionMode::ConfirmTrade as u8;
        }
        Action::RollDice { .. } => {
            descriptor.family = ActionFamily::Roll;
            descriptor.mode = ActionMode::Roll as u8;
        }
        Action::BuyDevCard { .. } => {
            descriptor.family = ActionFamily::BuyDev;
            descriptor.mode = ActionMode::BuyDev as u8;
        }
        Action::PlayKnight { .. } => {
            descriptor.family = ActionFamily::Knight;
            descriptor.development_type = DEV_KNIGHT as i8;
            descriptor.mode = ActionMode::Knight as u8;
        }
        Action::PlayRoadBuilding { .. } => {
            descriptor.family = ActionFamily::RoadBuilding;
            descriptor.development_type = DEV_ROAD_BUILDING as i8;
            descriptor.mode = ActionMode::RoadBuilding as u8;
        }
        Action::EndTurn { .. } => {}
    }
    descriptor
}

pub fn action_descriptors() -> &'static [ActionDescriptor; NUM_ACTIONS] {
    static DESCRIPTORS: OnceLock<[ActionDescriptor; NUM_ACTIONS]> = OnceLock::new();
    DESCRIPTORS.get_or_init(|| {
        let game = CatanGame::new(4, 0);
        std::array::from_fn(|action_id| describe_action(action_id, decode_action(&game, action_id)))
    })
}

fn fill_sorted<const N: usize>(values: impl IntoIterator<Item = u8>) -> [i8; N] {
    let values: BTreeSet<_> = values.into_iter().collect();
    assert!(values.len() <= N);
    let mut result = [-1; N];
    for (slot, value) in result.iter_mut().zip(values) {
        *slot = value as i8;
    }
    result
}

pub fn topology_contract() -> &'static SettleGraphTopology {
    static CONTRACT: OnceLock<SettleGraphTopology> = OnceLock::new();
    CONTRACT.get_or_init(|| {
        let topology = topology();
        let edge_by_vertices: BTreeMap<_, _> = topology
            .edge_vertices
            .iter()
            .enumerate()
            .map(|(edge, vertices)| ((vertices[0], vertices[1]), edge as u8))
            .collect();
        let mut tile_edges = [[-1; 6]; NUM_TILES];
        let mut edge_tile_sets: Vec<BTreeSet<u8>> = vec![BTreeSet::new(); NUM_EDGES];
        for (tile, vertices) in topology.tile_vertices.iter().enumerate() {
            let edges = (0..6).map(|corner| {
                let a = vertices[corner];
                let b = vertices[(corner + 1) % 6];
                edge_by_vertices[&(a.min(b), a.max(b))]
            });
            tile_edges[tile] = fill_sorted(edges);
            for edge in tile_edges[tile].iter().filter(|edge| **edge >= 0) {
                edge_tile_sets[*edge as usize].insert(tile as u8);
            }
        }
        let edge_tiles =
            std::array::from_fn(|edge| fill_sorted(edge_tile_sets[edge].iter().copied()));
        let tile_neighbors = std::array::from_fn(|tile| {
            fill_sorted(
                tile_edges[tile]
                    .iter()
                    .filter(|edge| **edge >= 0)
                    .filter_map(|edge| {
                        edge_tiles[*edge as usize]
                            .iter()
                            .copied()
                            .find(|other| *other >= 0 && *other as usize != tile)
                            .map(|other| other as u8)
                    }),
            )
        });
        let tile_static = std::array::from_fn(|tile| {
            [
                topology.tile_centers[tile][0] as f32,
                topology.tile_centers[tile][1] as f32,
            ]
        });
        let vertex_static = std::array::from_fn(|vertex| {
            [
                topology.vertex_coordinates[vertex][0] as f32,
                topology.vertex_coordinates[vertex][1] as f32,
            ]
        });
        let edge_static = std::array::from_fn(|edge| {
            let [a, b] = topology.edge_vertices[edge];
            [
                (topology.vertex_coordinates[a as usize][0]
                    + topology.vertex_coordinates[b as usize][0]) as f32
                    / 2.0,
                (topology.vertex_coordinates[a as usize][1]
                    + topology.vertex_coordinates[b as usize][1]) as f32
                    / 2.0,
            ]
        });
        SettleGraphTopology {
            tile_neighbors,
            tile_vertices: topology.tile_vertices,
            tile_edges,
            vertex_neighbors: topology.vertex_neighbors,
            vertex_tiles: topology.vertex_tiles,
            vertex_edges: topology.vertex_edges,
            edge_vertices: topology.edge_vertices,
            edge_tiles,
            tile_static,
            vertex_static,
            edge_static,
        }
    })
}

fn rotate([x, y]: [i32; 2]) -> [i32; 2] {
    [(x - y) / 2, (3 * x + y) / 2]
}

fn transform(mut coordinate: [i32; 2], rotations: usize, reflected: bool) -> [i32; 2] {
    if reflected {
        coordinate[0] = -coordinate[0];
    }
    for _ in 0..rotations {
        coordinate = rotate(coordinate);
    }
    coordinate
}

fn build_symmetry(rotations: usize, reflected: bool) -> BoardSymmetry {
    let topology = topology();
    let tile_by_coordinate: BTreeMap<_, _> = topology
        .tile_centers
        .iter()
        .enumerate()
        .map(|(tile, coordinate)| (*coordinate, tile as u8))
        .collect();
    let vertex_by_coordinate: BTreeMap<_, _> = topology
        .vertex_coordinates
        .iter()
        .enumerate()
        .map(|(vertex, coordinate)| (*coordinate, vertex as u8))
        .collect();
    let edge_by_vertices: BTreeMap<_, _> = topology
        .edge_vertices
        .iter()
        .enumerate()
        .map(|(edge, vertices)| ((vertices[0], vertices[1]), edge as u8))
        .collect();
    let tiles = std::array::from_fn(|tile| {
        tile_by_coordinate[&transform(topology.tile_centers[tile], rotations, reflected)]
    });
    let vertices = std::array::from_fn(|vertex| {
        vertex_by_coordinate[&transform(topology.vertex_coordinates[vertex], rotations, reflected)]
    });
    let edges = std::array::from_fn(|edge| {
        let [a, b] = topology.edge_vertices[edge];
        let transformed = (vertices[a as usize], vertices[b as usize]);
        edge_by_vertices[&(
            transformed.0.min(transformed.1),
            transformed.0.max(transformed.1),
        )]
    });

    let descriptors = action_descriptors();
    let spatial_action_by_key: BTreeMap<_, _> = descriptors
        .iter()
        .filter(|descriptor| descriptor.primary_index >= 0)
        .map(|descriptor| {
            (
                (
                    descriptor.family as u8,
                    descriptor.location_kind as u8,
                    descriptor.primary_index,
                ),
                descriptor.action_id,
            )
        })
        .collect();
    let actions = std::array::from_fn(|action| {
        let descriptor = descriptors[action];
        if descriptor.primary_index < 0 {
            return action as u16;
        }
        let transformed_primary = match descriptor.location_kind {
            LocationKind::Tile => tiles[descriptor.primary_index as usize] as i16,
            LocationKind::Vertex => vertices[descriptor.primary_index as usize] as i16,
            LocationKind::Edge => edges[descriptor.primary_index as usize] as i16,
            LocationKind::None | LocationKind::Player => unreachable!("non-spatial descriptor"),
        };
        spatial_action_by_key[&(
            descriptor.family as u8,
            descriptor.location_kind as u8,
            transformed_primary,
        )]
    });
    BoardSymmetry {
        tiles,
        vertices,
        edges,
        actions,
    }
}

pub fn board_symmetries() -> &'static [BoardSymmetry; 12] {
    static SYMMETRIES: OnceLock<[BoardSymmetry; 12]> = OnceLock::new();
    SYMMETRIES.get_or_init(|| std::array::from_fn(|index| build_symmetry(index % 6, index >= 6)))
}

fn append_i8<const N: usize>(bytes: &mut Vec<u8>, rows: &[[i8; N]]) {
    bytes.extend(rows.iter().flatten().map(|value| *value as u8));
}

fn append_u8<const N: usize>(bytes: &mut Vec<u8>, rows: &[[u8; N]]) {
    bytes.extend(rows.iter().flatten().copied());
}

fn append_f32(bytes: &mut Vec<u8>, rows: &[[f32; 2]]) {
    for value in rows.iter().flatten() {
        bytes.extend_from_slice(&value.to_le_bytes());
    }
}

/// Serialize fixed-width little-endian fields in this order: codec and
/// observation versions; topology relations and static coordinates in Python
/// contract key order; descriptors in struct field order; symmetry maps.
pub fn settlegraph_contract_bytes() -> Vec<u8> {
    let topology = topology_contract();
    let descriptors = action_descriptors();
    let symmetries = board_symmetries();
    let mut bytes = Vec::with_capacity(32_000);
    bytes.extend_from_slice(&CODEC_VERSION.to_le_bytes());
    bytes.extend_from_slice(&OBS_V2_VERSION.to_le_bytes());
    append_i8(&mut bytes, &topology.tile_neighbors);
    append_u8(&mut bytes, &topology.tile_vertices);
    append_i8(&mut bytes, &topology.tile_edges);
    append_i8(&mut bytes, &topology.vertex_neighbors);
    append_i8(&mut bytes, &topology.vertex_tiles);
    append_i8(&mut bytes, &topology.vertex_edges);
    append_u8(&mut bytes, &topology.edge_vertices);
    append_i8(&mut bytes, &topology.edge_tiles);
    append_f32(&mut bytes, &topology.tile_static);
    append_f32(&mut bytes, &topology.vertex_static);
    append_f32(&mut bytes, &topology.edge_static);
    for descriptor in descriptors {
        bytes.extend_from_slice(&descriptor.action_id.to_le_bytes());
    }
    bytes.extend(descriptors.iter().map(|descriptor| descriptor.family as u8));
    bytes.extend(
        descriptors
            .iter()
            .map(|descriptor| descriptor.location_kind as u8),
    );
    for descriptor in descriptors {
        bytes.extend_from_slice(&descriptor.primary_index.to_le_bytes());
    }
    bytes.extend(
        descriptors
            .iter()
            .map(|descriptor| descriptor.target_player_slot as u8),
    );
    bytes.extend(
        descriptors
            .iter()
            .flat_map(|descriptor| descriptor.give_resources),
    );
    bytes.extend(
        descriptors
            .iter()
            .flat_map(|descriptor| descriptor.receive_resources),
    );
    bytes.extend(
        descriptors
            .iter()
            .map(|descriptor| descriptor.development_type as u8),
    );
    bytes.extend(descriptors.iter().map(|descriptor| descriptor.mode));
    for symmetry in symmetries {
        bytes.extend_from_slice(&symmetry.tiles);
    }
    for symmetry in symmetries {
        bytes.extend_from_slice(&symmetry.vertices);
    }
    for symmetry in symmetries {
        bytes.extend_from_slice(&symmetry.edges);
    }
    for symmetry in symmetries {
        for action in symmetry.actions {
            bytes.extend_from_slice(&action.to_le_bytes());
        }
    }
    bytes
}

pub fn settlegraph_contract_sha256() -> [u8; 32] {
    Sha256::digest(settlegraph_contract_bytes()).into()
}
