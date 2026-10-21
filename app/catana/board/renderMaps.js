const edgeId = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);

export function buildRenderMaps(tiles) {
  const nodeRenderById = {};
  const edgeRenderById = {};

  for (const tile of tiles ?? []) {
    const nodes = tile?.tile?.nodes ?? {};
    const edges = tile?.tile?.edges ?? {};

    for (const [direction, nodeId] of Object.entries(nodes)) {
      const key = String(nodeId);
      if (!nodeRenderById[key]) {
        nodeRenderById[key] = {
          tile_coordinate: tile.coordinate,
          direction,
          tileId: tile.tile.id
        };
      }
    }

    for (const [direction, pair] of Object.entries(edges)) {
      const [a, b] = pair;
      const id = edgeId(a, b);
      if (!edgeRenderById[id]) {
        edgeRenderById[id] = {
          tile_coordinate: tile.coordinate,
          direction
        };
      }
    }
  }

  return { nodeRenderById, edgeRenderById };
}
