import { getLiveMatch } from "./getLiveMatch.js";
import { leaveMatchForAccount } from "./leaveMatchForAccount.js";
import { withMatchMutationLock } from "./matchMutationLock.js";
import { findMatchmakingMutationSeats } from "./matchmakingMutation.js";
import { recordPublicMatchmakingCancellation } from "./publicMatchmakingCancellationStore.js";

const playersOf = (match) =>
  (Array.isArray(match?.players)
    ? match.players
    : Object.values(match?.players ?? {}))
    .filter(Boolean);

const isOccupiedHumanSeat = (player) =>
  Boolean(player?.name) && player?.data?.participantType === "human";

const findRequestPlayer = ({ match, accountId, requestId, playerID }) =>
  playersOf(match).find(
    (player) =>
      String(player?.id) === String(playerID) &&
      isOccupiedHumanSeat(player) &&
      player?.data?.accountId === accountId &&
      player?.data?.matchmakingRequestId === requestId
  ) ?? null;

const isFilledHumanDuel = (match) => {
  const players = playersOf(match);
  return players.length === 2 && players.every(isOccupiedHumanSeat);
};

export const cancelPublicMatchmakingForAccount = async ({
  account,
  modeId,
  matchmakingRequestId,
  requestedCredentials,
  withMatchMutationLock: withMatchMutationLockImpl = withMatchMutationLock,
  findMatchmakingMutationSeats:
    findMatchmakingMutationSeatsImpl = findMatchmakingMutationSeats,
  getLiveMatch: getLiveMatchImpl = getLiveMatch,
  leaveMatchForAccount: leaveMatchForAccountImpl = leaveMatchForAccount,
  recordPublicMatchmakingCancellation:
    recordPublicMatchmakingCancellationImpl = recordPublicMatchmakingCancellation,
} = {}) =>
  withMatchMutationLockImpl({
    matchID: `public-matchmaking:${modeId ?? "default"}`,
    run: async () => {
      const candidates = await findMatchmakingMutationSeatsImpl({
        accountId: account?.id,
        requestId: matchmakingRequestId,
      });

      for (const candidate of candidates) {
        const outcome = await withMatchMutationLockImpl({
          matchID: candidate.matchID,
          run: async () => {
            let match;
            try {
              match = await getLiveMatchImpl({ matchID: candidate.matchID });
            } catch (error) {
              if (error?.status === 404 || error?.status === 410) return null;
              throw error;
            }

            const player = findRequestPlayer({
              match,
              accountId: account?.id,
              requestId: matchmakingRequestId,
              playerID: candidate.playerID,
            });
            if (!player) return null;

            if (isFilledHumanDuel(match)) {
              return {
                status: "match_found",
                matchID: candidate.matchID,
                playerID: String(candidate.playerID),
                playerCredentials: requestedCredentials,
              };
            }

            await recordPublicMatchmakingCancellationImpl({
              accountId: account?.id,
              modeId,
              requestId: matchmakingRequestId,
            });
            await leaveMatchForAccountImpl({
              account,
              matchID: candidate.matchID,
              playerID: String(candidate.playerID),
              credentials: requestedCredentials,
            });
            return {
              status: "cancelled",
              seats: [
                {
                  matchID: candidate.matchID,
                  playerID: String(candidate.playerID),
                },
              ],
            };
          },
        });

        if (outcome) return outcome;
      }

      await recordPublicMatchmakingCancellationImpl({
        accountId: account?.id,
        modeId,
        requestId: matchmakingRequestId,
      });
      return { status: "cancelled", seats: [] };
    },
  });
