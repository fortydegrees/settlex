use catan_core::board::topology;
use settlegraph_v2::topology::{TopologyMap, WebsiteLandTile};

fn standard_website_land_tiles() -> Vec<WebsiteLandTile> {
    [
        (0, [-2, 0, 2], [0, 1, 2, 3, 4, 5]),
        (1, [-2, 1, 1], [6, 7, 0, 5, 8, 9]),
        (2, [-2, 2, 0], [10, 11, 6, 9, 12, 13]),
        (3, [-1, -1, 2], [14, 15, 16, 17, 2, 1]),
        (4, [-1, 0, 1], [18, 19, 14, 1, 0, 7]),
        (5, [-1, 1, 0], [20, 21, 18, 7, 6, 11]),
        (6, [-1, 2, -1], [22, 23, 20, 11, 10, 24]),
        (7, [0, -2, 2], [25, 26, 27, 28, 16, 15]),
        (8, [0, -1, 1], [29, 30, 25, 15, 14, 19]),
        (9, [0, 0, 0], [31, 32, 29, 19, 18, 21]),
        (10, [0, 1, -1], [33, 34, 31, 21, 20, 23]),
        (11, [0, 2, -2], [35, 36, 33, 23, 22, 37]),
        (12, [1, -2, 1], [38, 39, 40, 26, 25, 30]),
        (13, [1, -1, 0], [41, 42, 38, 30, 29, 32]),
        (14, [1, 0, -1], [43, 44, 41, 32, 31, 34]),
        (15, [1, 1, -2], [45, 46, 43, 34, 33, 36]),
        (16, [2, -2, 0], [47, 48, 49, 39, 38, 42]),
        (17, [2, -1, -1], [50, 51, 47, 42, 41, 44]),
        (18, [2, 0, -2], [52, 53, 50, 44, 43, 46]),
    ]
    .into_iter()
    .map(|(id, coordinate, nodes)| WebsiteLandTile {
        id,
        coordinate,
        nodes,
    })
    .collect()
}

#[test]
fn maps_the_live_website_numbering_to_the_pinned_native_orientation() {
    let map = TopologyMap::from_land_tiles(&standard_website_land_tiles()).expect("topology map");

    assert_eq!(
        map.native_to_website_tile,
        [11, 15, 18, 6, 10, 14, 17, 2, 5, 9, 13, 16, 1, 4, 8, 12, 0, 3, 7]
    );
    assert_eq!(
        map.native_to_website_vertex,
        [
            35, 36, 33, 23, 22, 37, 45, 46, 43, 34, 52, 53, 50, 44, 20, 11, 10, 24, 31, 21, 41, 32,
            51, 47, 42, 6, 9, 12, 13, 18, 7, 29, 19, 38, 30, 48, 49, 39, 0, 5, 8, 14, 1, 25, 15,
            40, 26, 2, 3, 4, 16, 17, 27, 28,
        ]
    );
    assert_eq!(
        map.native_port_website_vertices(),
        [
            [35, 36],
            [46, 52],
            [50, 51],
            [48, 49],
            [40, 26],
            [16, 28],
            [2, 3],
            [5, 8],
            [12, 13],
        ]
    );

    for (native, website) in map.native_to_website_tile.iter().enumerate() {
        assert_eq!(map.website_tile_to_native(*website), Some(native as u8));
    }
    for (native, website) in map.native_to_website_vertex.iter().enumerate() {
        assert_eq!(map.website_vertex_to_native(*website), Some(native as u8));
    }

    let native = topology();
    for (edge, [native_a, native_b]) in native.edge_vertices.iter().copied().enumerate() {
        let expected = [
            map.native_to_website_vertex[native_a as usize],
            map.native_to_website_vertex[native_b as usize],
        ];
        assert_eq!(map.native_edge_website_vertices(edge), expected);
        assert_eq!(
            map.website_edge_to_native(expected[0], expected[1]),
            Some(edge as u8)
        );
    }
}

#[test]
fn rejects_a_topology_that_cannot_preserve_shared_vertex_incidence() {
    let mut tiles = standard_website_land_tiles();
    tiles[15].nodes[5] = 999;

    let error = TopologyMap::from_land_tiles(&tiles).expect_err("must reject broken incidence");
    assert!(
        error.contains("vertex incidence"),
        "unexpected error: {error}"
    );
}

#[test]
fn requires_v2_matches_to_use_the_native_contract_port_edges() {
    let map = TopologyMap::from_land_tiles(&standard_website_land_tiles()).expect("topology map");
    let standard_website_ports = [
        [48, 49],
        [50, 51],
        [46, 45],
        [35, 37],
        [24, 10],
        [9, 8],
        [4, 3],
        [16, 17],
        [26, 40],
    ];

    let error = map
        .validate_native_port_edges(&standard_website_ports)
        .expect_err("standard port incidence must be rejected for V2");
    assert!(
        error.contains("port-edge contract"),
        "unexpected error: {error}"
    );

    map.validate_native_port_edges(&map.native_port_website_vertices())
        .expect("projected V2 ports preserve the native contract");
}
