import { createElement as h } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSessionAccount } from "../../../lib/server/accounts/getSessionAccount.js";
import { getArchivedReplay } from "../../../lib/server/replays/getArchivedReplay.js";
import { buildReplayFrames } from "../../../lib/server/replays/buildReplayFrames.js";
import { readMatchCredentialCookie } from "../../../lib/server/session/matchCredentialCookie.js";

export const resolveLegacyReplayPerspectivePlayerID = async ({
  matchID,
  participants = [],
  accountId = null,
  readSeatCredential,
}) => {
  const accountParticipant = participants.find(
    (participant) =>
      accountId != null &&
      String(participant.accountId) === String(accountId)
  );
  if (accountParticipant?.seatId != null) {
    return String(accountParticipant.seatId);
  }
  for (const participant of participants) {
    const playerID = String(participant.seatId);
    if (await readSeatCredential({ matchID, playerID })) return playerID;
  }
  return null;
};

export const createReplayPage = ({
  getArchivedReplay: getArchivedReplayImpl = getArchivedReplay,
  buildReplayFrames: buildReplayFramesImpl = buildReplayFrames,
  ReplayPageClient: ReplayPageClientImpl = null,
  ReplayStatusPage: ReplayStatusPageImpl = null,
  getSessionAccount: getSessionAccountImpl = getSessionAccount,
  readSeatCredential: readSeatCredentialImpl = readMatchCredentialCookie,
  headers: headersImpl = headers,
  notFoundImpl = notFound,
} = {}) =>
  async function ReplayPage({ params }) {
    const replay = await getArchivedReplayImpl(params?.replayId);

    if (!replay) {
      return notFoundImpl();
    }

    let frames;
    try {
      frames = buildReplayFramesImpl({
        initialState: replay.initialState,
        log: replay.log,
        finalState: replay.finalState,
      });
      if (frames.length === 0) {
        throw new Error("Replay has no valid frames");
      }
    } catch (error) {
      const ReplayStatusPageResolved =
        ReplayStatusPageImpl ??
        (await import("../components/ReplayStatusPage.jsx"))
          .ReplayStatusPage;
      return h(ReplayStatusPageResolved, {
        matchID: replay.match.bgioMatchId ?? replay.match.replayId,
        status: "invalid",
      });
    }
    const ReplayPageClientResolved =
      ReplayPageClientImpl ??
      (await import("./ReplayPageClient.js")).ReplayPageClient;

    let accountId = null;
    try {
      const sessionAccount = await getSessionAccountImpl({
        headers: headersImpl(),
      });
      accountId = sessionAccount?.account?.id ?? null;
    } catch {
      accountId = null;
    }
    const matchID = replay.match.bgioMatchId ?? replay.match.replayId;
    const initialPerspectivePlayerID =
      await resolveLegacyReplayPerspectivePlayerID({
        matchID,
        participants: replay.participants,
        accountId,
        readSeatCredential: readSeatCredentialImpl,
      });

    return h(ReplayPageClientResolved, {
      replay,
      frames,
      initialPerspectivePlayerID,
    });
  };

const ReplayPage = createReplayPage();

export default ReplayPage;
