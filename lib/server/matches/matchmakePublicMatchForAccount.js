import { randomInt } from "node:crypto";

import {
  finalizeAlertsAfterHumanJoin,
  reserveAlertsBeforeHumanJoin,
  restoreAlertsAfterFailedHumanJoin,
} from "../matchAlerts/humanMatchAlertPause.js";
import { createMatchForAccount } from "./createMatchForAccount.js";
import { getLiveMatch } from "./getLiveMatch.js";
import { findHumanSeatForAccount } from "./humanSeatOwnership.js";
import { joinMatchForAccount } from "./joinMatchForAccount.js";
import { listPublicOpenMatches } from "./listPublicOpenMatches.js";
import { withMatchMutationLock } from "./matchMutationLock.js";
import { findMatchmakingMutationSeats } from "./matchmakingMutation.js";
import { isPublicMatchmakingRequestCancelled } from "./publicMatchmakingCancellationStore.js";

const defaultPickCreatorSeatId = (numPlayers) =>
  String(randomInt(numPlayers));

const playersOf = (match) =>
  (Array.isArray(match?.players)
    ? match.players
    : Object.values(match?.players ?? {}))
    .filter(Boolean)
    .sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));

const isOccupied = (player) =>
  Boolean(player?.name);

const findRequestOwnedSeat = async ({
  accountId,
  requestId,
  requestedCredentials,
  numPlayers,
  findMatchmakingMutationSeats: findSeats,
  getLiveMatch: loadMatch,
}) => {
  if (!accountId || !requestId || !requestedCredentials) return null;
  const seats = await findSeats({ accountId, requestId });

  for (const seat of seats) {
    const match = await loadMatch({ matchID: seat.matchID });
    const players = playersOf(match);
    const player = players.find(
      (candidate) => String(candidate?.id) === String(seat.playerID)
    );
    if (
      !isOccupied(player) ||
      player?.data?.participantType !== "human" ||
      player?.data?.accountId !== accountId ||
      player?.data?.matchmakingRequestId !== requestId
    ) {
      continue;
    }

    return {
      matchID: seat.matchID,
      playerID: String(seat.playerID),
      playerCredentials: requestedCredentials,
      createdNewPublicDuel:
        players.length !== numPlayers || players.some((candidate) => !isOccupied(candidate)),
    };
  }

  return null;
};

const findJoinableMatch = ({ matches, accountId, numPlayers }) =>
  matches.find((match) => {
    const players = playersOf(match);
    return (
      players.length === numPlayers &&
      players.some(isOccupied) &&
      players.some((player) => !isOccupied(player)) &&
      !findHumanSeatForAccount({ match, accountId })
    );
  });

export const matchmakePublicMatchForAccount = async ({
  account,
  modeId,
  numPlayers = 2,
  setupData,
  matchmakingRequestId,
  requestedCredentials,
  withMatchMutationLock: withMatchMutationLockImpl = withMatchMutationLock,
  findMatchmakingMutationSeats:
    findMatchmakingMutationSeatsImpl = findMatchmakingMutationSeats,
  isPublicMatchmakingRequestCancelled:
    isPublicMatchmakingRequestCancelledImpl = isPublicMatchmakingRequestCancelled,
  listPublicOpenMatches: listPublicOpenMatchesImpl = listPublicOpenMatches,
  createMatchForAccount: createMatchForAccountImpl = createMatchForAccount,
  pickCreatorSeatId: pickCreatorSeatIdImpl = defaultPickCreatorSeatId,
  getLiveMatch: getLiveMatchImpl = getLiveMatch,
  joinMatchForAccount: joinMatchForAccountImpl = joinMatchForAccount,
  reserveAlertsBeforeHumanJoin:
    reserveAlertsBeforeHumanJoinImpl = reserveAlertsBeforeHumanJoin,
  finalizeAlertsAfterHumanJoin:
    finalizeAlertsAfterHumanJoinImpl = finalizeAlertsAfterHumanJoin,
  restoreAlertsAfterFailedHumanJoin:
    restoreAlertsAfterFailedHumanJoinImpl = restoreAlertsAfterFailedHumanJoin,
  logger = console,
} = {}) =>
  withMatchMutationLockImpl({
    matchID: `public-matchmaking:${modeId ?? "default"}`,
    run: async () => {
      const requestWasCancelled = await isPublicMatchmakingRequestCancelledImpl({
        accountId: account?.id,
        modeId,
        requestId: matchmakingRequestId,
      });
      if (requestWasCancelled) {
        return { status: "cancelled", seats: [] };
      }

      const existing = await findRequestOwnedSeat({
        accountId: account?.id,
        requestId: matchmakingRequestId,
        requestedCredentials,
        numPlayers,
        findMatchmakingMutationSeats: findMatchmakingMutationSeatsImpl,
        getLiveMatch: getLiveMatchImpl,
      });
      if (existing) return existing;

      const matches = await listPublicOpenMatchesImpl({ modeId });
      const joinable = findJoinableMatch({
        matches,
        accountId: account?.id,
        numPlayers,
      });

      if (!joinable) {
        const created = await createMatchForAccountImpl({
          account,
          numPlayers,
          creatorSeatId: pickCreatorSeatIdImpl(numPlayers),
          setupData,
          matchmakingRequestId,
          requestedCredentials,
        });
        return { ...created, createdNewPublicDuel: true };
      }

      return withMatchMutationLockImpl({
        matchID: joinable.matchID,
        run: async () => {
          const liveMatch = await getLiveMatchImpl({ matchID: joinable.matchID });
          const openSeat = playersOf(liveMatch).find((player) => !isOccupied(player));
          if (!openSeat) {
            const created = await createMatchForAccountImpl({
              account,
              numPlayers,
              creatorSeatId: pickCreatorSeatIdImpl(numPlayers),
              setupData,
              matchmakingRequestId,
              requestedCredentials,
            });
            return { ...created, createdNewPublicDuel: true };
          }

          const playerID = String(openSeat.id);
          const reservation = await reserveAlertsBeforeHumanJoinImpl({
            liveMatch,
            joiningAccountId: account?.id,
            joiningPlayerId: playerID,
            participantType: "human",
            matchID: joinable.matchID,
          });

          let joined;
          try {
            joined = await joinMatchForAccountImpl({
              account,
              matchID: joinable.matchID,
              playerID,
              matchmakingRequestId,
              requestedCredentials,
            });
          } catch (error) {
            if (reservation) {
              try {
                await restoreAlertsAfterFailedHumanJoinImpl({
                  reservation,
                  joiningAccountId: account?.id,
                  joiningPlayerId: playerID,
                  matchID: joinable.matchID,
                  joinError: error,
                });
              } catch (restoreError) {
                logger.error("Failed to restore match alerts after rejected matchmaking join", {
                  matchID: joinable.matchID,
                  accountId: account?.id,
                  error: restoreError,
                });
              }
            }
            throw error;
          }

          if (reservation) {
            try {
              await finalizeAlertsAfterHumanJoinImpl({ reservation });
            } catch (error) {
              logger.warn("Failed to finalize match alert pause after matchmaking join", {
                matchID: joinable.matchID,
                accountId: account?.id,
                error,
              });
            }
          }

          return {
            ...joined,
            matchID: joinable.matchID,
            playerID,
            createdNewPublicDuel: false,
          };
        },
      });
    },
  });
