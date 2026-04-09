import { createElement as h } from "react";

export const createChallengePage =
  ({ ChallengePageClient: ChallengePageClientImpl = null } = {}) =>
  async function ChallengePage({ params }) {
    const ChallengePageClientResolved =
      ChallengePageClientImpl ??
      (await import("./ChallengePageClient.js")).ChallengePageClient;

    return h(ChallengePageClientResolved, {
      matchID: params?.matchID,
    });
  };

const ChallengePage = createChallengePage();

export default ChallengePage;
