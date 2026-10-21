const buildRequest = ({ method, modeId, requestId, requestedCredentials }) => ({
  route: "/api/matches/matchmake",
  init: {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modeId, requestId, requestedCredentials }),
  },
});

export const buildStartPublicMatchmakingRequest = (identity) =>
  buildRequest({ method: "POST", ...identity });

export const buildCancelPublicMatchmakingRequest = (identity) =>
  buildRequest({ method: "DELETE", ...identity });
