use std::collections::{BTreeMap, BTreeSet};

use catan_core::board::{topology, NUM_EDGES, NUM_PORTS, NUM_TILES, NUM_VERTICES};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WebsiteLandTile {
    pub id: i32,
    pub coordinate: [i32; 3],
    /// NORTH, NORTHEAST, SOUTHEAST, SOUTH, SOUTHWEST, NORTHWEST.
    pub nodes: [i32; 6],
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TopologyMap {
    pub native_to_website_tile: [i32; NUM_TILES],
    pub native_to_website_vertex: [i32; NUM_VERTICES],
    native_to_website_edge: [[i32; 2]; NUM_EDGES],
    website_to_native_tile: BTreeMap<i32, u8>,
    website_to_native_vertex: BTreeMap<i32, u8>,
    website_to_native_edge: BTreeMap<(i32, i32), u8>,
}

fn canonical_edge(a: i32, b: i32) -> (i32, i32) {
    if a < b {
        (a, b)
    } else {
        (b, a)
    }
}

impl TopologyMap {
    pub fn from_land_tiles(tiles: &[WebsiteLandTile]) -> Result<Self, String> {
        if tiles.len() != NUM_TILES {
            return Err(format!(
                "website topology must contain {NUM_TILES} land tiles, received {}",
                tiles.len()
            ));
        }

        let native = topology();
        let mut by_native_center = BTreeMap::new();
        for tile in tiles {
            let [q, r, s] = tile.coordinate;
            if q + r + s != 0 {
                return Err(format!(
                    "website tile {} has invalid cube coordinate {:?}",
                    tile.id, tile.coordinate
                ));
            }
            // Catana's named EAST direction is cube [1,-1,0]. The pinned
            // native board uses half-width x and half-radius y units.
            let native_center = [q - r, 3 * s];
            if by_native_center.insert(native_center, tile).is_some() {
                return Err(format!(
                    "website topology repeats native tile center {native_center:?}"
                ));
            }
        }

        let mut native_to_website_tile = [-1; NUM_TILES];
        let mut native_to_website_vertex = [-1; NUM_VERTICES];
        let mut website_to_native_tile = BTreeMap::new();

        for (native_tile, mapped_website_tile) in native_to_website_tile.iter_mut().enumerate() {
            let center = native.tile_centers[native_tile];
            let website_tile = by_native_center.get(&center).ok_or_else(|| {
                format!("website topology is missing native tile center {center:?}")
            })?;
            if website_to_native_tile
                .insert(website_tile.id, native_tile as u8)
                .is_some()
            {
                return Err(format!(
                    "website topology repeats tile id {}",
                    website_tile.id
                ));
            }
            *mapped_website_tile = website_tile.id;

            for (corner, website_vertex) in website_tile.nodes.iter().copied().enumerate() {
                let native_vertex = native.tile_vertices[native_tile][corner] as usize;
                let existing = native_to_website_vertex[native_vertex];
                if existing >= 0 && existing != website_vertex {
                    return Err(format!(
                        "website vertex incidence mismatch at native vertex {native_vertex}: {existing} != {website_vertex}"
                    ));
                }
                native_to_website_vertex[native_vertex] = website_vertex;
            }
        }

        if native_to_website_vertex.iter().any(|vertex| *vertex < 0) {
            return Err("website topology did not map every native vertex".to_owned());
        }

        let mut website_to_native_vertex = BTreeMap::new();
        for (native_vertex, website_vertex) in native_to_website_vertex.iter().copied().enumerate()
        {
            if website_to_native_vertex
                .insert(website_vertex, native_vertex as u8)
                .is_some()
            {
                return Err(format!(
                    "website vertex {website_vertex} maps to more than one native vertex"
                ));
            }
        }
        if website_to_native_vertex.len() != NUM_VERTICES {
            return Err(format!(
                "website topology must contain {NUM_VERTICES} distinct land vertices"
            ));
        }

        let mut native_to_website_edge = [[-1; 2]; NUM_EDGES];
        let mut website_to_native_edge = BTreeMap::new();
        for (native_edge, [native_a, native_b]) in native.edge_vertices.iter().copied().enumerate()
        {
            let website_edge = [
                native_to_website_vertex[native_a as usize],
                native_to_website_vertex[native_b as usize],
            ];
            let key = canonical_edge(website_edge[0], website_edge[1]);
            if website_to_native_edge
                .insert(key, native_edge as u8)
                .is_some()
            {
                return Err(format!(
                    "website edge {},{} maps to more than one native edge",
                    key.0, key.1
                ));
            }
            native_to_website_edge[native_edge] = website_edge;
        }

        let mut website_incident_edges = BTreeSet::new();
        for tile in tiles {
            for corner in 0..6 {
                website_incident_edges.insert(canonical_edge(
                    tile.nodes[corner],
                    tile.nodes[(corner + 1) % 6],
                ));
            }
        }
        let mapped_edges: BTreeSet<_> = website_to_native_edge.keys().copied().collect();
        if website_incident_edges != mapped_edges {
            return Err("website edge incidence does not match the native board".to_owned());
        }

        Ok(Self {
            native_to_website_tile,
            native_to_website_vertex,
            native_to_website_edge,
            website_to_native_tile,
            website_to_native_vertex,
            website_to_native_edge,
        })
    }

    pub fn website_tile_to_native(&self, website_tile: i32) -> Option<u8> {
        self.website_to_native_tile.get(&website_tile).copied()
    }

    pub fn website_vertex_to_native(&self, website_vertex: i32) -> Option<u8> {
        self.website_to_native_vertex.get(&website_vertex).copied()
    }

    pub fn native_edge_website_vertices(&self, native_edge: usize) -> [i32; 2] {
        self.native_to_website_edge[native_edge]
    }

    pub fn website_edge_to_native(&self, website_a: i32, website_b: i32) -> Option<u8> {
        self.website_to_native_edge
            .get(&canonical_edge(website_a, website_b))
            .copied()
    }

    pub fn native_port_website_vertices(&self) -> [[i32; 2]; NUM_PORTS] {
        let native = topology();
        std::array::from_fn(|port| {
            let [a, b] = native.port_vertices[port];
            [
                self.native_to_website_vertex[a as usize],
                self.native_to_website_vertex[b as usize],
            ]
        })
    }

    pub fn validate_native_port_edges(&self, website_ports: &[[i32; 2]]) -> Result<(), String> {
        let expected: BTreeSet<_> = self
            .native_port_website_vertices()
            .into_iter()
            .map(|[a, b]| canonical_edge(a, b))
            .collect();
        let received: BTreeSet<_> = website_ports
            .iter()
            .map(|[a, b]| canonical_edge(*a, *b))
            .collect();

        if website_ports.len() != NUM_PORTS || received != expected {
            return Err(format!(
                "website port-edge contract mismatch: expected {expected:?}, received {received:?}"
            ));
        }
        Ok(())
    }
}
