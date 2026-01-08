export type NodeId = number;
export type EdgeId = string;

export function edgeId(a: NodeId, b: NodeId): EdgeId {
  return a < b ? `${a},${b}` : `${b},${a}`;
}

export function parseEdgeId(id: EdgeId): [NodeId, NodeId] {
  const [a, b] = id.split(",").map(Number);
  return [a, b];
}
