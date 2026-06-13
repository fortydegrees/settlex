export const buildDevCardBuyTransfer = (payload) => [
  {
    kind: "dev",
    fromKind: "bank",
    toKind: "player",
    toPlayerId: payload.playerId,
    cueName: "devcard:buy:public",
    startScale: 0.72,
    endScale: 0.86
  }
];

export const buildMaritimeTradeTransfers = (payload) => [
  ...(payload.give ?? []).map((resource) => ({
    kind: "resource",
    resource,
    fromKind: "player",
    toKind: "bank",
    fromPlayerId: payload.playerId,
    hidden: false
  })),
  ...(payload.receive ?? []).map((resource) => ({
    kind: "resource",
    resource,
    fromKind: "bank",
    toKind: "player",
    toPlayerId: payload.playerId,
    hidden: false
  }))
];

export const buildDiscardTransfers = (payload) =>
  (payload.resources ?? []).map((resource) => ({
    kind: "resource",
    resource,
    fromKind: "player",
    toKind: "discard",
    fromPlayerId: payload.playerId,
    hidden: false,
    endScale: 0.72
  }));

export const buildRobberStealTransfers = ({ payload, visibleResource }) => [
  {
    kind: "resource",
    resource: visibleResource ?? "hidden",
    fromKind: "player",
    toKind: "player",
    fromPlayerId: payload.victimId,
    toPlayerId: payload.thiefId,
    hidden: !visibleResource,
    cueName: "resource:travel:start"
  }
];
