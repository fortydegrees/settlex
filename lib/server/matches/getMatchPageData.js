import { getArchivedMatchByMatchId } from "./getArchivedMatchByMatchId.js";
import {
  GAME_NAME,
  getGameServerBaseUrl,
} from "./joinMatchForAccount.js";

const readJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const readArchived = async (matchID, getArchivedMatchByMatchIdImpl) => {
  const archivedMatch = await getArchivedMatchByMatchIdImpl(matchID);
  return archivedMatch
    ? { kind: "archived", matchID, archivedMatch }
    : null;
};

export const getMatchPageData = async (
  matchID,
  {
    fetchImpl = fetch,
    baseUrl,
    getArchivedMatchByMatchId: getArchivedMatchByMatchIdImpl = getArchivedMatchByMatchId,
  } = {}
) => {
  if (!matchID) {
    return {
      kind: "missing",
      matchID: matchID ?? null,
    };
  }

  try {
    const response = await fetchImpl(
      `${getGameServerBaseUrl(baseUrl)}/games/${GAME_NAME}/${matchID}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (response?.ok) {
      const liveMatch = (await readJson(response)) ?? null;
      if (!liveMatch?.gameover) return { kind: "live", matchID, liveMatch };
      const archived = await readArchived(
        matchID,
        getArchivedMatchByMatchIdImpl
      );
      return archived ?? { kind: "postgame-preparing", matchID, liveMatch };
    }
  } catch (error) {
    // Fall through to archive lookup when the live server is unavailable.
  }

  const archived = await readArchived(matchID, getArchivedMatchByMatchIdImpl);
  if (archived) return archived;

  return {
    kind: "missing",
    matchID,
  };
};
